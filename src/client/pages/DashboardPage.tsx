import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, CloudRain, Droplets, ExternalLink, Gauge, MapPin, Wind } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Alert } from '../../shared/contracts.js';
import { useLocationData } from '../app/LocationContext.js';
import { DataUnavailable, EmptyState, MetricCard, PageIntro, Panel, RiskBadge, SourceLine, StatusBadge } from '../app/components.js';
import { api } from '../services/api.js';

function value(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}

function ForecastBars() {
  const { environment } = useLocationData();
  const hours = (environment?.weather.hourly ?? []).slice(0, 12);
  if (!hours.length) return <DataUnavailable reason="No hourly precipitation values were returned by the selected source." />;
  const peak = Math.max(0.1, ...hours.map((hour) => hour.precipitationMm ?? 0));
  return <>
    <div className="forecast-bars" role="img" aria-label="Provider-returned precipitation forecast for the next twelve hours">
      {hours.map((hour) => {
        const rainfall = hour.precipitationMm;
        const height = rainfall === null ? 0 : Math.max(3, Math.round((rainfall / peak) * 70));
        return <div className="forecast-column" key={hour.time}>
          <strong>{rainfall === null ? '—' : value(rainfall)}</strong>
          <span className="forecast-bar-track"><span className="forecast-bar" style={{ height: `${height}px`, opacity: rainfall === null ? 0.25 : 1 }} /></span>
          <small>{new Date(hour.time).toLocaleTimeString([], { hour: '2-digit' })}</small>
        </div>;
      })}
    </div>
    <div className="forecast-summary"><span>Hourly provider data</span><span>Rainfall in mm</span></div>
  </>;
}

