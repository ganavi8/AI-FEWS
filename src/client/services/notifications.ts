import { Capacitor } from '@capacitor/core';
import type { Alert } from '../../shared/contracts.js';
import { api, isNativePlatform } from './api.js';

const INSTALLATION_ID_KEY = 'aifews.notificationInstallationId.v1';

let pushListenersRegistered = false;

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

export async function registerNotificationInstallation(
  pushToken?: string | null,
): Promise<boolean> {
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
    return registerAndroidPush();
  }

  if (!('Notification' in window)) return false;

  if (Notification.permission === 'granted') {
    void registerNotificationInstallation();
    return true;
  }

  if (Notification.permission === 'denied') return false;

  const granted = (await Notification.requestPermission()) === 'granted';

  if (granted) {
    void registerNotificationInstallation();
  }

  return granted;
}

async function registerAndroidPush(): Promise<boolean> {
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');

    const permission = await PushNotifications.checkPermissions();

    console.log('[AI-FEWS FCM] permission:', permission.receive);

    const result =
      permission.receive === 'granted'
        ? permission
        : await PushNotifications.requestPermissions();

    console.log('[AI-FEWS FCM] permission result:', result.receive);

    if (result.receive !== 'granted') {
      console.warn('[AI-FEWS FCM] notification permission not granted');
      return false;
    }

    if (Capacitor.getPlatform() === 'android') {
      await PushNotifications.createChannel({
        id: 'aifews-alerts',
        name: 'AI·FEWS Alerts',
        description: 'Flood, heavy-rain, official and environmental alerts',
        importance: 5,
        visibility: 1,
        sound: 'default',
      });

      console.log('[AI-FEWS FCM] Android channel ready');
    }

    if (!pushListenersRegistered) {
      pushListenersRegistered = true;

      await PushNotifications.addListener('registration', async (token) => {
        console.log('[AI-FEWS FCM] registration event received');

        const registered = await registerNotificationInstallation(token.value);

        console.log(
          '[AI-FEWS FCM] backend installation registration:',
          registered ? 'SUCCESS' : 'FAILED',
        );
      });

      await PushNotifications.addListener(
        'registrationError',
        (error) => {
          console.error('[AI-FEWS FCM] registration error:', {
            message: error?.error ?? 'Unknown registration error',
          });

          void registerNotificationInstallation(null);
        },
      );

      await PushNotifications.addListener(
        'pushNotificationReceived',
        async (notification) => {
          const alertId = notification.data?.alertId;

          const alert: Alert | null = alertId
            ? ({
                id: String(alertId),
                persisted: true,
                sourceKind:
                  notification.data?.sourceKind === 'OFFICIAL'
                    ? 'OFFICIAL'
                    : notification.data?.sourceKind === 'COMMUNITY'
                      ? 'COMMUNITY'
                      : 'AI_RULE',
                severity: String(notification.data?.severity ?? 'HIGH'),
                reason:
                  notification.body ??
                  notification.title ??
                  'AI·FEWS notification',
                fingerprint: String(
                  notification.data?.fingerprint ?? alertId,
                ),
                changeType:
                  notification.data?.changeType === 'ESCALATION'
                    ? 'ESCALATION'
                    : 'NEW',
              } as Alert)
            : null;

          if (alert) {
            await showNewAlertNotification(alert);
          }
        },
      );

      await PushNotifications.addListener(
        'pushNotificationActionPerformed',
        async (action) => {
          const alertId = action.notification.data?.alertId;

          if (alertId) {
            try {
              window.localStorage.setItem(
                'aifews.lastNotificationAlertId',
                String(alertId),
              );
            } catch {
              /* optional */
            }
          }
        },
      );

      console.log('[AI-FEWS FCM] listeners registered');
    }

    console.log('[AI-FEWS FCM] calling PushNotifications.register()');

    await PushNotifications.register();

    console.log('[AI-FEWS FCM] register() completed');

    return true;
  } catch (error) {
    console.error('[AI-FEWS FCM] initialization failed:', {
      name: error instanceof Error ? error.name : 'UNKNOWN',
      message: error instanceof Error ? error.message : 'Unknown error',
    });

    return false;
  }
}

export async function showNewAlertNotification(
  alert: Alert,
): Promise<boolean> {
  if (!alert.persisted) return false;

  const title = (() => {
    if (alert.sourceKind === 'OFFICIAL') return 'OFFICIAL · ALERT';
    if (alert.sourceKind === 'COMMUNITY') return 'COMMUNITY · REPORT';
    if (alert.changeType === 'ESCALATION') {
      return 'AI·FEWS · ALERT ESCALATION';
    }
    return `AI·FEWS · ${alert.severity.replaceAll('_', ' ')}`;
  })();

  const body = alert.reason.slice(0, 220);

  if (Capacitor.isNativePlatform()) {
    try {
      const { LocalNotifications } = await import(
        '@capacitor/local-notifications'
      );

      const permission = await LocalNotifications.checkPermissions();

      if (permission.display !== 'granted') return false;

      await LocalNotifications.schedule({
        notifications: [
          {
            id: Math.floor(Date.now() % 2_000_000_000),
            title,
            body,
            schedule: { at: new Date(Date.now() + 1000) },
            extra: { alertId: alert.id },
          },
        ],
      });

      return true;
    } catch {
      return false;
    }
  }

  if (
    !('Notification' in window) ||
    Notification.permission !== 'granted'
  ) {
    return false;
  }

  try {
    new Notification(title, {
      body,
      tag: alert.fingerprint,
      icon: '/icons/aifews-192.png',
    });

    return true;
  } catch {
    return false;
  }
}
