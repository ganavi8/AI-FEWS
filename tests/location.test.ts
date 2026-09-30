// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { LocationAccessError, requestOneShotLocation } from '../src/client/services/location.js';

const position = (): GeolocationPosition => ({
  coords: {
    latitude: 45.5, longitude: -73.56, accuracy: 100,
    altitude: null, altitudeAccuracy: null, heading: null, speed: null, toJSON: () => ({}),
  },
  timestamp: Date.now(), toJSON: () => ({}),
});

describe('one-shot location consent adapter', () => {
  it('reads exactly one browser position with no watch and never requests background updates', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback, _error?: PositionErrorCallback, _options?: PositionOptions) => success(position()));
    const watchPosition = vi.fn();
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition, watchPosition } });

    await expect(requestOneShotLocation()).resolves.toEqual({
      coordinates: { latitude: 45.5, longitude: -73.56 }, method: 'browser',
    });
    expect(getCurrentPosition).toHaveBeenCalledOnce();
    expect(getCurrentPosition.mock.calls[0]?.[2]).toMatchObject({ enableHighAccuracy: false, maximumAge: 0 });
    expect(watchPosition).not.toHaveBeenCalled();
  });

  it('returns actionable manual-coordinate guidance after permission is denied', async () => {
    const denied = {
      code: 1,
      message: 'denied',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    } as GeolocationPositionError;
    const getCurrentPosition = vi.fn((_success: PositionCallback, error?: PositionErrorCallback) => error?.(denied));
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition } });
    await expect(requestOneShotLocation()).rejects.toMatchObject({
      name: LocationAccessError.name,
      message: 'Location access was denied. Enter coordinates manually if you prefer.',
    });
    expect(getCurrentPosition).toHaveBeenCalledOnce();
  });
});
