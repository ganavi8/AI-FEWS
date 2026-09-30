import { randomUUID } from 'node:crypto';
import type { ErrorRequestHandler, RequestHandler } from 'express';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const requestContext: RequestHandler = (_request, response, next) => {
  response.locals.requestId = randomUUID();
  response.setHeader('Cache-Control', 'no-store');
  next();
};

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({
    error: { code: 'NOT_FOUND', message: 'The requested resource was not found.', requestId: response.locals.requestId },
  });
};

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  const known = error instanceof ApiError ? error : undefined;
  const rawCode = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  const rawType = typeof error === 'object' && error !== null && 'type' in error ? String(error.type) : '';
  const databaseCodes = new Set(['DATABASE_NOT_CONFIGURED', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ER_ACCESS_DENIED_ERROR', 'PROTOCOL_CONNECTION_LOST', 'POOL_CLOSED']);
  const bodyTooLarge = rawCode === 'entity.too.large' || rawType === 'entity.too.large';
  const malformedBody = rawCode === 'entity.parse.failed' || rawType === 'entity.parse.failed';
  const unavailable = databaseCodes.has(rawCode);
  const status = known?.status ?? (bodyTooLarge ? 413 : malformedBody ? 400 : unavailable ? 503 : 500);
  const code = known?.code ?? (bodyTooLarge ? 'REQUEST_TOO_LARGE' : malformedBody ? 'INVALID_JSON' : unavailable ? 'DATABASE_UNAVAILABLE' : rawCode || 'INTERNAL_ERROR');
  if (status >= 500) console.error(JSON.stringify({ event: 'api_error', requestId: response.locals.requestId, code }));
  response.status(status).json({
    error: {
      code,
      message: known?.message ?? (bodyTooLarge
        ? 'The request body exceeds the permitted size.'
        : malformedBody
          ? 'The request body is not valid JSON.'
          : status === 503
            ? 'Persistent services are temporarily unavailable.'
            : 'The request could not be completed.'),
      requestId: response.locals.requestId,
    },
  });
};
