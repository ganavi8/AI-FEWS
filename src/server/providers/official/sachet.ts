import type {
  OfficialAlert,
  OfficialProviderResult,
  OfficialWarningProvider,
} from './types.js';

const SACHET_CAP_URL = 'https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile';

interface SachetCacheEntry {
  etag: string | null;
  xml: string;
  checkedAt: string;
}

const cache = new Map<string, SachetCacheEntry>();

function textFromXml(xml: string, tag: string): string | null {
  const match = xml.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'),
  );
  return match?.[1]?.trim() || null;
}

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseCap(xml: string): OfficialAlert[] {
  const alertBlocks = xml.match(/<alert\b[\s\S]*?<\/alert>/gi) ?? [];

  return alertBlocks.flatMap((block) => {
    const identifier = textFromXml(block, 'identifier');
    const sender = textFromXml(block, 'sender');
    const headline = textFromXml(block, 'headline');
    const description = textFromXml(block, 'description');
    const severityRaw = textFromXml(block, 'severity')?.toLowerCase();
    const areaName = textFromXml(block, 'areaDesc');
    const sent = textFromXml(block, 'sent');
    const effective = textFromXml(block, 'effective');
    const expires = textFromXml(block, 'expires');
    const instruction = textFromXml(block, 'instruction');

    const msgTypeRaw = textFromXml(block, 'msgType')?.trim().toLowerCase();
    const statusRaw = textFromXml(block, 'status')?.trim().toLowerCase();
    const scopeRaw = textFromXml(block, 'scope')?.trim().toLowerCase();

    if (!identifier || !headline || !sent || !areaName) return [];

    const severity =
      severityRaw === 'extreme'
        ? 'EXTREME'
        : severityRaw === 'severe'
          ? 'SEVERE'
          : severityRaw === 'moderate'
            ? 'WARNING'
            : 'ADVISORY';

    const msgType =
      msgTypeRaw === 'update'
        ? 'Update'
        : msgTypeRaw === 'cancel'
          ? 'Cancel'
          : msgTypeRaw === 'ack'
            ? 'Ack'
            : msgTypeRaw === 'error'
              ? 'Error'
              : 'Alert';

    const status =
      statusRaw === 'exercise'
        ? 'Exercise'
        : statusRaw === 'system'
          ? 'System'
          : statusRaw === 'test'
            ? 'Test'
            : statusRaw === 'draft'
              ? 'Draft'
              : 'Actual';

    const scope =
      scopeRaw === 'restricted'
        ? 'Restricted'
        : scopeRaw === 'private'
          ? 'Private'
          : 'Public';

    const sentDate = new Date(sent);
    if (Number.isNaN(sentDate.getTime())) return [];

    const effectiveDate = effective ? new Date(effective) : null;
    const expiresDate = expires ? new Date(expires) : null;

    return [{
      authority: sender ? unescapeXml(sender) : 'NDMA SACHET',
      sourceUrl: 'https://sachet.ndma.gov.in/',
      externalAlertId: unescapeXml(identifier),
      title: unescapeXml(headline),
      description: unescapeXml(description ?? headline),
      severity,
      areaName: unescapeXml(areaName),
      issuedAt: sentDate.toISOString(),
      effectiveAt:
        effectiveDate && !Number.isNaN(effectiveDate.getTime())
          ? effectiveDate.toISOString()
          : null,
      expiresAt:
        expiresDate && !Number.isNaN(expiresDate.getTime())
          ? expiresDate.toISOString()
          : null,
      instruction: instruction ? unescapeXml(instruction) : null,
      msgType,
      status,
      scope,
      rawSource: 'SACHET',
    }];
  });
}

export class SachetProvider implements OfficialWarningProvider {
  readonly name = 'SACHET' as const;

  async getWarnings(
    _latitude: number,
    _longitude: number,
  ): Promise<OfficialProviderResult> {
    const identifier = process.env.AIFEWS_SACHET_CAP_IDENTIFIER?.trim();

    if (!identifier) {
      return {
        status: 'CONFIGURATION_REQUIRED',
        alerts: [],
        provider: 'SACHET',
        checkedAt: new Date().toISOString(),
        message: 'AIFEWS_SACHET_CAP_IDENTIFIER is not configured.',
      };
    }

    const checkedAt = new Date().toISOString();
    const cached = cache.get(identifier);

    try {
      const url = new URL(SACHET_CAP_URL);
      url.searchParams.set('identifier', identifier);

      const headers: Record<string, string> = {
        Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8',
      };

      if (cached?.etag) {
        headers['If-None-Match'] = cached.etag;
      }

      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(10_000),
      });

      if (response.status === 304) {
        if (!cached) {
          return {
            status: 'UNAVAILABLE',
            alerts: [],
            provider: 'SACHET',
            checkedAt,
            message: 'SACHET returned 304 without a cached feed.',
          };
        }

        const alerts = parseCap(cached.xml);

        return {
          status: alerts.length > 0 ? 'OK' : 'NO_ALERTS',
          alerts,
          provider: 'SACHET',
          checkedAt,
        };
      }

      if (!response.ok) {
        return {
          status: 'UNAVAILABLE',
          alerts: [],
          provider: 'SACHET',
          checkedAt,
          message: `SACHET returned HTTP ${response.status}.`,
        };
      }

      const xml = await response.text();
      const etag = response.headers.get('etag');

      cache.set(identifier, {
        etag,
        xml,
        checkedAt,
      });

      const alerts = parseCap(xml);

      return {
        status: alerts.length > 0 ? 'OK' : 'NO_ALERTS',
        alerts,
        provider: 'SACHET',
        checkedAt,
      };
    } catch (error) {
      return {
        status: 'UNAVAILABLE',
        alerts: [],
        provider: 'SACHET',
        checkedAt,
        message:
          error instanceof Error
            ? error.message
            : 'SACHET request failed.',
      };
    }
  }
}
