import { Capacitor } from '@capacitor/core';
import type { Alert } from '../../shared/contracts.js';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const current = await LocalNotifications.checkPermissions();
      const result = current.display === 'granted' ? current : await LocalNotifications.requestPermissions();
      return result.display === 'granted';
    } catch { return false; }
  }
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

export async function showNewAlertNotification(alert: Alert): Promise<boolean> {
  if (!alert.persisted) return false;
  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') return false;
      await LocalNotifications.schedule({ notifications: [{
        id: Math.floor(Date.now() % 2_000_000_000),
        title: `AI·FEWS · ${alert.severity.replaceAll('_', ' ')}`,
        body: alert.reason.slice(0, 220),
        schedule: { at: new Date(Date.now() + 1000) },
        extra: { alertId: alert.id },
      }] });
      return true;
    } catch { return false; }
  }
  if (!('Notification' in window) || Notification.permission !== 'granted') return false;
  try {
    new Notification(`AI·FEWS · ${alert.severity.replaceAll('_', ' ')}`, {
      body: alert.reason.slice(0, 220), tag: alert.fingerprint, icon: '/icons/aifews-192.png',
    });
    return true;
  } catch { return false; }
}
