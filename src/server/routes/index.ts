import { Router } from 'express';
import type { RequestHandler } from 'express';
import { notFoundHandler } from '../errors.js';
import { rateLimit } from '../middleware/rate-limit.js';
import type { RouteContext } from './context.js';
import { accountRouter } from './account.js';
import { communityRouter } from './community.js';
import { dataRouter } from './data.js';
import { environmentRouter } from './environment.js';

export interface ReadinessState {
  databaseConfigured: boolean;
  databaseReady: boolean;
  migrationsReady: boolean;
}

export function apiRouter(context: RouteContext, getReadiness: () => ReadinessState): Router {
  const router = Router();
  router.get('/health', (_request, response) => {
    const state = getReadiness();
    const ready = state.databaseConfigured && state.databaseReady && state.migrationsReady;
    response.status(ready ? 200 : 503).json({
      service: 'AI·FEWS API', status: ready ? 'READY' : 'NOT_READY',
      checkedAt: new Date().toISOString(),
      database: { configured: state.databaseConfigured, ready: state.databaseReady },
      migrations: { ready: state.migrationsReady },
    });
  });

  const generalLimit: RequestHandler = rateLimit(context.repository, {
    key: 'api-general', windowMs: 5 * 60_000, limit: 300,
  });
  router.use(generalLimit);
  router.use(environmentRouter(context));
  router.use(dataRouter(context));
  router.use(accountRouter(context));
  router.use(communityRouter(context));
  router.use(notFoundHandler);
  return router;
}
