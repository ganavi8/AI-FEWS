import { createHmac, randomBytes } from 'node:crypto';
import type { Request, RequestHandler } from 'express';
import { DATABASE_DSN } from '../config.js';
import type { Repository } from '../services/types.js';

const localSecret = randomBytes(32);
const localBuckets = new Map<string, { windowId: number; hits: number }>();

type Rule = { key: string; windowMs: number; limit: number };

function clientKey(request: Request): string {
  const rawIp = request.ip || request.socket.remoteAddress || 'unknown';
  const secret = DATABASE_DSN || localSecret;
  return createHmac('sha256', secret).update(rawIp).digest('hex');
}

function localConsume(key: string, rule: Rule): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
  const now = Date.now();
  const windowId = Math.floor(now / rule.windowMs);
  const existing = localBuckets.get(key);
  const hits = existing?.windowId === windowId ? existing.hits + 1 : 1;
  localBuckets.set(key, { windowId, hits });
  if (localBuckets.size > 5000) {
    for (const [bucketKey, bucket] of localBuckets) if (bucket.windowId < windowId - 2) localBuckets.delete(bucketKey);
  }
  const retryAfterSeconds = Math.max(1, Math.ceil(((windowId + 1) * rule.windowMs - now) / 1000));
  return { allowed: hits <= rule.limit, retryAfterSeconds, remaining: Math.max(0, rule.limit - hits) };
}

export function rateLimit(repository: Repository, rule: Rule): RequestHandler {
  return (request, response, next) => {
    void (async () => {
      const key = clientKey(request);
      let decision;
      try {
        decision = await repository.consumeRateLimit(key, rule.key, rule.windowMs, rule.limit);
      } catch {
        decision = localConsume(`${key}:${rule.key}`, rule);
      }
      response.setHeader('RateLimit-Limit', String(rule.limit));
      response.setHeader('RateLimit-Remaining', String(decision.remaining));
      if (!decision.allowed) {
        response.setHeader('Retry-After', String(decision.retryAfterSeconds));
        response.status(429).json({
          error: { code: 'RATE_LIMITED', message: 'Too many requests. Please retry after the indicated interval.', requestId: response.locals.requestId },
        });
        return;
      }
      next();
    })().catch(next);
  };
}

export function hashOwnerKey(raw: string): string {
  const secret = DATABASE_DSN || localSecret;
  return createHmac('sha256', secret).update(raw).digest('hex');
}
