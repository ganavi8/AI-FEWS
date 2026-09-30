import { CloudRain, Droplets, Gauge, Thermometer, Wind } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DataUnavailable, EmptyState, MetricCard, PageIntro, Panel, SourceLine } from '../app/components.js';
import { useLocationData } from '../app/LocationContext.js';

function n(value: number | null | undefined, digits = 1): string { return value === null || value === undefined ? '—' : value.toFixed(digits); }

export function EnvironmentPage() {
  const { environment, selected, error } = useLocationData();
  if (!selected || !environment) return <><PageIntro eyebrow="ENVIRONMENT / OBSERVED VALUES" title="Environmental conditions" description="Provider-reported values for a location you choose. No place or local sensor is assumed." />{error && <div className="error-banner" role="alert">{error}</div>}<Panel title="Select a location"><EmptyState title="No selected area" message="Choose a location to request weather and air-quality data." action={<Link className="button button-primary" to="/location">Choose location</Link>} /></Panel></>;
  const weather = environment.weather; const air = environment.airQuality; const current = weather.current;
  return <>
    <PageIntro eyebrow="ENVIRONMENT / REAL PROVIDER DATA" title="Environmental conditions" description={`Provider observations and forecast values for ${environment.locationName ?? 'the selected coordinates'}. Each source has its own freshness and may be unavailable.`} />
    <div className="location-strip"><Thermometer size={16} className="location-strip-pin" /><div><strong>{environment.locationName ?? 'Selected coordinates'}</strong><span>{selected.coordinates.latitude.toFixed(5)}, {selected.coordinates.longitude.toFixed(5)}</span></div><span className="field-hint">Snapshot fetched {new Date(environment.fetchedAt).toLocaleString()}</span></div>
    <div className="stack">
      <Panel title="Weather & precipitation" eyebrow={weather.provider.toUpperCase()}>
        {current ? <div className="grid grid-4">
          <MetricCard label="Air temperature" value={n(current.temperatureC)} unit="°C" status={weather.status} icon={<Thermometer size={16} />} />
          <MetricCard label="Rain" value={n(current.rainMm)} unit="mm" detail="Current interval" status={weather.status} icon={<CloudRain size={16} />} tone="cyan" />
          <MetricCard label="Humidity" value={n(current.humidityPercent, 0)} unit="%" status={weather.status} icon={<Droplets size={16} />} />
          <MetricCard label="Wind gust" value={n(current.windGustKmh)} unit="km/h" status={weather.status} icon={<Wind size={16} />} />
          <MetricCard label="Wind speed" value={n(current.windSpeedKmh)} unit="km/h" status={weather.status} />
          <MetricCard label="Pressure" value={n(current.pressureHpa)} unit="hPa" status={weather.status} icon={<Gauge size={16} />} />
          <MetricCard label="Weather code" value={current.weatherCode ?? '—'} detail="Provider WMO code" status={weather.status} />
          <MetricCard label="Precipitation" value={n(current.precipitationMm)} unit="mm" detail="Current interval" status={weather.status} />
        </div> : <DataUnavailable reason={weather.error ?? 'No current weather values were returned.'} />}
        <div className="source-line"><span>Units: {Object.entries(weather.units).map(([key, unit]) => `${key} ${unit}`).join(' · ') || 'Provider defaults'}</span></div>
        <SourceLine provider={weather.provider} source={weather.source} observedAt={weather.freshness.observedAt} fetchedAt={weather.freshness.fetchedAt} status={weather.status} />
      </Panel>
      <Panel title="Hourly outlook" eyebrow="PROVIDER-RETURNED FORECAST">
        {weather.hourly.length ? <div className="table-wrap"><table className="data-table"><thead><tr><th>Time</th><th>Rain</th><th>Precipitation</th><th>Probability</th><th>Weather code</th></tr></thead><tbody>{weather.hourly.slice(0, 24).map((hour) => <tr key={hour.time}><td>{new Date(hour.time).toLocaleString()}</td><td>{hour.rainMm === null ? '—' : `${n(hour.rainMm)} mm`}</td><td>{hour.precipitationMm === null ? '—' : `${n(hour.precipitationMm)} mm`}</td><td>{hour.precipitationProbabilityPercent === null ? '—' : `${n(hour.precipitationProbabilityPercent, 0)}%`}</td><td>{hour.weatherCode ?? '—'}</td></tr>)}</tbody></table></div> : <DataUnavailable reason="The provider did not return hourly forecast values." />}
      </Panel>
      <Panel title="Air quality" eyebrow={air.provider.toUpperCase()}>
        {air.current ? <div className="grid grid-4">
          <MetricCard label="PM2.5" value={n(air.current.pm25)} unit="µg/m³" status={air.status} />
          <MetricCard label="PM10" value={n(air.current.pm10)} unit="µg/m³" status={air.status} />
          <MetricCard label="Ozone" value={n(air.current.ozone)} unit="µg/m³" status={air.status} />
          <MetricCard label="US AQI" value={n(air.current.usAqi, 0)} detail="US scale where supplied" status={air.status} />
        </div> : <DataUnavailable reason={air.error ?? 'No air-quality readings were returned.'} />}
        <p className="panel-note" style={{ marginTop: 13 }}>Forecast/model output is not a local regulatory monitor. The AQI field, when returned, is explicitly the US scale and may not match local categories.</p>
        <SourceLine provider={air.provider} source={air.source} observedAt={air.freshness.observedAt} fetchedAt={air.freshness.fetchedAt} status={air.status} />
      </Panel>
    </div>
  </>;
}
