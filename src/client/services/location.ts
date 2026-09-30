import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import type { Coordinates } from '../../shared/contracts.js';

export class LocationAccessError extends Error {
  constructor(message: string) { super(message); this.name = 'LocationAccessError'; }
}

export async function requestOneShotLocation(): Promise<{ coordinates: Coordinates; method: 'browser' | 'android' }> {
  if (Capacitor.isNativePlatform()) {
    try {
      let permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
        permissions = await Geolocation.requestPermissions();
      }
      if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
        throw new LocationAccessError('Location access was not granted. You can still enter coordinates manually.');
      }
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false, timeout: 12_000, maximumAge: 0,
      });
      return { coordinates: { latitude: position.coords.latitude, longitude: position.coords.longitude }, method: 'android' };
    } catch (error) {
      if (error instanceof LocationAccessError) throw error;
      throw new LocationAccessError('A one-time device location could not be read. Enter coordinates manually or try again.');
    }
  }
  if (!('geolocation' in navigator)) throw new LocationAccessError('This browser does not provide geolocation. Enter coordinates manually.');
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        coordinates: { latitude: position.coords.latitude, longitude: position.coords.longitude },
        method: 'browser',
      }),
      (error) => reject(new LocationAccessError(
        error.code === error.PERMISSION_DENIED
          ? 'Location access was denied. Enter coordinates manually if you prefer.'
          : 'A one-time device location could not be read. Check permissions or enter coordinates manually.',
      )),
      { enableHighAccuracy: false, maximumAge: 0, timeout: 12_000 },
    );
  });
}
