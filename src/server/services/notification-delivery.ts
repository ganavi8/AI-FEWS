import type { Alert, NotificationPreferences } from '../../shared/contracts.js';
import type { Repository } from './types.js';
import { sendPushNotifications } from './push.js';

function shouldDeliver(alert: Alert, preferences: NotificationPreferences): boolean {
  if (alert.changeType !== 'NEW' && alert.changeType !== 'ESCALATION') return false;

  if (alert.sourceKind === 'OFFICIAL') {
    return preferences.officialWarnings === true;
  }

  if (alert.sourceKind === 'COMMUNITY') {
    return preferences.communitySystem;
  }

  if (alert.type === 'HEAVY_RAIN') {
    return preferences.heavyRain;
  }

  if (alert.type === 'HIGH_RISK') {
    return preferences.highRisk;
  }

  if (alert.type === 'ENVIRONMENTAL') {
    return preferences.environmental;
  }

  return false;
}

function buildTitle(alert: Alert): string {
  if (alert.sourceKind === 'OFFICIAL') return 'OFFICIAL - AI-FEWS ALERT';
  if (alert.sourceKind === 'COMMUNITY') return 'COMMUNITY - AI-FEWS REPORT';
  if (alert.changeType === 'ESCALATION') return 'AI-FEWS - RISK ESCALATION';
  return `AI-FEWS - ${alert.severity.replaceAll('_', ' ')}`;
}

export async function deliverAlertPush(
  repository: Repository,
  ownerHash: string,
  alert: Alert,
): Promise<void> {
  if (!alert.persisted || !alert.locationId) return;
  if (!shouldDeliver(alert, await repository.getNotificationPreferences(ownerHash))) return;

  const installations = await repository.listNotificationInstallations(ownerHash);
  const tokens = installations
    .filter((installation) => installation.pushToken)
    .map((installation) => installation.pushToken);

  if (tokens.length === 0) return;

  const result = await sendPushNotifications(tokens, {
    alertId: alert.id,
    title: buildTitle(alert),
    body: alert.reason.slice(0, 220),
    sourceKind: alert.sourceKind ?? 'AI_RULE',
    severity: alert.severity,
    changeType: alert.changeType ?? 'NEW',
    locationId: alert.locationId,
    fingerprint: alert.fingerprint,
  });

  for (const installation of installations) {
    if (!result.invalidTokens.includes(installation.pushToken)) continue;

    try {
      await repository.unregisterNotificationInstallation(
        ownerHash,
        installation.installationId,
      );
    } catch (error) {
      console.error(JSON.stringify({
        event: 'invalid_push_installation_cleanup_failed',
        installationId: installation.installationId,
        code: error instanceof Error ? error.name : 'UNKNOWN',
      }));
    }
  }

  console.info(JSON.stringify({
    event: 'alert_push_delivery',
    alertId: alert.id,
    locationId: alert.locationId,
    sourceKind: alert.sourceKind ?? 'AI_RULE',
    changeType: alert.changeType ?? 'NEW',
    sent: result.sent,
    failed: result.failed,
    invalidTokenCount: result.invalidTokens.length,
    configured: result.configured,
  }));
}




