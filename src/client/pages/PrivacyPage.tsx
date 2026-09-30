import { useCallback, useEffect, useState } from 'react';
import { Database, Eraser, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageIntro, Panel } from '../app/components.js';
import { useLocationData } from '../app/LocationContext.js';
import { api } from '../services/api.js';
import { clearLocalData, countLocalSnapshots, hasOfflinePreparedness, listLocalReports } from '../services/offline.js';

export function PrivacyPage() {
  const { clearLocalState } = useLocationData();
  const [snapshots, setSnapshots] = useState(0);
  const [queuedReports, setQueuedReports] = useState(0);
  const [preparednessCached, setPreparednessCached] = useState(false);
  const [support, setSupport] = useState('NOT CONFIGURED');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refreshCounts = useCallback(async () => {
    const [snapshotCount, reports, guide] = await Promise.all([
      countLocalSnapshots().catch(() => 0), listLocalReports().catch(() => []), hasOfflinePreparedness().catch(() => false),
    ]);
    setSnapshots(snapshotCount); setQueuedReports(reports.filter((report) => report.status !== 'SYNCED').length); setPreparednessCached(guide);
  }, []);
  useEffect(() => {
    void refreshCounts(); void api.publicConfig().then((result) => setSupport(result.supportContact)).catch(() => undefined);
  }, [refreshCounts]);

  async function clearLocal() {
    const accepted = window.confirm('Clear this browser/app’s offline snapshots, queued local reports, cached preparedness guide, saved-place display cache and local preferences? This will not delete saved places, reports, alerts or notification preferences already stored on the server. Unsynced queued reports will be lost.');
    if (!accepted) return;
    setBusy(true); setMessage(null);
    try {
      clearLocalState();
      await clearLocalData();
      await refreshCounts();
      setMessage('Local offline data and local preferences were cleared. Server-side saved places, synced reports, alerts and preferences were not deleted.');
    } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Local data could not be fully cleared.'); }
    finally { setBusy(false); }
  }

  return <>
    <PageIntro eyebrow="YOUR DATA / PRIVACY CENTER" title="Privacy center" description="Review what AI·FEWS processes, where it is stored, which third parties receive requests, and what each deletion control does." />
    {message && <div className="success-banner" role="status"><ShieldCheck size={15} />{message}</div>}
    <Panel title="Privacy policy" eyebrow="PUBLIC NOTICE"><p>The standalone policy describes location, server processing, external providers, offline storage, retention and deletion. The operator identity and support contact remain unconfigured, so owner review is required before public distribution.</p><Link className="button button-secondary button-compact" to="/privacy-policy">Read the Privacy Policy</Link></Panel>
    <div className="grid grid-3 privacy-stat-grid"><div className="privacy-stat"><Database size={17} /><strong>{snapshots}</strong><span>local weather snapshots</span></div><div className="privacy-stat"><LockKeyhole size={17} /><strong>{queuedReports}</strong><span>local reports not confirmed synced</span></div><div className="privacy-stat"><ShieldCheck size={17} /><strong>{preparednessCached ? 'Available' : 'Not cached'}</strong><span>offline preparedness copy</span></div></div>
    <div className="stack" style={{ marginTop: 14 }}>
      <Panel title="Location and third-party requests" eyebrow="DATA FLOW"><ul className="rule-list"><li>Your browser/device location permission is requested only after you press the one-shot action. Manual coordinates are available without permission. No background location watcher is used.</li><li>After you choose an area, latitude/longitude is sent to the AI·FEWS server to request Open-Meteo forecast and air-quality values. Unnamed lookups are not stored in the server's saved-place trend history and raw coordinates are not written to request logs.</li><li>Reverse geocoding is a separate action. Only when you press Resolve place name are coordinates sent through the AI·FEWS server to OpenStreetMap Nominatim; requests are rate-limited and memory-cached.</li><li>Visible OpenStreetMap map tiles are requested directly from OpenStreetMap by your device and can reveal the tile area and network address to that provider. Only visible map tiles are requested; they are not stored offline.</li><li>When you submit a community report, its description, selected coordinates, category and timestamp are sent to the server, or stored locally in the offline queue until sync. Public visibility requires moderation verification.</li></ul></Panel>
      <Panel title="What is stored" eyebrow="RETENTION & ACCESS"><ul className="rule-list"><li>Saved place name/coordinates, explicit-observation trends, alerts and server notification preferences are stored for the anonymous installation key. The server stores a keyed hash, not the raw random owner key. This is not a login and does not sync across devices.</li><li>The local browser cache can contain weather snapshots, the preparedness guide and queued report descriptions/coordinates. These are stored in IndexedDB and are readable to this browser profile.</li><li>Server history is limited to 90 days in trend queries and older observations are pruned during the next assessment of that saved place. Reports older than 90 days are pruned on report-list requests; alerts more than 30 days past expiry are pruned on alert-list requests. No scheduled cleanup job is configured, so physical deletion can be delayed if those endpoints are not used. Ask the operator about a deletion request.</li><li>Notification preferences are server-side; device permission and local notification opt-in are device/browser state. Push/off-session delivery is not configured.</li><li>Support contact: <strong>{support}</strong>.</li></ul></Panel>
      <Panel title="Clear data" eyebrow="LOCAL CLEAR IS NOT SERVER DELETION"><p className="panel-note">This control clears local IndexedDB snapshots, queued reports and cached preparedness, local saved-place cache and local preferences. It cannot delete a server-saved place or remove already synced reports, history, alerts or server notification preferences. Manage a server-saved place separately in <Link to="/saved">Saved Places</Link>. Unsynced reports will be permanently removed from this device.</p><button type="button" className="button button-danger" onClick={() => void clearLocal()} disabled={busy}><Eraser size={15} />{busy ? 'Clearing…' : 'Clear local data & preferences'}</button><p className="field-hint" style={{ marginTop: 9 }}>A confirmation prompt names exactly which local records will be erased and which server records will remain.</p></Panel>
    </div>
  </>;
}
