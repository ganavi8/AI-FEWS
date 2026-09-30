import { useState, type FormEvent } from 'react';
import { Crosshair, MapPin, PencilLine, Plus, Search, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LocationAccessError, requestOneShotLocation } from '../services/location.js';
import { useLocationData } from '../app/LocationContext.js';
import { EmptyState, ErrorBanner, PageIntro, Panel, StatusBadge } from '../app/components.js';

function validCoordinate(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

export function LocationPage() {
  const { selected, environment, savedLocations, savedLocationStatus, loading, error, clearError, loadCoordinates, loadSavedLocation, resolvePlaceName, saveCurrentLocation } = useLocationData();
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [placeBusy, setPlaceBusy] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);

  async function useCurrentLocation() {
    setGeoBusy(true); setFormError(null);
    try {
      const result = await requestOneShotLocation();
      setLatitude(result.coordinates.latitude.toFixed(6)); setLongitude(result.coordinates.longitude.toFixed(6));
      await loadCoordinates(result.coordinates, result.method);
    } catch (cause) {
      setFormError(cause instanceof LocationAccessError ? cause.message : 'A one-time location could not be read. Enter coordinates manually.');
    } finally { setGeoBusy(false); }
  }

  async function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFormError(null);
    const lat = Number(latitude); const lon = Number(longitude);
    if (!validCoordinate(lat, lon)) { setFormError('Latitude must be between -90 and 90; longitude must be between -180 and 180.'); return; }
    await loadCoordinates({ latitude: lat, longitude: lon }, 'manual');
  }

  async function resolveName() {
    setPlaceBusy(true); setSaveMessage(null);
    try {
      const name = await resolvePlaceName();
      if (name) { setSaveName(name.slice(0, 80)); setSaveMessage('Place name returned by OpenStreetMap Nominatim.'); }
    } finally { setPlaceBusy(false); }
  }

  async function savePlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaveMessage(null); setSaveBusy(true);
    try {
      const result = await saveCurrentLocation(saveName.trim());
      setSaveMessage(`“${result.name}” is saved to this anonymous installation.`);
    } catch (cause) {
      setSaveMessage(cause instanceof Error ? cause.message : 'This place could not be saved.');
    } finally { setSaveBusy(false); }
  }

  return <>
    <PageIntro eyebrow="LOCATION / USER CONTROL" title="Choose an area" description="Location is never requested automatically. Use a single device reading, enter coordinates, or open a place you explicitly saved." />
    {error && <ErrorBanner message={error} onDismiss={clearError} />}
    {formError && <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />}
    <div className="dashboard-grid location-layout">
      <div className="stack">
        <Panel title="Use this device" eyebrow="ONE-SHOT LOCATION">
          <p className="panel-note">Permission is requested only after you press this button. AI·FEWS performs one read and does not watch or track your location in the background.</p>
          <button type="button" className="button button-primary" onClick={() => void useCurrentLocation()} disabled={geoBusy || loading}>
            <Crosshair size={16} />{geoBusy ? 'Reading device location…' : 'Use my current location'}
          </button>
          <div className="privacy-inline"><ShieldCheck size={14} />Browser or Android consent is managed by your device. You can deny it and enter coordinates below.</div>
        </Panel>
        <Panel title="Enter coordinates" eyebrow="MANUAL INPUT">
          <form onSubmit={(event) => void submitManual(event)}>
            <div className="form-grid">
              <div className="field"><label htmlFor="latitude">Latitude</label><input id="latitude" className="input" type="number" min="-90" max="90" step="any" required inputMode="decimal" placeholder="e.g. 12.9716" value={latitude} onChange={(event) => { setLatitude(event.target.value); setFormError(null); }} aria-describedby="coordinate-rules" /></div>
              <div className="field"><label htmlFor="longitude">Longitude</label><input id="longitude" className="input" type="number" min="-180" max="180" step="any" required inputMode="decimal" placeholder="e.g. 77.5946" value={longitude} onChange={(event) => { setLongitude(event.target.value); setFormError(null); }} aria-describedby="coordinate-rules" /></div>
            </div>
            <div className="field-hint" id="coordinate-rules" style={{ marginTop: 8 }}>Latitude −90 to 90 · Longitude −180 to 180. Data is fetched only after you press Analyze area.</div>
            <div className="form-actions"><button className="button button-secondary" type="submit" disabled={loading}><Search size={15} />{loading ? 'Loading data…' : 'Analyze area'}</button></div>
          </form>
        </Panel>
        {selected && environment && <Panel title="Current selection" eyebrow="NOT SAVED UNLESS YOU CHOOSE">
          <dl className="key-value"><dt>Area</dt><dd>{selected.name ?? 'Coordinates only'}</dd><dt>Coordinates</dt><dd className="small-mono">{selected.coordinates.latitude.toFixed(5)}, {selected.coordinates.longitude.toFixed(5)}</dd><dt>Method</dt><dd>{selected.method}</dd><dt>Data state</dt><dd><StatusBadge status={environment.status} /></dd></dl>
          <div className="form-actions"><button type="button" className="button button-secondary" onClick={() => void resolveName()} disabled={placeBusy}><MapPin size={14} />{placeBusy ? 'Looking up…' : 'Resolve place name'}</button></div>
          <p className="field-hint" style={{ marginTop: 8 }}>Place-name lookup is a separate request to OpenStreetMap Nominatim. Weather loading does not trigger it.</p>
          <form onSubmit={(event) => void savePlace(event)} style={{ marginTop: 15 }}>
            <div className="field"><label htmlFor="saved-location-name">Save this place (optional)</label><input id="saved-location-name" className="input" maxLength={80} required placeholder="Give this area a name" value={saveName} onChange={(event) => setSaveName(event.target.value)} /></div>
            <div className="form-actions"><button className="button button-primary" type="submit" disabled={saveBusy || !saveName.trim()}><Plus size={15} />{saveBusy ? 'Saving…' : 'Save place'}</button>{selected.id && <span className="field-hint">Already saved · use <Link to="/saved">Saved places</Link> to manage it.</span>}</div>
          </form>
          {saveMessage && <div className="field-hint" role="status" style={{ marginTop: 9 }}>{saveMessage}</div>}
        </Panel>}
      </div>
      <Panel title="Saved places" eyebrow="PRIVATE TO THIS INSTALLATION" action={<StatusBadge status={savedLocationStatus} />}>
        <p className="panel-note">Saved places use an anonymous browser/app key—not an account and not cross-device sync.</p>
        {savedLocations.length ? <div className="saved-place-list">{savedLocations.map((place) => <article className="saved-place" key={place.id}>
          <div className="saved-place-main"><strong>{place.name}</strong><span>{place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}</span></div>
          <div className="saved-place-actions"><button type="button" className="button button-secondary button-compact" onClick={() => void loadSavedLocation(place.id)} disabled={loading}>Open</button><Link className="button button-secondary button-compact" to="/saved"><PencilLine size={13} />Manage</Link></div>
        </article>)}</div>
          : <EmptyState icon={<MapPin size={18} />} title="No saved places" message={savedLocationStatus === 'UNAVAILABLE' ? 'Saved places need an available server. Choose an area first, then explicitly save it.' : 'A saved place is only added after you name and save a location.'} />}
      </Panel>
    </div>
  </>;
}
