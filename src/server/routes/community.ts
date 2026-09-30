import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { ReportInputSchema, type ReportInput } from '../../shared/contracts.js';
import { ApiError } from '../errors.js';
import { rateLimit } from '../middleware/rate-limit.js';
import type { RouteContext } from './context.js';
import { parseCoordinates } from './common.js';

const BatchSchema = z.object({ reports: z.array(z.unknown()).min(1).max(25) }).strict();
const RadiusSchema = z.coerce.number().finite().min(1).max(100).default(10);
const ModerationSchema = z.object({ status: z.enum(['VERIFIED', 'REJECTED', 'EXPIRED']) }).strict();

function tokenMatches(provided: string | undefined, expected: string): boolean {
  if (!provided || !expected) return false;
  const supplied = Buffer.from(provided);
  const actual = Buffer.from(expected);
  return supplied.length === actual.length && timingSafeEqual(supplied, actual);
}

export function communityRouter(context: RouteContext): Router {
  const router = Router();
  const submitLimit = rateLimit(context.repository, { key: 'community-report-write', windowMs: 60 * 60_000, limit: 10 });
  const syncLimit = rateLimit(context.repository, { key: 'offline-sync', windowMs: 60 * 60_000, limit: 30 });
  const moderationLimit = rateLimit(context.repository, { key: 'moderation-write', windowMs: 60 * 60_000, limit: 120 });

  router.get('/community-reports', async (request, response) => {
    const coordinates = parseCoordinates(request);
    const radius = RadiusSchema.safeParse(request.query.radiusKm ?? '10');
    if (!radius.success) throw new ApiError(400, 'INVALID_RADIUS', 'Radius must be between 1 and 100 kilometres.');
    response.json({
      status: 'LIVE', reports: await context.repository.listCommunityReports(coordinates.latitude, coordinates.longitude, radius.data),
      source: 'Verified community-generated reports only',
      disclaimer: 'Community reports are not official observations or emergency alerts. Unverified submissions are not shown on the public map.',
    });
  });

  router.post('/community-reports', submitLimit, async (request, response) => {
    const parsed = ReportInputSchema.safeParse(request.body);
    if (!parsed.success) throw new ApiError(400, 'INVALID_COMMUNITY_REPORT', 'A valid report requires clientId, category, description of 3 to 500 characters, valid coordinates, createdAt and sync status.');
    const report = await context.repository.createCommunityReport(parsed.data);
    response.status(201).json({ report, message: 'Report received and queued for moderation; it is not yet public.' });
  });

  router.post('/sync', syncLimit, async (request, response) => {
    const batch = BatchSchema.safeParse(request.body);
    if (!batch.success) throw new ApiError(400, 'INVALID_SYNC_BATCH', 'Provide between 1 and 25 queued reports.');
    const results: Array<{ clientId: string | null; syncStatus: 'SYNCED' | 'FAILED'; report?: Awaited<ReturnType<typeof context.repository.createCommunityReport>>; message?: string }> = [];
    for (const raw of batch.data.reports) {
      const parsed = ReportInputSchema.safeParse(raw);
      const clientId = raw && typeof raw === 'object' && 'clientId' in raw && typeof raw.clientId === 'string' ? raw.clientId : null;
      if (!parsed.success) {
        results.push({ clientId, syncStatus: 'FAILED', message: 'This queued report is invalid and was not stored.' });
        continue;
      }
      try {
        const report = await context.repository.createCommunityReport(parsed.data as ReportInput);
        results.push({ clientId: parsed.data.clientId, syncStatus: 'SYNCED', report });
      } catch {
        results.push({ clientId: parsed.data.clientId, syncStatus: 'FAILED', message: 'The server could not store this report. It can be retried later.' });
      }
    }
    response.json({ results, synced: results.filter((item) => item.syncStatus === 'SYNCED').length, failed: results.filter((item) => item.syncStatus === 'FAILED').length });
  });

  router.patch('/community-reports/:id/moderation', moderationLimit, async (request, response) => {
    if (!context.moderationToken) {
      throw new ApiError(503, 'MODERATION_NOT_CONFIGURED', 'Privileged moderation is disabled until the server owner configures MODERATION_TOKEN.');
    }
    if (!tokenMatches(request.get('x-moderation-token'), context.moderationToken)) {
      throw new ApiError(401, 'MODERATION_UNAUTHORIZED', 'The moderation credential is missing or invalid.');
    }
    const id = z.string().uuid().safeParse(request.params.id);
    const body = ModerationSchema.safeParse(request.body);
    if (!id.success || !body.success) throw new ApiError(400, 'INVALID_MODERATION_REQUEST', 'Provide a valid report ID and moderation status.');
    const report = await context.repository.updateModeration(id.data, body.data.status);
    if (!report) throw new ApiError(404, 'REPORT_NOT_FOUND', 'The report was not found.');
    response.json({ report });
  });
  return router;
}
