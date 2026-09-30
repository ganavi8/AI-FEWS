import { useEffect, useState, type FormEvent } from 'react';
import { Activity, ExternalLink, Server, ShieldCheck } from 'lucide-react';
import { ErrorBanner, PageIntro, Panel, StatusBadge } from '../app/components.js';
import { api, ApiClientError, clearApiBaseUrl, getApiBaseUrl, isNativePlatform, setApiBaseUrl } from '../services/api.js';
import type { HealthResponse } from '../../shared/contracts.js';

export function SettingsPage() {
  const native = isNativePlatform();
  const [apiBase, setApiBase] = useState(() => getApiBaseUrl() ?? '');
  const [contact, setContact] = useState('NOT CONFIGURED');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { let active = true; void api.publicConfig().then((result) => { if (active) setContact(result.supportContact); }).catch(() => undefined); return () => { active = false; }; }, []);
  async function saveBase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(null); setMessage(null);
    try { const saved = setApiBaseUrl(apiBase); setApiBase(saved); setMessage('HTTPS API origin saved on this device. Use Test connection to verify readiness.'); }
    catch (cause) { setError(cause instanceof ApiClientError ? cause.message : 'The API origin could not be saved.'); }
  }
  async function clearBase() { clearApiBaseUrl(); setApiBase(''); setHealth(null); setMessage('Device API origin removed. The next native API request will require a configured HTTPS origin.'); }
  async function testConnection() {
    setBusy(true); setError(null); setMessage(null); setHealth(null);
    try { const result = await api.health(); setHealth(result); if (result.status !== 'READY') setError('The server is reachable, but database migrations/readiness are not complete.'); }
    catch (cause) { setError(cause instanceof ApiClientError ? `${cause.message}${cause.status ? ` (HTTP ${cause.status})` : ''}` : 'Connection failed.'); }
    finally { setBusy(false); }
  }

  return <>
    <PageIntro eyebrow="SETTINGS / DEVICE CONNECTION" title="Settings" description="The website uses its own origin for API calls. A packaged Android build needs the owner to enter its published HTTPS API origin; it is never baked into app assets by this screen." />
    {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
    {message && <div className="success-banner" role="status"><ShieldCheck size={15} />{message}</div>}
    <div className="dashboard-grid">
      <Panel title="API connection" eyebrow={native ? 'NATIVE APP' : 'WEB / SAME-ORIGIN'}>
        {!native ? <><div className="inline-info"><Server size={15} />The browser uses {typeof window !== 'undefined' ? window.location.origin : 'this site'} for API requests; no separate URL or credential is needed.</div><div className="form-actions"><button type="button" className="button button-secondary" onClick={() => void testConnection()} disabled={busy}><Activity size={14} />{busy ? 'Checking…' : 'Test database readiness'}</button></div></>
          : <><form onSubmit={(event) => void saveBase(event)}><div className="field"><label htmlFor="api-base">Published AI·FEWS HTTPS origin</label><input className="input" type="url" inputMode="url" id="api-base" placeholder="https://your-published-site.example" value={apiBase} onChange={(event) => setApiBase(event.target.value)} required aria-describedby="api-help" /><span className="field-hint" id="api-help">Must be an HTTPS origin without a path, query, credentials or fragment. It is saved only on this device.</span></div><div className="form-actions"><button className="button button-primary" type="submit">Save API origin</button><button className="button button-secondary" type="button" onClick={() => void testConnection()} disabled={busy}>{busy ? 'Checking…' : 'Test readiness'}</button><button className="button button-danger" type="button" onClick={() => void clearBase()}>Remove</button></div></form><div className="inline-info" style={{ marginTop: 14 }}><ShieldCheck size={15} />Requests send an anonymous installation key. No database DSN, moderation token or provider secret is stored in the Android client.</div></>}
      </Panel>
      <Panel title="System readiness" eyebrow="LIVE HEALTH CHECK">
        {health ? <><div className="provider-head"><strong>{health.service}</strong><StatusBadge status={health.status === 'READY' ? 'LIVE' : 'ERROR'} /></div><dl className="key-value"><dt>Checked</dt><dd>{new Date(health.checkedAt).toLocaleString()}</dd><dt>Database</dt><dd>{health.database.configured ? health.database.ready ? 'Configured and ready' : 'Configured but not ready' : 'Not configured'} </dd><dt>Migrations</dt><dd>{health.migrations.ready ? 'Applied and verified' : 'Not verified'}</dd></dl></>
          : <div className="empty-state"><div className="empty-icon"><Activity size={19} /></div><h3>Readiness has not been checked</h3><p>Run a health check. The server returns READY only after MySQL is reachable and migrations are verified.</p></div>}
        <button type="button" className="button button-secondary button-compact" style={{ marginTop: 12 }} onClick={() => void testConnection()} disabled={busy}><Activity size={13} />{busy ? 'Checking…' : 'Check now'}</button>
      </Panel>
    </div>
    <Panel title="Support contact" eyebrow="PUBLIC PROJECT CONFIGURATION">
      <div className="support-contact"><strong>{contact}</strong><span>{contact === 'NOT CONFIGURED' ? 'No support contact has been supplied for this project.' : 'Public project support information.'}</span></div>
      {contact.startsWith('https://') && <a className="button-link" href={contact} target="_blank" rel="noreferrer">Open contact page <ExternalLink size={12} /></a>}
      {contact.includes('@') && <a className="button-link" href={`mailto:${contact}`}>Email support <ExternalLink size={12} /></a>}
    </Panel>
    <p className="panel-note">Data-source availability and limitations are listed in <a href="/data-quality">Data Quality & Sources</a>. Browser notification, location and storage permissions are managed by your browser/device settings.</p>
  </>;
}
