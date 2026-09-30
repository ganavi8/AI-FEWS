import { useState } from 'react';
import { ArrowRight, MapPin, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState, ErrorBanner, PageIntro, Panel, StatusBadge } from '../app/components.js';
import { useLocationData } from '../app/LocationContext.js';

export function SavedPlacesPage() {
  const { savedLocations, savedLocationStatus, selected, loading, loadSavedLocation, renameSavedLocation, deleteSavedLocation, reloadSavedLocations } = useLocationData();
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function rename(id: string) {
    setBusyId(id); setError(null); setMessage(null);
    try { await renameSavedLocation(id, name.trim()); setMessage('Saved place renamed.'); setEditing(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The saved place could not be renamed.'); }
    finally { setBusyId(null); }
  }
  async function remove(id: string, label: string) {
    const accepted = window.confirm(`Delete “${label}” from this installation's server-side saved places? Associated server trend/assessment history may also be removed. This cannot be undone.`);
    if (!accepted) return;
    setBusyId(id); setError(null); setMessage(null);
    try { await deleteSavedLocation(id); setMessage('Saved place and its associated server records were deleted. Local offline snapshots are managed separately in Privacy Center.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The saved place could not be deleted.'); }
    finally { setBusyId(null); }
  }

  return <>
    <PageIntro eyebrow="YOUR PLACES / PRIVATE OWNER KEY" title="Saved places" description="These records are private to this anonymous browser or Android installation. They do not provide an account or cross-device synchronization." action={<button className="button button-secondary" type="button" onClick={() => void reloadSavedLocations()}><RefreshCw size={14} />Refresh list</button>} />
    {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
    {message && <div className="success-banner" role="status">{message}</div>}
    <Panel title="Your saved areas" eyebrow="VOLUNTARILY STORED" action={<StatusBadge status={savedLocationStatus} />}>
      {savedLocations.length ? <div className="saved-place-list">{savedLocations.map((place) => <article className={`saved-place${selected?.id === place.id ? ' saved-place-active' : ''}`} key={place.id}>
        {editing === place.id ? <form className="rename-form" onSubmit={(event) => { event.preventDefault(); void rename(place.id); }}><label className="field"><span className="field-label">New place name</span><input autoFocus required maxLength={80} className="input" value={name} onChange={(event) => setName(event.target.value)} /></label><div className="saved-place-actions"><button type="submit" className="button button-primary button-compact" disabled={!name.trim() || busyId === place.id}>Save name</button><button type="button" className="button button-secondary button-compact" onClick={() => setEditing(null)}>Cancel</button></div></form>
          : <><div className="saved-place-main"><strong>{place.name}</strong><span><MapPin size={12} /> {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)} · Saved {new Date(place.createdAt).toLocaleDateString()}</span></div><div className="saved-place-actions"><button type="button" className="button button-primary button-compact" onClick={() => void loadSavedLocation(place.id)} disabled={loading}>{selected?.id === place.id ? 'Refresh area' : 'Open'}</button><button type="button" className="button button-secondary button-compact" onClick={() => { setEditing(place.id); setName(place.name); }}><Pencil size={13} />Rename</button><button type="button" className="button button-danger button-compact" onClick={() => void remove(place.id, place.name)} disabled={busyId === place.id}><Trash2 size={13} />Delete</button></div></>}
      </article>)}</div>
        : <EmptyState icon={<MapPin size={18} />} title="No saved places" message="Select coordinates and save them by name. Unsaved selections are not written to server-side history." action={<Link className="button button-primary" to="/location">Choose an area <ArrowRight size={13} /></Link>} />}
    </Panel>
    <Panel title="What saving means" eyebrow="DATA SCOPE" className="saved-place-info"><ul className="rule-list"><li>Saved place data includes a name and coordinates and is linked to an installation-scoped random owner key whose keyed hash is stored server-side.</li><li>It is not a user account. Clearing browser/app storage may make the server records inaccessible to this installation; manage data before removing app storage.</li><li>Deleting a saved place is a server-side action; any associated trends and alerts may be deleted with it.</li><li>Local snapshots and queued reports are separate and can be cleared in <Link to="/privacy">Privacy Center</Link>.</li></ul></Panel>
  </>;
}
