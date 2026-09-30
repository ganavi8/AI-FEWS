import { Router } from 'express';
import { z } from 'zod';
import { NotificationPreferencesSchema, SavedLocationInputSchema } from '../../shared/contracts.js';
import { ApiError } from '../errors.js';
import { rateLimit } from '../middleware/rate-limit.js';
import type { RouteContext } from './context.js';
import { optionalQueryString, requireOwnerHash } from './common.js';

const RenameSchema = z.object({ name: z.string().trim().min(1).max(80) }).strict();
const LimitSchema = z.coerce.number().int().min(1).max(500).default(200);

export function accountRouter(context: RouteContext): Router {
  const router = Router();
  const writeLimit = rateLimit(context.repository, { key: 'saved-location-write', windowMs: 60 * 60_000, limit: 30 });

  router.get('/saved-locations', async (request, response) => {
    response.json({ locations: await context.repository.listSavedLocations(requireOwnerHash(request)) });
  });

  router.post('/saved-locations', writeLimit, async (request, response) => {
    const parsed = SavedLocationInputSchema.safeParse(request.body);
    if (!parsed.success) throw new ApiError(400, 'INVALID_SAVED_LOCATION', 'Provide a location name, latitude from -90 to 90 and longitude from -180 to 180.');
    const saved = await context.repository.addSavedLocation(requireOwnerHash(request), parsed.data);
    response.status(201).json({ location: saved });
  });

  router.patch('/saved-locations/:id', writeLimit, async (request, response) => {
    const parsedId = z.string().uuid().safeParse(request.params.id);
    const body = RenameSchema.safeParse(request.body);
    if (!parsedId.success || !body.success) throw new ApiError(400, 'INVALID_SAVED_LOCATION', 'Provide a valid saved-location ID and name of 1 to 80 characters.');
    const saved = await context.repository.renameSavedLocation(requireOwnerHash(request), parsedId.data, body.data.name);
    if (!saved) throw new ApiError(404, 'SAVED_LOCATION_NOT_FOUND', 'This saved location was not found for this installation.');
    response.json({ location: saved });
  });

  router.delete('/saved-locations/:id', writeLimit, async (request, response) => {
    const parsedId = z.string().uuid().safeParse(request.params.id);
    if (!parsedId.success) throw new ApiError(400, 'INVALID_SAVED_LOCATION_ID', 'Provide a valid saved-location ID.');
    const deleted = await context.repository.deleteSavedLocation(requireOwnerHash(request), parsedId.data);
    if (!deleted) throw new ApiError(404, 'SAVED_LOCATION_NOT_FOUND', 'This saved location was not found for this installation.');
    response.status(200).json({ id: parsedId.data, deleted: true });
  });

  router.get('/trends', async (request, response) => {
    const ownerHash = requireOwnerHash(request);
    const locationId = optionalQueryString(request, 'locationId');
    if (!locationId || !z.string().uuid().safeParse(locationId).success) {
      throw new ApiError(400, 'LOCATION_ID_REQUIRED', 'Choose a saved location to view its actual stored observations.');
    }
    const saved = (await context.repository.listSavedLocations(ownerHash)).find((item) => item.id === locationId);
    if (!saved) throw new ApiError(404, 'SAVED_LOCATION_NOT_FOUND', 'This saved location was not found for this installation.');
    const limit = LimitSchema.safeParse(request.query.limit ?? '200');
    if (!limit.success) throw new ApiError(400, 'INVALID_LIMIT', 'Trend limit must be between 1 and 500.');
    response.json({
      locationId, points: await context.repository.listTrends(ownerHash, locationId, limit.data),
      retentionDays: 90, source: 'Persisted observations from explicit assessments of this saved location.',
      note: 'No simulated or unsaved location history is included.',
    });
  });

  router.get('/alerts', async (request, response) => {
    const ownerHash = requireOwnerHash(request);
    response.json({ alerts: await context.repository.listAlerts(ownerHash, 100) });
  });

  router.get('/notifications', async (request, response) => {
    const ownerHash = requireOwnerHash(request);
    const [alerts, preferences] = await Promise.all([
      context.repository.listAlerts(ownerHash, 100), context.repository.getNotificationPreferences(ownerHash),
    ]);
    response.json({ alerts, preferences, delivery: 'IN_APP_ON_REFRESH', pushConfigured: false });
  });

  router.put('/notifications/preferences', writeLimit, async (request, response) => {
    const parsed = NotificationPreferencesSchema.safeParse(request.body);
    if (!parsed.success) throw new ApiError(400, 'INVALID_NOTIFICATION_PREFERENCES', 'All four notification preferences must be booleans.');
    const preferences = await context.repository.setNotificationPreferences(requireOwnerHash(request), parsed.data);
    response.json({ preferences, delivery: 'IN_APP_ON_REFRESH', pushConfigured: false });
  });

  return router;
}
