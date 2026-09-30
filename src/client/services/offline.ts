import { z } from 'zod';
import {
  CommunityReportSchema, EnvironmentResponseSchema, ReportInputSchema,
  type CommunityReport, type EnvironmentResponse, type ReportInput, type SyncStatus,
} from '../../shared/contracts.js';
import { api } from './api.js';

const DB_NAME = 'aifews-offline';
const DB_VERSION = 1;
const SNAPSHOTS = 'snapshots';
const REPORTS = 'reports';
const PREPAREDNESS = 'preparedness';
const PreparednessSchema = z.object({ id: z.string(), savedAt: z.string(), content: z.unknown() });

export interface LocalReport extends ReportInput {
  attempts: number;
  nextAttemptAt: number;
  localUpdatedAt: string;
  lastSyncMessage: string | null;
  serverReport: CommunityReport | null;
}

export interface LocalSnapshot {
  id: string;
  coordinateKey: string;
  savedAt: string;
  environment: EnvironmentResponse;
}

let databasePromise: Promise<IDBDatabase> | null = null;
let synchronizationInProgress = false;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  if (!('indexedDB' in window)) return Promise.reject(new Error('IndexedDB is not available in this browser.'));
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SNAPSHOTS)) {
        const store = db.createObjectStore(SNAPSHOTS, { keyPath: 'id' });
        store.createIndex('coordinateKey', 'coordinateKey', { unique: false });
      }
      if (!db.objectStoreNames.contains(REPORTS)) {
        const store = db.createObjectStore(REPORTS, { keyPath: 'clientId' });
        store.createIndex('syncStatus', 'status', { unique: false });
      }
      if (!db.objectStoreNames.contains(PREPAREDNESS)) db.createObjectStore(PREPAREDNESS, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => { databasePromise = null; reject(request.error ?? new Error('Could not open local storage.')); };
    request.onblocked = () => reject(new Error('Close older AI·FEWS tabs before upgrading offline storage.'));
  });
  return databasePromise;
}

async function transact<T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    let value: T;
    request.onsuccess = () => { value = request.result; };
    request.onerror = () => reject(request.error ?? new Error('Local storage request failed.'));
    transaction.oncomplete = () => resolve(value!);
    transaction.onerror = () => reject(transaction.error ?? new Error('Local storage transaction failed.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Local storage transaction was aborted.'));
  });
}

