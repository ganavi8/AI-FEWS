import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  SavedLocationsResponseSchema,
  type Coordinates, type DataStatus, type EnvironmentResponse, type SavedLocation,
} from '../../shared/contracts.js';
import { api, ApiClientError } from '../services/api.js';
import { latestEnvironmentSnapshot, saveEnvironmentSnapshot, syncQueuedReports } from '../services/offline.js';
import { showNewAlertNotification } from '../services/notifications.js';

export interface SelectedLocation {
  coordinates: Coordinates;
  id: string | null;
  name: string | null;
  method: 'browser' | 'android' | 'manual' | 'saved';
}

interface LocationContextValue {
  selected: SelectedLocation | null;
  environment: EnvironmentResponse | null;
  savedLocations: SavedLocation[];
  savedLocationStatus: DataStatus;
  loading: boolean;
  online: boolean;
  error: string | null;
  clearError(): void;
  loadCoordinates(coordinates: Coordinates, method: 'browser' | 'android' | 'manual'): Promise<void>;
  loadSavedLocation(id: string): Promise<void>;
  refresh(): Promise<void>;
  resolvePlaceName(): Promise<string | null>;
  saveCurrentLocation(name: string): Promise<SavedLocation>;
  renameSavedLocation(id: string, name: string): Promise<void>;
  deleteSavedLocation(id: string): Promise<void>;
  reloadSavedLocations(): Promise<void>;
  clearLocalState(): void;
}

const LocationContext = createContext<LocationContextValue | null>(null);
const SAVED_CACHE_KEY = 'aifews.pref.savedLocations';
const ALERT_SEEN_KEY = 'aifews.pref.seenAlerts';
const NOTIFICATIONS_ENABLED_KEY = 'aifews.pref.notificationsEnabled';

function messageFor(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return 'The requested location could not be loaded.';
}

function readCachedSavedLocations(): SavedLocation[] {
  try {
    const raw = localStorage.getItem(SAVED_CACHE_KEY);
    if (!raw) return [];
    const parsed = SavedLocationsResponseSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data.locations : [];
  } catch { return []; }
}

