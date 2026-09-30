import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Clock3, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Alert } from '../../shared/contracts.js';
import { EmptyState, ErrorBanner, PageIntro, Panel, RiskBadge, StatusBadge } from '../app/components.js';
import { useLocationData } from '../app/LocationContext.js';
import { api, ApiClientError } from '../services/api.js';

export function AlertsPage() {
  const { savedLocations } = useLocationData();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try { setAlerts((await api.alerts()).alerts.filter((alert) => alert.persisted)); }
    catch (cause) { setAlerts([]); setError(cause instanceof ApiClientError ? cause.message : 'Stored alerts are not available.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const byLocation = new Map(savedLocations.map((place) => [place.id, place.name]));

  return <>
    <PageIntro eyebrow="MONITORING / PERSISTED RECORDS" title="Alerts" description="Server-generated assessments saved for this anonymous installation. New assessments run only when you explicitly refresh a saved location; no background monitoring or push service is configured." action={<button className="button button-secondary" onClick={() => void refresh()} disabled={loading}><RefreshCw size={14} />{loading ? 'Loading…' : 'Refresh list'}</button>} />
    {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
    <div className="inline-info"><AlertTriangle size={15} />An empty list is not an all-clear. It means there are no unexpired stored AI·FEWS alert records available to this installation.</div>
    {loading && !alerts.length ? <div className="loading-line" style={{ marginTop: 16 }}>Loading saved alert records…</div>
      : alerts.length ? <div className="alert-list" style={{ marginTop: 14 }}>{alerts.map((alert) => <article className={`alert-card severity-${alert.severity.toLowerCase()}`} key={alert.id}>
        <div className="alert-card-head"><RiskBadge risk={alert.severity === 'HIGH' ? 'VERY_HIGH' : alert.severity === 'WARNING' ? 'HIGH' : alert.severity === 'WATCH' ? 'MODERATE' : 'LOW'} /><StatusBadge status="LIVE" /><span className="alert-location">{byLocation.get(alert.locationId ?? '') ?? alert.locationName ?? 'Saved location'}</span></div>
        <h3>{alert.type.replaceAll('_', ' ')}</h3><p>{alert.reason}</p>
        <div className="alert-action"><strong>Suggested action</strong><span>{alert.recommendedAction}</span></div>
        <div className="alert-card-meta"><span><Clock3 size={13} />Created {new Date(alert.createdAt).toLocaleString()}</span><span>Expires {new Date(alert.expiresAt).toLocaleString()}</span><span>Source: {alert.source}</span></div>
      </article>)}</div>
        : <Panel title="No current stored alerts" eyebrow="NO BACKGROUND ALERTING">
          <EmptyState icon={<AlertTriangle size={20} />} title="No alert record is available" message="AI·FEWS does not continuously poll providers or deliver off-session alerts. Make an explicit assessment of a saved place to check the current server-side screening. This is not an official all-clear." action={<Link className="button button-primary" to="/location">Open Location</Link>} />
        </Panel>}
  </>;
}
