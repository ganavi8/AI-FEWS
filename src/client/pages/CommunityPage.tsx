import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CloudUpload, MessageSquareWarning, RefreshCw, ShieldCheck, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ReportCategorySchema, type ReportCategory } from '../../shared/contracts.js';
import { useLocationData } from '../app/LocationContext.js';
import { ErrorBanner, OfflineNote, PageIntro, Panel, StatusBadge } from '../app/components.js';
import { listLocalReports, queueReport, syncQueuedReports, type LocalReport } from '../services/offline.js';

function moderationLabel(report: LocalReport): string {
  return report.serverReport?.moderationStatus ?? (report.status === 'SYNCED' ? 'PENDING_REVIEW' : 'NOT SUBMITTED');
}

export function CommunityPage() {
  const { selected, online } = useLocationData();
  const [category, setCategory] = useState<ReportCategory>('FLOODING');
  const [description, setDescription] = useState('');
  const [reports, setReports] = useState<LocalReport[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadLocal = useCallback(async () => { try { setReports(await listLocalReports()); } catch { setReports([]); } }, []);
  useEffect(() => {
    void loadLocal();
    const sync = () => { void syncQueuedReports(true).then(setReports).catch(() => undefined); };
    window.addEventListener('online', sync);
    if (online) sync();
    return () => window.removeEventListener('online', sync);
  }, [loadLocal, online]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setMessage(null);
    if (!selected) { setError('Choose the report location explicitly before sharing coordinates.'); return; }
    if (description.trim().length < 3 || description.trim().length > 500) { setError('Report details must be between 3 and 500 characters.'); return; }
    setBusy(true);
    try {
      await queueReport({
        category, description: description.trim(), latitude: selected.coordinates.latitude,
        longitude: selected.coordinates.longitude, createdAt: new Date().toISOString(),
      });
      setDescription(''); setMessage(online
        ? 'Report saved to this device. It will show SYNCED only after the server confirms receipt; moderation is separate.'
        : 'Report saved on this device as PENDING SYNC. It will be retried when connectivity returns.');
      const updated = await listLocalReports(); setReports(updated);
      if (online) { setReports(await syncQueuedReports(true)); }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The report could not be queued locally.'); }
    finally { setBusy(false); }
  }

  async function retrySync() {
    setBusy(true); setError(null);
    try { setReports(await syncQueuedReports(online)); }
    catch { setError('The queue could not be read or synced. Reports remain stored locally where browser storage is available.'); }
    finally { setBusy(false); }
  }

  return <>
    <PageIntro eyebrow="COMMUNITY / USER-SUBMITTED" title="Community reports" description="Share a time-stamped field observation. Reports are never official alerts, are not published until verified by moderation, and may be queued locally while offline." action={<button className="button button-secondary" type="button" onClick={() => void retrySync()} disabled={!online || busy}><RefreshCw size={14} />{busy ? 'Working…' : online ? 'Sync queued reports' : 'Offline'}</button>} />
    {!selected && <div className="inline-info" style={{ marginBottom: 14 }}><MessageSquareWarning size={15} />No location is selected. Choose the report coordinates deliberately; this form never requests location permission.<Link to="/location">Choose area</Link></div>}
    {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
    {message && <div className="success-banner" role="status"><ShieldCheck size={15} /><span>{message}</span></div>}
    <div className="dashboard-grid">
      <Panel title="Submit an observation" eyebrow="EXPLICIT COMMUNITY CONTRIBUTION">
        <form onSubmit={(event) => void handleSubmit(event)}>
          <div className="field"><label htmlFor="report-category">Observation type</label><select id="report-category" className="select" value={category} onChange={(event) => setCategory(ReportCategorySchema.parse(event.target.value))}>{ReportCategorySchema.options.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}</select></div>
          <div className="field" style={{ marginTop: 13 }}><label htmlFor="report-description">What did you observe?</label><textarea id="report-description" className="textarea" maxLength={500} minLength={3} required placeholder="Describe the observed condition; do not include personal contact details." value={description} onChange={(event) => setDescription(event.target.value)} aria-describedby="report-limits" /><span className="field-hint" id="report-limits">3–500 characters · {description.length}/500 · Do not include names, addresses or phone numbers.</span></div>
          <div className="inline-info" style={{ marginTop: 13 }}><WifiOff size={15} /><span>Coordinates: {selected ? `${selected.coordinates.latitude.toFixed(5)}, ${selected.coordinates.longitude.toFixed(5)}` : 'Not selected'}. Submitting transmits this location with the report when online. Offline, the report remains on this device.</span></div>
          <div className="form-actions"><button className="button button-primary" type="submit" disabled={busy || !selected}><CloudUpload size={15} />{busy ? 'Saving…' : online ? 'Queue & submit report' : 'Save offline report'}</button></div>
        </form>
      </Panel>
      <Panel title="Provenance and review" eyebrow="NOT AN OFFICIAL WARNING">
        <ul className="rule-list"><li><ShieldCheck size={14} />Every record carries the COMMUNITY GENERATED status and has independent sync and moderation states.</li><li><ShieldCheck size={14} />Server receipt changes the local sync state to SYNCED; a retry after uncertain delivery uses the same client ID.</li><li><ShieldCheck size={14} />Only server-verified reports appear on the public community map. Submission alone does not publish a marker.</li><li><ShieldCheck size={14} />Do not use community reports in place of official forecasts or emergency guidance.</li></ul>
        {!online && <OfflineNote message="Offline reports are queued locally. They are not on the server or public map until server confirmation and later moderation." />}
      </Panel>
    </div>
    <Panel title="This installation's report queue" eyebrow="LOCAL SYNC STATE" className="reports-panel">
      {reports.length ? <div className="saved-place-list">{reports.map((report) => <article className="saved-place report-queue-item" key={report.clientId}>
        <div className="saved-place-main"><strong>{report.category.replaceAll('_', ' ')} · {new Date(report.createdAt).toLocaleString()}</strong><span>{report.description} · {report.latitude.toFixed(4)}, {report.longitude.toFixed(4)}</span><span className="report-state">Community: COMMUNITY GENERATED · Sync: <StatusBadge status={report.status} /> · Moderation: {moderationLabel(report)}</span>{report.lastSyncMessage && <span className="form-error">{report.lastSyncMessage}</span>}</div>
      </article>)}</div> : <div className="empty-state"><div className="empty-icon"><MessageSquareWarning size={19} /></div><h3>No reports on this device</h3><p>Queued report records and their sync status appear here. Clearing local data removes unsynced reports from this device.</p></div>}
    </Panel>
  </>;
}
