import { Capacitor } from '@capacitor/core';
import type { Alert } from '../../shared/contracts.js';
import { api, isNativePlatform } from './api.js';

const INSTALLATION_ID_KEY = 'aifews.notificationInstallationId.v1';

function getInstallationId(): string {
  try {
    const existing = window.localStorage.getItem(INSTALLATION_ID_KEY);
    if (existing && /^[A-Za-z0-9._-]{1,96}$/.test(existing)) return existing;

    const generated = crypto.randomUUID();
    window.localStorage.setItem(INSTALLATION_ID_KEY, generated);
    return generated;
  } catch {
    return crypto.randomUUID();
  }
}

export async function registerNotificationInstallation(pushToken?: string | null): Promise<boolean> {
  try {
    await api.registerNotificationInstallation({
      installationId: getInstallationId(),
      platform: isNativePlatform() ? 'ANDROID' : 'WEB',
      pushToken: pushToken ?? null,
    });
    return true;
  } catch {
    return false;
  }
}

export async function unregisterNotificationInstallation(): Promise<boolean> {
  try {
    await api.unregisterNotificationInstallation(getInstallationId());
    return true;
  } catch {
    return false;
  }
}
export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const current = await LocalNotifications.checkPermissions();
      const result = current.display === 'granted' ? current : await LocalNotifications.requestPermissions();
      const granted = result.display === 'granted';
      if (granted) void registerNotificationInstallation();
      return granted;
    } catch { return false; }
  }
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') { void registerNotificationInstallation(); return true; }
  if (Notification.permission === 'denied') return false;
  const granted = (await Notification.requestPermission()) === 'granted';
  if (granted) void registerNotificationInstallation();
  return granted;
}

export async function showNewAlertNotification(alert: Alert): Promise<boolean> {
  if (!alert.persisted) return false;
  const title = (() => {
    if (alert.sourceKind === 'OFFICIAL') return 'OFFICIAL · ALERT';
    if (alert.sourceKind === 'COMMUNITY') return 'COMMUNITY Â· REPORT';
    if (alert.changeType === 'ESCALATION') return 'AI·FEWS Â· ALERT ESCALATION';
    return `AI·FEWS Â· ${alert.severity.replaceAll('_', ' ')}`;
  })();
  const body = alert.reason.slice(0, 220);

  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') return false;
      await LocalNotifications.schedule({ notifications: [{
        id: Math.floor(Date.now() % 2_000_000_000),
        title,
        body,
        schedule: { at: new Date(Date.now() + 1000) },
        extra: { alertId: alert.id },
      }] });
      return true;
    } catch { return false; }
  }
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  try {
    new Notification(title, {
      body, tag: alert.fingerprint, icon: '/icons/aifews-192.png',
    });
    return true;
  } catch { return false; }
}






