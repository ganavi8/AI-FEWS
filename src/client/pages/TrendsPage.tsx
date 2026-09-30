import { useEffect, useState } from 'react';
import { Activity, ChartNoAxesColumnIncreasing, Clock3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { TrendPoint } from '../../shared/contracts.js';
import { useLocationData } from '../app/LocationContext.js';
import { DataUnavailable, EmptyState, ErrorBanner, PageIntro, Panel } from '../app/components.js';
import { api, ApiClientError } from '../services/api.js';

function TrendChart({ points, title, unit, valueOf }: { points: TrendPoint[]; title: string; unit: string; valueOf: (point: TrendPoint) => number | null }) {
  const values = points.map(valueOf).filter((value): value is number => value !== null && Number.isFinite(value));
  if (!points.length || !values.length) return <Panel title={title}><DataUnavailable reason="No persisted measurements of this type are available yet." /></Panel>;
  const min = Math.min(0, ...values); const max = Math.max(...values); const range = Math.max(0.001, max - min);
  return <Panel title={title} eyebrow="ACTUALLY PERSISTED SAMPLES">
    <div className="chart-bars" role="img" aria-label={`${title}, ${points.length} actual saved observations`}>
      {points.map((point) => {
        const value = valueOf(point);
        const height = value === null ? 0 : Math.max(3, Math.round(((value - min) / range) * 78));
        return <div className="chart-column" key={point.capturedAt}>
          <strong>{value === null ? '—' : value.toFixed(1)}</strong>
          <span className="chart-track"><span className="chart-bar" style={{ height: `${height}px`, opacity: value === null ? 0.15 : 1 }} /></span>
          <small>{new Date(point.capturedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</small>
        </div>;
      })}
    </div><div className="forecast-summary"><span>{points.length} saved samples</span><span>Units: {unit}</span><span>Source per sample shown below</span></div>
  </Panel>;
}

export function TrendsPage() {
  const { selected, savedLocations, loadSavedLocation } = useLocationData();
  const selectedId = selected?.id ?? null;
  const [points, setPoints] = useState<TrendPoint[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!selectedId) { setPoints([]); setNote('History is retained only for a place you explicitly saved.'); return () => { active = false; }; }
    setBusy(true); setError(null);
    void api.trends(selectedId).then((response) => {
      if (active) { setPoints(response.points.slice().reverse()); setNote(response.note); }
    }).catch((cause) => { if (active) { setPoints([]); setError(cause instanceof ApiClientError ? cause.message : 'Saved history is unavailable.'); } })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [selectedId]);

  return <>
    <PageIntro eyebrow="HISTORY / REAL OBSERVATIONS" title="Trends" description="Provider observations recorded only after an explicit assessment of a saved place. There is no fabricated historical flood or risk dataset." />
    {error && <ErrorBanner message={error} />}
    {!selectedId || !selected ? <Panel title="Choose a saved place" eyebrow="OPT-IN HISTORY"><EmptyState icon={<Activity size={19} />} title="No saved place is selected" message="Save a place and open it before creating any environmental trend history. Unnamed coordinate lookups are not stored on the server." action={savedLocations.length ? <div className="saved-place-list">{savedLocations.map((place) => <button className="button button-secondary" type="button" key={place.id} onClick={() => void loadSavedLocation(place.id)}>{place.name}</button>)}</div> : <Link className="button button-primary" to="/location">Choose a location</Link>} /></Panel>
      : <>
        <div className="location-strip"><Clock3 className="location-strip-pin" size={16} /><div><strong>{selected.name ?? 'Saved place'}</strong><span>{selected.coordinates.latitude.toFixed(4)}, {selected.coordinates.longitude.toFixed(4)}</span></div><span className="field-hint">{busy ? 'Loading actual history…' : `${points.length} stored points`}</span></div>
        {note && <div className="inline-info" style={{ margin: '12px 0' }}><ChartNoAxesColumnIncreasing size={15} />{note}</div>}
        {points.length ? <div className="stack">
          <TrendChart points={points} title="Precipitation" unit="mm" valueOf={(point) => point.precipitationMm} />
          <TrendChart points={points} title="Temperature" unit="°C" valueOf={(point) => point.temperatureC} />
          <TrendChart points={points} title="PM2.5" unit="µg/m³" valueOf={(point) => point.pm25} />
          <Panel title="Persisted source and risk state" eyebrow="ASSESSMENT HISTORY"><div className="table-wrap"><table className="data-table"><thead><tr><th>Captured</th><th>Screen</th><th>Score</th><th>Source</th></tr></thead><tbody>{points.map((point) => <tr key={point.capturedAt}><td>{new Date(point.capturedAt).toLocaleString()}</td><td>{point.riskLevel}</td><td>{point.riskScore === null ? 'Not available' : `${point.riskScore}/100`}</td><td>{point.source}</td></tr>)}</tbody></table></div></Panel>
        </div> : <Panel title="No observations recorded yet" eyebrow="NO SEED DATA"><EmptyState title={busy ? 'Loading stored samples' : 'History starts with real saved-place assessments'} message={busy ? 'Retrieving this place’s retained server record.' : 'Refresh the selected saved place while connected to store its returned provider observations. No values are backfilled or simulated.'} action={<button className="button button-secondary" onClick={() => void loadSavedLocation(selectedId)} disabled={busy}>Assess saved place</button>} /></Panel>}
      </>}
  </>;
}
