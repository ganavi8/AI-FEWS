import type { Request } from 'express';
import { CoordinateQuerySchema, type Coordinates } from '../../shared/contracts.js';
import { ApiError } from '../errors.js';
import { hashOwnerKey } from '../middleware/rate-limit.js';

export function parseCoordinates(request: Request): Coordinates {
  const parsed = CoordinateQuerySchema.safeParse({
    latitude: request.query.latitude ?? request.query.lat,
    longitude: request.query.longitude ?? request.query.lon,
  });
  if (!parsed.success) {
    throw new ApiError(400, 'INVALID_COORDINATES', 'Provide a finite latitude from -90 to 90 and longitude from -180 to 180.');
  }
  return parsed.data;
}

export function optionalOwnerHash(request: Request): string | null {
  const raw = request.get('x-aifews-owner');
  if (!raw) return null;
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(raw)) {
    throw new ApiError(400, 'INVALID_OWNER_KEY', 'The anonymous browser/app owner key is invalid.');
  }
  return hashOwnerKey(raw);
}

export function requireOwnerHash(request: Request): string {
  const ownerHash = optionalOwnerHash(request);
  if (!ownerHash) throw new ApiError(401, 'OWNER_KEY_REQUIRED', 'Create or restore this installation’s local owner key to access its saved locations.');
  return ownerHash;
}

export function optionalQueryString(request: Request, key: string): string | null {
  const value = request.query[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}