export function coordinateKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}:${longitude.toFixed(4)}`;
}

export async function saveEnvironmentSnapshot(environment: EnvironmentResponse): Promise<void> {
  const parsed = EnvironmentResponseSchema.safeParse(environment);
  if (!parsed.success) return;
  const key = coordinateKey(environment.coordinates.latitude, environment.coordinates.longitude);
  const id = `${key}:${environment.fetchedAt}`;
  const record: LocalSnapshot = { id, coordinateKey: key, savedAt: new Date().toISOString(), environment: parsed.data };
  await transact(SNAPSHOTS, 'readwrite', (store) => store.put(record));
  const db = await openDatabase();
  const all = await new Promise<LocalSnapshot[]>((resolve, reject) => {
    const request = db.transaction(SNAPSHOTS, 'readonly').objectStore(SNAPSHOTS).index('coordinateKey').getAll(key);
    request.onsuccess = () => resolve(request.result as LocalSnapshot[]);
    request.onerror = () => reject(request.error ?? new Error('Could not read local snapshots.'));
  });
  const expired = all.sort((a, b) => Date.parse(b.environment.fetchedAt) - Date.parse(a.environment.fetchedAt)).slice(30);
  if (expired.length) {
    const transaction = db.transaction(SNAPSHOTS, 'readwrite');
    for (const item of expired) transaction.objectStore(SNAPSHOTS).delete(item.id);
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not prune local snapshots.'));
    });
  }
}

export async function latestEnvironmentSnapshot(latitude: number, longitude: number): Promise<EnvironmentResponse | null> {
  const key = coordinateKey(latitude, longitude);
  const db = await openDatabase();
  const items = await new Promise<LocalSnapshot[]>((resolve, reject) => {
    const request = db.transaction(SNAPSHOTS, 'readonly').objectStore(SNAPSHOTS).index('coordinateKey').getAll(key);
    request.onsuccess = () => resolve(request.result as LocalSnapshot[]);
    request.onerror = () => reject(request.error ?? new Error('Could not read the saved snapshot.'));
  });
  const latest = items.sort((a, b) => Date.parse(b.environment.fetchedAt) - Date.parse(a.environment.fetchedAt))[0];
  if (!latest) return null;
  const parsed = EnvironmentResponseSchema.safeParse(latest.environment);
  if (!parsed.success) return null;
  const environment = parsed.data;
  const ageMinutes = Math.max(0, (Date.now() - Date.parse(environment.fetchedAt)) / 60_000);
  const status = ageMinutes <= 180 ? 'CACHED' as const : 'STALE' as const;
  const cachedWeatherStatus = ['UNAVAILABLE', 'ERROR', 'CONFIGURATION REQUIRED'].includes(environment.weather.status) ? environment.weather.status : status;
  const cachedAirStatus = ['UNAVAILABLE', 'ERROR', 'CONFIGURATION REQUIRED'].includes(environment.airQuality.status) ? environment.airQuality.status : status;
  const hasAnyObservation = environment.weather.current !== null || environment.weather.hourly.length > 0 || environment.airQuality.current !== null;
  return {
    ...environment,
    status: hasAnyObservation ? status : 'UNAVAILABLE',
    weather: {
      ...environment.weather, status: cachedWeatherStatus,
      freshness: { ...environment.weather.freshness, status: cachedWeatherStatus, ageMinutes },
    },
    airQuality: {
      ...environment.airQuality, status: cachedAirStatus,
      freshness: { ...environment.airQuality.freshness, status: cachedAirStatus, ageMinutes },
    },
    risk: { ...environment.risk, persisted: false, dataQuality: `${environment.risk.dataQuality}; offline snapshot (${status})` },
    currentAlerts: [],
  };
}

export async function queueReport(input: Omit<ReportInput, 'clientId' | 'status'> & { clientId?: string }): Promise<LocalReport> {
  const clientId = input.clientId ?? window.crypto.randomUUID();
  const parsed = ReportInputSchema.safeParse({ ...input, clientId, status: 'PENDING SYNC' });
  if (!parsed.success) throw new Error('Check report fields and coordinate ranges before saving.');
  const record: LocalReport = {
    ...parsed.data, attempts: 0, nextAttemptAt: 0, localUpdatedAt: new Date().toISOString(),
    lastSyncMessage: null, serverReport: null,
  };
  await transact(REPORTS, 'readwrite', (store) => store.put(record));
  return record;
}

export async function listLocalReports(): Promise<LocalReport[]> {
  const records = await transact<LocalReport[]>(REPORTS, 'readonly', (store) => store.getAll());
  return records.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function updateLocalReport(report: LocalReport): Promise<void> {
  await transact(REPORTS, 'readwrite', (store) => store.put(report));
}

export async function cachePreparedness(content: unknown): Promise<void> {
  const record = PreparednessSchema.parse({ id: 'preparedness-v1', savedAt: new Date().toISOString(), content });
  await transact(PREPAREDNESS, 'readwrite', (store) => store.put(record));
}

export async function hasOfflinePreparedness(): Promise<boolean> {
  const value = await transact<unknown>(PREPAREDNESS, 'readonly', (store) => store.get('preparedness-v1'));
  return PreparednessSchema.safeParse(value).success;
}

export async function syncQueuedReports(networkConfirmedOnline = false): Promise<LocalReport[]> {
  if (synchronizationInProgress || (!navigator.onLine && !networkConfirmedOnline)) return listLocalReports();
  synchronizationInProgress = true;
  try {
    const now = Date.now();
    const due = (await listLocalReports()).filter((report) =>
      (report.status === 'PENDING SYNC' || report.status === 'FAILED' || report.status === 'SYNCING') && report.nextAttemptAt <= now,
    );
    for (let offset = 0; offset < due.length; offset += 25) {
      const batch = due.slice(offset, offset + 25);
      const syncing = batch.map((report) => ({ ...report, status: 'SYNCING' as SyncStatus, localUpdatedAt: new Date().toISOString() }));
      await Promise.all(syncing.map(updateLocalReport));
      try {
        const response = await api.syncReports(syncing.map(({ clientId, category, description, latitude, longitude, createdAt, status }) => ({
          clientId, category, description, latitude, longitude, createdAt, status,
        })));
        const results = new Map(response.results.map((result) => [result.clientId, result]));
        for (const report of syncing) {
          const result = results.get(report.clientId);
          if (result?.syncStatus === 'SYNCED') {
            await updateLocalReport({
              ...report, status: 'SYNCED', nextAttemptAt: 0, localUpdatedAt: new Date().toISOString(),
              lastSyncMessage: null, serverReport: result.report ? CommunityReportSchema.parse(result.report) : null,
            });
          } else {
            const attempts = report.attempts + 1;
            const backoff = Math.min(60 * 60_000, 30_000 * (2 ** Math.min(attempts, 7))) + Math.floor(Math.random() * 5_000);
            await updateLocalReport({
              ...report, status: 'FAILED', attempts, nextAttemptAt: Date.now() + backoff,
              localUpdatedAt: new Date().toISOString(),
              lastSyncMessage: result?.message ?? 'The server did not confirm this report. It will be retried.',
            });
          }
        }
      } catch {
        for (const report of syncing) {
          const attempts = report.attempts + 1;
          const backoff = Math.min(60 * 60_000, 30_000 * (2 ** Math.min(attempts, 7))) + Math.floor(Math.random() * 5_000);
          await updateLocalReport({
            ...report, status: 'FAILED', attempts, nextAttemptAt: Date.now() + backoff,
            localUpdatedAt: new Date().toISOString(),
            lastSyncMessage: 'Connection failed before the server confirmed this report. It will be retried.',
          });
        }
      }
    }
    return listLocalReports();
  } finally {
    synchronizationInProgress = false;
  }
}

export async function clearLocalData(): Promise<void> {
  let offlineDataError: unknown = null;
  try {
    const db = await openDatabase();
    const transaction = db.transaction([SNAPSHOTS, REPORTS, PREPAREDNESS], 'readwrite');
    transaction.objectStore(SNAPSHOTS).clear();
    transaction.objectStore(REPORTS).clear();
    transaction.objectStore(PREPAREDNESS).clear();
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Could not clear local offline data.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Local offline-data clearing was aborted.'));
    });
  } catch (error) { offlineDataError = error; }
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith('aifews.pref.') || key === 'aifews.apiBase') localStorage.removeItem(key);
  } catch { /* browser storage may be restricted */ }
  if (offlineDataError) throw new Error('Local preferences were cleared, but offline IndexedDB records could not all be erased. Clear this site’s data in your browser settings.');
}

export async function countLocalSnapshots(): Promise<number> {
  return transact<number>(SNAPSHOTS, 'readonly', (store) => store.count());
}

export async function deleteDatabaseForTests(): Promise<void> {
  databasePromise?.then((db) => db.close()).catch(() => undefined);
  databasePromise = null;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Could not reset the offline test database.'));
    request.onblocked = () => reject(new Error('The offline test database is still open.'));
  });
}