function AlertsPreview({ locationId }: { locationId: string | null }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void api.alerts().then((result) => { if (active) setAlerts(result.alerts.filter((item) => item.persisted)); })
      .catch(() => { if (active) setAlerts([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [locationId]);

  const locationAlerts = locationId ? alerts.filter((alert) => alert.locationId === locationId).slice(0, 2) : [];
  return <Panel title="Stored alerts" eyebrow="SERVER-ASSESSED" action={<Link className="button-link" to="/alerts">All alerts <ArrowRight size={13} /></Link>}>
    {!locationId ? <EmptyState icon={<AlertTriangle size={19} />} title="Save this place to retain alerts" message="Alerts are generated from explicit assessments of saved locations. No unsaved place or default location is monitored." />
      : loading ? <div className="loading-line">Loading persisted alerts…</div>
        : locationAlerts.length ? <div className="stack">{locationAlerts.map((alert) => <article className={`alert-card severity-${alert.severity.toLowerCase()}`} key={alert.id}>
          <div className="alert-card-head"><RiskBadge risk={alert.severity === 'HIGH' ? 'VERY_HIGH' : alert.severity === 'WARNING' ? 'HIGH' : alert.severity === 'WATCH' ? 'MODERATE' : 'LOW'} /><StatusBadge status={alert.persisted ? 'LIVE' : 'CACHED'} /></div>
          <h3>{alert.type.replaceAll('_', ' ')}</h3><p>{alert.reason}</p>
          <div className="alert-meta"><span>{alert.locationName ?? 'Saved location'}</span><span>{new Date(alert.createdAt).toLocaleString()}</span></div>
        </article>)}</div>
          : <EmptyState icon={<AlertTriangle size={19} />} title="No stored alert for this place" message="This is not an all-clear or a finding that no hazard exists. Use official local warnings and guidance." />}
  </Panel>;
}

export function DashboardPage() {
  const { selected, environment, loading, error, clearError, refresh } = useLocationData();
  if (!selected || !environment) {
    return <>
      <PageIntro eyebrow="AI·FEWS / OVERVIEW" title="Environmental intelligence" description="A source-transparent view of weather, air quality and rule-based rainfall screening for a place you choose." />
      {error && <div className="error-banner" role="alert"><AlertTriangle size={16} /><p>{error}</p><button className="button-link" onClick={clearError}>Dismiss</button></div>}
      <div className="dashboard-grid">
        <Panel title="Select an area to begin" eyebrow="LOCATION-CONSENT FIRST">
          <EmptyState icon={<Gauge size={19} />} title="No location has been requested" message="Choose Use my location for a one-time browser/device reading, or enter latitude and longitude yourself. AI·FEWS does not select a default city." action={<Link to="/location" className="button button-primary">Choose a location</Link>} />
        </Panel>
        <Panel title="How this workspace works" eyebrow="TRANSPARENT BY DESIGN">
          <ul className="rule-list">
            <li><CloudRain size={15} />Weather and air-quality data are requested from named providers after you choose a location.</li>
            <li><Gauge size={15} />Flood screening is a transparent heuristic—not a calibrated probability or official warning.</li>
            <li><Wind size={15} />Source status and timestamps stay visible. Missing provider or terrain data are not filled with estimates.</li>
          </ul>
        </Panel>
      </div>
    </>;
  }

  const weather = environment.weather;
  const air = environment.airQuality;
  const current = weather.current;
  const rainfall = current?.rainMm ?? current?.precipitationMm ?? null;
  const savedLocationId = selected.id;
  const weatherObserved = weather.freshness.observedAt;
  const airObserved = air.freshness.observedAt;

  return <>
    <PageIntro eyebrow="AI·FEWS / OVERVIEW" title="Environmental intelligence" description="A current provider snapshot and screening assessment for the selected area. No default area or unverified measurement is substituted." action={<button type="button" className="button button-secondary" onClick={() => void refresh()} disabled={loading}>{loading ? 'Updating…' : 'Refresh snapshot'}</button>} />
    {error && <div className="error-banner" role="alert"><AlertTriangle size={16} /><p>{error}</p><button className="button-link" onClick={clearError}>Dismiss</button></div>}
    <div className="location-strip"><MapPin className="location-strip-pin" size={16} /><div><strong>{environment.locationName ?? selected.name ?? 'Selected coordinates'}</strong><span>{selected.coordinates.latitude.toFixed(4)}, {selected.coordinates.longitude.toFixed(4)} · {selected.method.toUpperCase()}</span></div><StatusBadge status={environment.status} /><span className="location-strip-time">Fetched {new Date(environment.fetchedAt).toLocaleString()}</span></div>
    <div className="grid grid-4 dashboard-metrics">
      <MetricCard label="Air temperature" value={value(current?.temperatureC)} unit="°C" detail="Current provider value" status={weather.status} icon={<Wind size={17} />} />
      <MetricCard label="Precipitation now" value={value(rainfall)} unit="mm" detail="Current interval" status={weather.status} icon={<CloudRain size={17} />} tone="cyan" />
      <MetricCard label="PM2.5" value={value(air.current?.pm25, 1)} unit="µg/m³" detail="Air-quality model" status={air.status} icon={<Droplets size={17} />} />
      <article className="metric-card metric-amber"><div className="metric-top"><span className="eyebrow">RAINFALL SCREEN</span><Gauge size={16} className="metric-icon" /></div><div style={{ margin: '14px 0 10px' }}><RiskBadge risk={environment.risk.riskLevel} /></div><div className="metric-bottom"><span>Not calibrated probability</span><StatusBadge status={environment.risk.riskLevel === 'UNKNOWN' ? 'UNAVAILABLE' : environment.status} /></div></article>
    </div>
    <div className="dashboard-grid dashboard-content-grid">
      <div className="stack">
        <Panel title="Hourly precipitation" eyebrow="PROVIDER FORECAST · NEXT 12 HOURS" action={<a className="button-link" href={weather.source} target="_blank" rel="noreferrer">Open source <ExternalLink size={12} /></a>}>
          <ForecastBars />
          <SourceLine provider={weather.provider} source={weather.source} observedAt={weatherObserved} fetchedAt={weather.freshness.fetchedAt} status={weather.status} />
        </Panel>
        <AlertsPreview locationId={savedLocationId} />
      </div>
      <div className="stack">
        <Panel title="Screening summary" eyebrow={`MODEL · ${environment.risk.model}`}>
          <div className="risk-summary"><RiskBadge risk={environment.risk.riskLevel} /><p>{environment.risk.explanation}</p></div>
          <dl className="key-value"><dt>Screen score</dt><dd>{environment.risk.score === null ? 'Not available' : `${environment.risk.score}/100 (heuristic)`}</dd><dt>Flood probability</dt><dd>Not estimated by this model</dd><dt>Confidence</dt><dd>Not calibrated</dd><dt>Uncertainty</dt><dd>Not calibrated</dd><dt>Saved history</dt><dd>{environment.risk.persisted ? 'Recorded for this saved place' : 'Not recorded as a server trend'}</dd></dl>
          <Link className="button button-secondary button-compact" to="/risk" style={{ marginTop: 13 }}>Review method <ArrowRight size={13} /></Link>
        </Panel>
        <Panel title="Air quality" eyebrow={air.provider.toUpperCase()}>
          <div className="grid grid-2">
            <MetricCard label="PM10" value={value(air.current?.pm10, 1)} unit="µg/m³" status={air.status} />
            <MetricCard label="Ozone" value={value(air.current?.ozone, 1)} unit="µg/m³" status={air.status} />
            <MetricCard label="US AQI" value={value(air.current?.usAqi, 0)} detail="US scale, if returned" status={air.status} />
            <MetricCard label="Humidity" value={value(current?.humidityPercent, 0)} unit="%" status={weather.status} />
          </div>
          <SourceLine provider={air.provider} source={air.source} observedAt={airObserved} fetchedAt={air.freshness.fetchedAt} status={air.status} />
        </Panel>
      </div>
    </div>
    <p className="disclaimer-line"><AlertTriangle size={14} />AI·FEWS is decision support only. It is not a calibrated flood forecast or official alert. Follow current local emergency instructions.</p>
  </>;
}
