import type { DataQualityEntry, DataStatus } from '../../shared/contracts.js';
import { getProviderState } from './provider-state.js';
import type { DataQualityResponse } from './types.js';

const PROVIDERS = [
  {
    id: 'open-meteo-weather', name: 'Open-Meteo Forecast', category: 'Weather forecast',
    source: 'https://open-meteo.com/en/docs', configured: true,
    attribution: 'Weather data by Open-Meteo',
    limitations: ['Modelled forecast, not an on-site rain gauge.', 'No local drainage, stream-gauge or impact data is included.'],
  },
  {
    id: 'open-meteo-air', name: 'Open-Meteo Air Quality', category: 'Air-quality forecast',
    source: 'https://open-meteo.com/en/docs/air-quality-api', configured: true,
    attribution: 'Air-quality data by Open-Meteo',
    limitations: ['Forecast/model output; not a local regulatory monitor.', 'US AQI is explicitly labeled and may not match local categories.'],
  },
  {
    id: 'nominatim', name: 'OpenStreetMap Nominatim', category: 'Reverse geocoding',
    source: 'https://nominatim.org/release-docs/latest/api/Reverse/', configured: true,
    attribution: '© OpenStreetMap contributors',
    limitations: ['Called only after an explicit place-name resolution action.', 'Public service is globally throttled and is not an emergency geocoder.'],
  },
  {
    id: 'osm-tiles', name: 'OpenStreetMap Raster Tiles', category: 'Map tiles',
    source: 'https://operations.osmfoundation.org/policies/tiles/', configured: true,
    attribution: '© OpenStreetMap contributors',
    limitations: ['Tiles load only for visible map areas.', 'Tiles are not prefetched or stored for offline use.'],
  },
  {
    id: 'satellite', name: 'Satellite imagery', category: 'Imagery',
    source: null, configured: false, attribution: 'No imagery provider configured.',
    limitations: ['No satellite provider or API credentials are configured; no data is fabricated.'],
  },
  {
    id: 'terrain', name: 'Terrain and elevation', category: 'Terrain',
    source: null, configured: false, attribution: 'No terrain provider configured.',
    limitations: ['No elevation model is configured.'],
  },
  {
    id: 'hydrology', name: 'Hydrology and river gauges', category: 'Hydrology',
    source: null, configured: false, attribution: 'No hydrology provider configured.',
    limitations: ['No stream-gauge, catchment or drainage feeds are configured.'],
  },
  {
    id: 'historical-floods', name: 'Historical flood events', category: 'Historical events',
    source: null, configured: false, attribution: 'No event archive configured.',
    limitations: ['No authoritative local flood-event archive is configured.'],
  },
] as const;

export function providerCatalog(): Array<(typeof PROVIDERS)[number] & { status: DataStatus }> {
  return PROVIDERS.map((provider) => {
    if (!provider.configured) return { ...provider, status: 'CONFIGURATION REQUIRED' as const };
    if (provider.id === 'open-meteo-weather' || provider.id === 'open-meteo-air' || provider.id === 'nominatim') {
      const current = getProviderState(provider.id);
      return { ...provider, status: current?.status ?? 'UNAVAILABLE' };
    }
    if (provider.id === 'osm-tiles') return { ...provider, status: 'UNAVAILABLE' as const };
    throw new Error('Provider status policy is missing for a configured provider.');
  });
}

export function dataQuality(): DataQualityResponse {
  const entries: DataQualityEntry[] = providerCatalog().map((provider) => {
    const key = provider.id;
    const state = getProviderState(key);
    const status = provider.status;
    return {
      provider: provider.name,
      source: provider.source,
      latestUpdate: state?.observedAt ?? null,
      freshness: state?.status ?? (status === 'CONFIGURATION REQUIRED' ? status : 'UNAVAILABLE'),
      status,
      coverage: provider.category === 'Weather forecast'
        ? 'Current conditions and three-day hourly forecast at the requested coordinate.'
        : provider.category === 'Air-quality forecast'
          ? 'Provider-reported current PM2.5, PM10, ozone and US AQI where returned.'
          : provider.category === 'Map tiles'
            ? 'Visible map tiles only; coverage depends on OpenStreetMap contributors.'
            : provider.category === 'Reverse geocoding'
              ? 'On-demand reverse lookup; not queried automatically.'
              : 'Not configured.',
      limitations: [...provider.limitations, ...(state ? [] : ['No successful provider observation has been recorded in this server process.'])],
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    entries,
    limitations: [
      'Weather and air-quality services provide modelled provider data, not a validated flood forecast.',
      'Local terrain, drainage, stream gauges, exposure and impact data are not configured.',
      'A process restart clears only the short-lived provider-status summary; saved data follows the published privacy retention rules.',
    ],
  };
}
