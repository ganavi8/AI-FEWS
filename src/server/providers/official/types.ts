export type OfficialAlertSeverity = 'ADVISORY' | 'WARNING' | 'SEVERE' | 'EXTREME';

export type OfficialCapMessageType =
  | 'Alert'
  | 'Update'
  | 'Cancel'
  | 'Ack'
  | 'Error';

export type OfficialCapStatus =
  | 'Actual'
  | 'Exercise'
  | 'System'
  | 'Test'
  | 'Draft';

export interface OfficialAlert {
  authority: string;
  sourceUrl: string;
  externalAlertId: string;
  title: string;
  description: string;
  severity: OfficialAlertSeverity;
  areaName: string;
  issuedAt: string;
  effectiveAt: string | null;
  expiresAt: string | null;
  instruction: string | null;
  msgType: OfficialCapMessageType;
  status: OfficialCapStatus;
  scope: 'Public' | 'Restricted' | 'Private';
  rawSource: 'SACHET' | 'IMD';
}

export type OfficialProviderStatus =
  | 'OK'
  | 'NO_ALERTS'
  | 'CONFIGURATION_REQUIRED'
  | 'UNAVAILABLE';

export interface OfficialProviderResult {
  status: OfficialProviderStatus;
  alerts: OfficialAlert[];
  provider: 'SACHET' | 'IMD';
  checkedAt: string;
  message?: string;
}

export interface OfficialWarningProvider {
  readonly name: 'SACHET' | 'IMD';

  getWarnings(latitude: number, longitude: number): Promise<OfficialProviderResult>;
}
