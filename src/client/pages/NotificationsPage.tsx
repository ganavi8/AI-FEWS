import { useEffect, useState } from 'react';
import { Bell, BellRing, Check, Settings2 } from 'lucide-react';
import type { Alert, NotificationPreferences } from '../../shared/contracts.js';
import { PageIntro, Panel, StatusBadge, ErrorBanner } from '../app/components.js';
import { api, ApiClientError, isNativePlatform } from '../services/api.js';
import { requestNotificationPermission } from '../services/notifications.js';

const defaults: NotificationPreferences = { heavyRain: false, highRisk: false, environmental: false, communitySystem: false, officialWarnings: false };
const localOptInKey = 'aifews.pref.notificationsEnabled';

export function NotificationsPage() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(defaults);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [deviceEnabled, setDeviceEnabled] = useState(false);
  const [permission, setPermission] = useState('Not requested');
  const [delivery, setDelivery] = useState('IN_APP_ON_REFRESH');
  const [pushConfigured, setPushConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    try { if (localStorage.getItem(localOptInKey) === 'true') setDeviceEnabled(true); } catch { /* storage is optional */ }
    void api.notifications().then((response) => {
      if (!active) return;
      setPreferences(response.preferences); setAlerts(response.alerts.filter((alert) => alert.persisted));
      setDelivery(response.delivery); setPushConfigured(response.pushConfigured);
    }).catch((cause) => { if (active) setError(cause instanceof ApiClientError ? cause.message : 'Server notification preferences are unavailable.'); });
    return () => { active = false; };
  }, []);

  async function enableDevice() {
    setError(null); setMessage(null);
    const granted = await requestNotificationPermission();
    if (!granted) { setDeviceEnabled(false); setPermission('Permission not granted'); try { localStorage.setItem(localOptInKey, 'false'); } catch { /* optional */ } return; }
    setDeviceEnabled(true); setPermission('Granted for this browser/device');
    try { localStorage.setItem(localOptInKey, 'true'); } catch { setError('Permission is granted, but the local opt-in preference could not be stored.'); }
  }

  function disableDevice() {
    setDeviceEnabled(false); setMessage('AI·FEWS will stop showing local notifications on this device. Device permission itself is managed in browser or Android settings.');
    try { localStorage.setItem(localOptInKey, 'false'); } catch { /* optional */ }
  }

  async function savePreferences() {
    setSaving(true); setError(null); setMessage(null);
    try {
      const response = await api.setNotificationPreferences(preferences);
      setPreferences(response.preferences); setDelivery(response.delivery); setPushConfigured(response.pushConfigured);
      setMessage('Preferences saved for this anonymous installation. New alert records are checked when you explicitly refresh an area.');
    } catch (cause) { setError(cause instanceof ApiClientError ? cause.message : 'Preferences were not saved.'); }
    finally { setSaving(false); }
  }

  const controls: Array<{ key: keyof NotificationPreferences; label: string; detail: string }> = [
    { key: 'heavyRain', label: 'Heavy-rain alerts', detail: 'Server-persisted heavy rainfall assessments.' },
    { key: 'highRisk', label: 'High-risk screening', detail: 'Persisted high or very-high heuristic assessments.' },
    { key: 'environmental', label: 'Environmental alerts', detail: 'Alert types returned by the server model.' },
    { key: 'communitySystem', label: 'Community/system notices', detail: 'No community or moderation push-notice delivery is configured.' },
    { key: 'officialWarnings', label: 'Official warnings', detail: 'Configured official-source warnings, clearly separated from AI-derived alerts.' },
 ];

  return <>
    <PageIntro eyebrow="PREFERENCES / USER CONTROL" title="Notifications" description="Device permission and server-side alert preferences are separate choices. No permission prompt runs on page load, and no background push service is configured." />
    {error && <ErrorBanner message={error} />}
    {message && <div className="success-banner" role="status"><Check size={15} /><span>{message}</span></div>}
    <div className="dashboard-grid">
      <Panel title="Device permission" eyebrow="EXPLICIT OPT-IN">
        <div className="notification-status"><BellRing size={19} /><div><strong>{deviceEnabled ? 'Enabled by this app' : 'Not enabled by this app'}</strong><span>{isNativePlatform() ? 'Android local notification permission is requested only when you press Enable.' : 'Browser notification permission is requested only when you press Enable.'}</span></div><StatusBadge status={deviceEnabled ? 'LIVE' : 'UNAVAILABLE'} /></div>
        <p className="panel-note" style={{ marginTop: 13 }}>Permission state: {permission}{!isNativePlatform() && ' (the browser may also report permission under its site settings).'}</p>
        <div className="form-actions">{deviceEnabled ? <button className="button button-secondary" type="button" onClick={disableDevice}><Bell size={14} />Disable in AI·FEWS</button> : <button className="button button-primary" type="button" onClick={() => void enableDevice()}><Bell size={14} />Enable device notifications</button>}</div>
        <p className="field-hint" style={{ marginTop: 9 }}>This local opt-in does not subscribe to push. Delivery is best-effort and occurs only when a persisted new alert is encountered during an explicit refresh while the app is open.</p>
      </Panel>
      <Panel title="Server preferences" eyebrow="PER-INSTALLATION SETTINGS">
        <p className="panel-note">Choose which server-identified alert categories are eligible for in-app-on-refresh/device-local display. Push/off-session delivery is not enabled.</p>
        {controls.map((control) => <label className="switch-row" key={control.key}><span className="switch-copy"><strong>{control.label}</strong><span>{control.detail}</span></span><input className="switch-control" type="checkbox" checked={preferences[control.key]} onChange={(event) => setPreferences((current) => ({ ...current, [control.key]: event.target.checked }))} aria-label={control.label} /></label>)}
        <div className="form-actions"><button type="button" className="button button-secondary" onClick={() => void savePreferences()} disabled={saving}><Settings2 size={14} />{saving ? 'Saving…' : 'Save preferences'}</button></div>
      </Panel>
    </div>
    <Panel title="Latest stored alerts" eyebrow="NO OFF-SESSION DELIVERY" className="notification-alerts">
      <div className="inline-info"><Bell size={15} />Push configured: {pushConfigured ? 'YES' : 'NO'} · Current delivery mode: {delivery}.</div>
      {alerts.length ? <div className="alert-list" style={{ marginTop: 12 }}>{alerts.slice(0, 10).map((alert) => <article className="alert-card" key={alert.id}><div className="alert-card-head"><strong>{alert.type.replaceAll('_', ' ')}</strong><span className="small-mono">{alert.severity}</span></div><p style={{ marginTop: 8 }}>{alert.reason}</p><div className="alert-meta">{new Date(alert.createdAt).toLocaleString()} · {alert.locationName ?? 'Saved location'}</div></article>)}</div> : <p className="panel-note" style={{ marginTop: 11 }}>No persisted alert records were returned. This is not an all-clear and no push subscription is active.</p>}
    </Panel>
  </>;
}





