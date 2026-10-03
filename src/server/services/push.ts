import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging, type Messaging } from 'firebase-admin/messaging';

export interface PushAlertPayload {
  alertId: string;
  title: string;
  body: string;
  sourceKind: 'OFFICIAL' | 'AI_RULE' | 'COMMUNITY';
  severity: string;
  changeType: string;
  locationId: string;
  fingerprint: string;
}

export interface PushDeliveryResult {
  sent: number;
  failed: number;
  invalidTokens: string[];
  configured: boolean;
}

function getFirebaseMessaging(): Messaging | null {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

  if (!projectId || !clientEmail || !privateKey) return null;

  try {
    const app = getApps()[0] ?? initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });

    return getMessaging(app);
  } catch {
    return null;
  }
}

export function isPushConfigured(): boolean {
  return getFirebaseMessaging() !== null;
}

export async function sendPushNotification(token: string, payload: PushAlertPayload): Promise<'sent' | 'invalid' | 'failed'> {
  const messaging = getFirebaseMessaging();
  if (!messaging) return 'failed';

  try {
    await messaging.send({
      token,
      notification: { title: payload.title, body: payload.body },
      data: {
        alertId: payload.alertId,
        sourceKind: payload.sourceKind,
        severity: payload.severity,
        changeType: payload.changeType,
        locationId: payload.locationId,
        fingerprint: payload.fingerprint,
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'aifews-alerts',
          sound: 'default',
        },
      },
    });
    return 'sent';
  } catch (error) {
    const code = error instanceof Error ? error.message : String(error);
    if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) return 'invalid';
    return 'failed';
  }
}

export async function sendPushNotifications(tokens: string[], payload: PushAlertPayload): Promise<PushDeliveryResult> {
  const uniqueTokens = [...new Set(tokens.filter(Boolean))];

  if (!getFirebaseMessaging()) {
    return { sent: 0, failed: uniqueTokens.length, invalidTokens: [], configured: false };
  }

  let sent = 0;
  let failed = 0;
  const invalidTokens: string[] = [];

  for (const token of uniqueTokens) {
    const result = await sendPushNotification(token, payload);
    if (result === 'sent') sent += 1;
    else {
      failed += 1;
      if (result === 'invalid') invalidTokens.push(token);
    }
  }

  return { sent, failed, invalidTokens, configured: true };
}
