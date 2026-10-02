import { createHash, randomUUID } from 'node:crypto';
import type { Alert } from '../../../shared/contracts.js';
import type { OfficialAlert } from './types.js';

const OFFICIAL_SAFETY_TTL_MS = 6 * 60 * 60 * 1000;

const OFFICIAL_SEVERITY_RANK: Record<OfficialAlert['severity'], number> = {
  ADVISORY: 1,
  WARNING: 2,
  SEVERE: 3,
  EXTREME: 4,
};

export function officialSeverityToAlertSeverity(
  severity: OfficialAlert['severity'],
): Alert['severity'] {
  switch (severity) {
    case 'EXTREME':
    case 'SEVERE':
      return 'HIGH';
    case 'WARNING':
      return 'WARNING';
    case 'ADVISORY':
    default:
      return 'INFORMATION';
  }
}

export function officialAlertFingerprint(alert: OfficialAlert): string {
  return createHash('sha256')
    .update(`OFFICIAL:${alert.rawSource}:${alert.externalAlertId}`)
    .digest('hex');
}

export function officialAlertToAlert(
  official: OfficialAlert,
  locationId: string | null,
  locationName: string | null,
  previousAlert: Alert | null = null,
): Alert {
  const now = new Date().toISOString();
  const expiresAt =
    official.expiresAt ??
    new Date(Date.now() + OFFICIAL_SAFETY_TTL_MS).toISOString();

  const isRetraction = official.msgType === 'Cancel';

  let changeType: Alert['changeType'];

  if (isRetraction) {
    changeType = 'RETRACTION';
  } else if (!previousAlert) {
    changeType = 'NEW';
  } else {
    const currentRank = OFFICIAL_SEVERITY_RANK[official.severity];
    const previousSeverity =
      previousAlert.severity === 'HIGH'
        ? 'SEVERE'
        : previousAlert.severity === 'WARNING'
          ? 'WARNING'
          : 'ADVISORY';
    const previousRank = OFFICIAL_SEVERITY_RANK[previousSeverity];

    changeType = currentRank > previousRank ? 'ESCALATION' : 'PERSISTENCE';
  }

  const status: Alert['status'] = isRetraction ? 'RETRACTED' : 'ACTIVE';

  const reason = isRetraction
    ? `${official.title}: official warning retracted.`
    : official.description;

  return {
    id: randomUUID(),
    fingerprint: officialAlertFingerprint(official),
    locationId,
    locationName,
    severity: officialSeverityToAlertSeverity(official.severity),
    type: 'HIGH_RISK',
    reason,
    source: official.rawSource,
    sourceKind: 'OFFICIAL',
    authority: official.authority,
    sourceUrl: official.sourceUrl,
    externalAlertId: official.externalAlertId,
    status,
    acknowledgedAt: null,
    acknowledgedBy: null,
    detectedAt: now,
    updatedAt: now,
    changeType,
    createdAt: now,
    expiresAt,
    dataQuality:
      official.expiresAt === null
        ? 'OFFICIAL_SOURCE_SYSTEM_TTL'
        : 'OFFICIAL_SOURCE',
    recommendedAction:
      official.instruction ??
      'Follow the instructions issued by the relevant official authority.',
    persisted: false,
  };
}
