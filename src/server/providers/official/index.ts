import { SachetProvider } from './sachet.js';
import type { OfficialWarningProvider } from './types.js';

export function getOfficialWarningProviders(): OfficialWarningProvider[] {
  const providers: OfficialWarningProvider[] = [];

  if (process.env.AIFEWS_SACHET_ENABLED === 'true') {
    providers.push(new SachetProvider());
  }

  return providers;
}