function writeCachedSavedLocations(locations: SavedLocation[]): void {
  try { localStorage.setItem(SAVED_CACHE_KEY, JSON.stringify({ locations })); } catch { /* local cache is optional */ }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<SelectedLocation | null>(null);
  const [environment, setEnvironment] = useState<EnvironmentResponse | null>(null);
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([]);
  const [savedLocationStatus, setSavedLocationStatus] = useState<DataStatus>('UNAVAILABLE');
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine);
  const [error, setError] = useState<string | null>(null);

  const reloadSavedLocations = useCallback(async () => {
    try {
      const response = await api.savedLocations();
      setSavedLocations(response.locations);
      writeCachedSavedLocations(response.locations);
      setSavedLocationStatus('LIVE');
    } catch {
      const cached = readCachedSavedLocations();
      setSavedLocations(cached);
      setSavedLocationStatus(cached.length ? 'CACHED' : 'UNAVAILABLE');
    }
  }, []);

  const notifyNewPersistedAlerts = useCallback(async (alerts: EnvironmentResponse['currentAlerts']) => {
    if (!alerts.length) return;
    let previous: string[] | null = null;
    try {
      const raw = localStorage.getItem(ALERT_SEEN_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) previous = parsed;
      }
    } catch { /* notifications remain optional */ }
    const currentIds = alerts.filter((alert) => alert.persisted).map((alert) => alert.id);
    if (previous === null) {
      try { localStorage.setItem(ALERT_SEEN_KEY, JSON.stringify(currentIds.slice(0, 200))); } catch { /* optional */ }
      return;
    }
    const previousSet = new Set(previous);
    const fresh = alerts.filter((alert) => alert.persisted && !previousSet.has(alert.id)
      && Date.now() - Date.parse(alert.createdAt) < 2 * 60 * 60_000);
    try { localStorage.setItem(ALERT_SEEN_KEY, JSON.stringify([...currentIds, ...previous].slice(0, 200))); } catch { /* optional */ }
    let optedIn = false;
    try { optedIn = localStorage.getItem(NOTIFICATIONS_ENABLED_KEY) === 'true'; } catch { /* denied */ }
    if (!optedIn || !fresh.length) return;
    try {
      const { preferences } = await api.notifications();
      for (const alert of fresh) {
        const enabled = alert.sourceKind === 'OFFICIAL' ? preferences.officialWarnings === true
          : alert.sourceKind === 'COMMUNITY' ? preferences.communitySystem
          : alert.type === 'HEAVY_RAIN' ? preferences.heavyRain
          : alert.type === 'HIGH_RISK' ? preferences.highRisk : preferences.environmental;
        if (enabled) await showNewAlertNotification(alert);
      }
    } catch { /* the alert remains in its persistent in-app list */ }
  }, []);

  const loadEnvironment = useCallback(async (target: SelectedLocation) => {
    setLoading(true);
    setError(null);
    setSelected(target);
    setEnvironment(null);
    try {
      const result = target.id
        ? await api.environment({ locationId: target.id })
        : await api.environment({
          latitude: target.coordinates.latitude,
          longitude: target.coordinates.longitude,
          method: target.method === 'saved' ? 'manual' : target.method,
        });
      const withName = target.name && !result.locationName ? { ...result, locationName: target.name } : result;
      setEnvironment(withName);
      setSelected({ ...target, name: withName.locationName });
      const hasObservation = withName.weather.current !== null || withName.weather.hourly.length > 0 || withName.airQuality.current !== null;
      if (hasObservation) await saveEnvironmentSnapshot(withName).catch(() => undefined);
      await notifyNewPersistedAlerts(withName.currentAlerts);
    } catch (cause) {
      const snapshot = await latestEnvironmentSnapshot(target.coordinates.latitude, target.coordinates.longitude).catch(() => null);
      if (snapshot) setEnvironment({ ...snapshot, locationName: target.name ?? snapshot.locationName });
      setError(`${messageFor(cause)}${snapshot ? ` Showing the last local observation from ${new Date(snapshot.fetchedAt).toLocaleString()}.` : ''}`);
    } finally {
      setLoading(false);
    }
  }, [notifyNewPersistedAlerts]);

  const loadCoordinates = useCallback(async (coordinates: Coordinates, method: 'browser' | 'android' | 'manual') => {
    await loadEnvironment({ coordinates, method, id: null, name: null });
  }, [loadEnvironment]);

  const loadSavedLocation = useCallback(async (id: string) => {
    const saved = savedLocations.find((item) => item.id === id);
    if (!saved) {
      setError('This saved place is not available on this installation. Reconnect to refresh saved places.');
      return;
    }
    await loadEnvironment({
      coordinates: { latitude: saved.latitude, longitude: saved.longitude },
      id: saved.id, name: saved.name, method: 'saved',
    });
  }, [loadEnvironment, savedLocations]);

  const refresh = useCallback(async () => {
    if (selected) await loadEnvironment(selected);
  }, [loadEnvironment, selected]);

  const resolvePlaceName = useCallback(async (): Promise<string | null> => {
    if (!selected) return null;
    try {
      const result = await api.geocode(selected.coordinates.latitude, selected.coordinates.longitude);
      if (result.displayName && (result.status === 'LIVE' || result.status === 'CACHED')) {
        setSelected((current) => current ? { ...current, name: result.displayName } : current);
        setEnvironment((current) => current ? { ...current, locationName: result.displayName } : current);
        return result.displayName;
      }
      setError(result.error ?? 'No place name was returned. You can keep using the coordinates.');
      return null;
    } catch (cause) {
      setError(messageFor(cause));
      return null;
    }
  }, [selected]);

  const saveCurrentLocation = useCallback(async (name: string) => {
    if (!selected) throw new Error('Load a location before saving it.');
    const response = await api.saveLocation({ ...selected.coordinates, name });
    const next = [response.location, ...savedLocations.filter((item) => item.id !== response.location.id)];
    setSavedLocations(next);
    writeCachedSavedLocations(next);
    setSavedLocationStatus('LIVE');
    setSelected((current) => current ? { ...current, id: response.location.id, name: response.location.name, method: 'saved' } : current);
    return response.location;
  }, [savedLocations, selected]);

  const renameSavedLocation = useCallback(async (id: string, name: string) => {
    const response = await api.renameLocation(id, name);
    const next = savedLocations.map((item) => item.id === id ? response.location : item);
    setSavedLocations(next);
    writeCachedSavedLocations(next);
    setSelected((current) => current?.id === id ? { ...current, name: response.location.name } : current);
  }, [savedLocations]);

  const deleteSavedLocation = useCallback(async (id: string) => {
    await api.deleteLocation(id);
    const next = savedLocations.filter((item) => item.id !== id);
    setSavedLocations(next);
    writeCachedSavedLocations(next);
    if (selected?.id === id) setSelected({ ...selected, id: null, method: 'manual' });
    await reloadSavedLocations();
  }, [reloadSavedLocations, savedLocations, selected]);

  const clearError = useCallback(() => setError(null), []);
  const clearLocalState = useCallback(() => {
    setSelected(null);
    setEnvironment(null);
    setSavedLocations([]);
    setSavedLocationStatus('UNAVAILABLE');
    setError(null);
  }, []);

  useEffect(() => {
    void reloadSavedLocations();
    const handleOnline = () => {
      setOnline(true);
      void syncQueuedReports().catch(() => undefined);
      void reloadSavedLocations();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [reloadSavedLocations]);

  const value = useMemo<LocationContextValue>(() => ({
    selected, environment, savedLocations, savedLocationStatus, loading, online, error,
    clearError, loadCoordinates, loadSavedLocation, refresh, resolvePlaceName,
    saveCurrentLocation, renameSavedLocation, deleteSavedLocation, reloadSavedLocations, clearLocalState,
  }), [selected, environment, savedLocations, savedLocationStatus, loading, online, error,
    clearError, loadCoordinates, loadSavedLocation, refresh, resolvePlaceName,
    saveCurrentLocation, renameSavedLocation, deleteSavedLocation, reloadSavedLocations, clearLocalState]);
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocationData(): LocationContextValue {
  const value = useContext(LocationContext);
  if (!value) throw new Error('useLocationData must be used inside LocationProvider.');
  return value;
}


