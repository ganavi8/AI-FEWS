import express, { type Express, type RequestHandler } from 'express';
import helmet from 'helmet';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { API_BODY_LIMIT, hasDatabaseConfiguration, IS_PRODUCTION, MODERATION_TOKEN, OPERATOR_LEGAL_NAME, OPERATOR_SERVICE_ADDRESS, SUPPORT_CONTACT } from './config.js';
import { ApiError, errorHandler, notFoundHandler, requestContext } from './errors.js';
import { MySqlRepository } from './db/repository.js';
import { getAirQuality, getWeather } from './providers/open-meteo.js';
import { reverseGeocode } from './providers/nominatim.js';
import type { ProviderAdapters, Repository } from './services/types.js';
import { apiRouter, type ReadinessState } from './routes/index.js';
import type { RouteContext } from './routes/context.js';

export interface AppOptions {
  repository?: Repository;
  providers?: ProviderAdapters;
  getReadiness?: () => ReadinessState;
  moderationToken?: string;
  supportContact?: string;
  operatorLegalName?: string;
  operatorServiceAddress?: string;
  production?: boolean;
}

function unavailableRepository(): Repository {
  return new Proxy(Object.create(null) as Repository, {
    get: (_target, property: string | symbol) => {
      if (typeof property !== 'string') return undefined;
      return async () => {
        throw new ApiError(503, 'DATABASE_NOT_CONFIGURED', 'Persistent services are unavailable until the project database is ready.');
      };
    },
  });
}

function isAllowedNativeOrigin(origin: string): boolean {
  if (origin === 'capacitor://localhost') return true;
  try {
    const parsed = new URL(origin);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && parsed.hostname === 'localhost';
  } catch {
    return false;
  }
}

const nativeCors: RequestHandler = (request, response, next) => {
  const origin = request.get('origin');
  if (!origin) {
    if (request.method === 'OPTIONS') return response.sendStatus(204);
    return next();
  }
  if (!isAllowedNativeOrigin(origin)) {
    if (request.method === 'OPTIONS') return response.sendStatus(403);
    return next();
  }
  response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');
  response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-AIFEWS-Owner');
  response.setHeader('Access-Control-Expose-Headers', 'Retry-After, RateLimit-Limit, RateLimit-Remaining');
  if (request.method === 'OPTIONS') return response.sendStatus(204);
  return next();
};

export async function createApp(options: AppOptions = {}): Promise<Express> {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: false,
    frameguard: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));
  app.use(nativeCors);
  app.use('/api', requestContext);
  app.use(express.json({ limit: API_BODY_LIMIT, strict: true }));
  app.use(express.urlencoded({ extended: false, limit: API_BODY_LIMIT }));

  const databaseConfigured = hasDatabaseConfiguration();
  const repository = options.repository ?? (databaseConfigured ? new MySqlRepository() : unavailableRepository());
  const providers: ProviderAdapters = options.providers ?? {
    weather: getWeather,
    airQuality: getAirQuality,
    reverseGeocode,
  };
  const readiness: ReadinessState = {
    databaseConfigured: options.repository ? true : databaseConfigured,
    databaseReady: false,
    migrationsReady: false,
  };
  const getReadiness = options.getReadiness ?? (() => readiness);
  const context: RouteContext = {
    repository, providers,
    moderationToken: options.moderationToken ?? MODERATION_TOKEN,
    supportContact: options.supportContact ?? SUPPORT_CONTACT,
    operatorLegalName: options.operatorLegalName ?? OPERATOR_LEGAL_NAME,
    operatorServiceAddress: options.operatorServiceAddress ?? OPERATOR_SERVICE_ADDRESS,
  };

  app.use('/api', apiRouter(context, getReadiness));

  const production = options.production ?? IS_PRODUCTION;
  if (production) {
    const clientRoot = resolve(process.cwd(), 'dist/client');
    app.use(express.static(clientRoot, {
      index: false,
      etag: true,
      setHeaders(response, filePath) {
        const normalized = filePath.split('\\').join('/');
        if (normalized.includes('/assets/')) {
          response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (normalized.endsWith('/sw.js') || normalized.endsWith('/manus-routes.json') || normalized.endsWith('/index.html')) {
          response.setHeader('Cache-Control', 'no-cache');
        } else {
          response.setHeader('Cache-Control', 'public, max-age=3600');
        }
      },
    }));
    app.use((request, response, next) => {
      if (request.method !== 'GET' || !request.accepts('html') || request.path.startsWith('/api/')) return next();
      if (/\.[a-z0-9]{1,8}$/i.test(request.path) && request.path !== '/index.html') return next();
      response.setHeader('Cache-Control', 'no-cache');
      response.sendFile(resolve(clientRoot, 'index.html'), (error) => { if (error) next(error); });
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      configFile: resolve(process.cwd(), 'vite.config.ts'),
      appType: 'custom',
      server: { middlewareMode: true, allowedHosts: true },
    });
    app.locals.vite = vite;
    app.use(vite.middlewares);
    app.use(async (request, response, next) => {
      if (request.method !== 'GET' || !request.accepts('html') || request.path.startsWith('/api/')) return next();
      if (/\.[a-z0-9]{1,8}$/i.test(request.path) && request.path !== '/index.html') return next();
      try {
        const template = await readFile(resolve(process.cwd(), 'index.html'), 'utf8');
        const html = await vite.transformIndexHtml(request.originalUrl, template);
        response.status(200).setHeader('Cache-Control', 'no-cache').type('html').send(html);
      } catch (error) {
        if (error instanceof Error) vite.ssrFixStacktrace(error);
        next(error);
      }
    });
  }

  app.use('/api', notFoundHandler);
  app.use((request, response, next) => {
    if (request.path.startsWith('/api/')) return next();
    if (request.method === 'GET' && request.accepts('html')) {
      response.status(404).type('text').send('Page not found.');
      return;
    }
    next();
  });
  app.use(errorHandler);
  return app;
}
