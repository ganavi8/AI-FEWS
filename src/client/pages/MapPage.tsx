import { useEffect, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertTriangle, Layers3 } from 'lucide-react';
import type { CommunityReport } from '../../shared/contracts.js';
import { useLocationData } from '../app/LocationContext.js';
import { DataUnavailable, EmptyState, ErrorBanner, OfflineNote, PageIntro, Panel } from '../app/components.js';
import { api, ApiClientError } from '../services/api.js';

function Recenter({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => { map.setView([latitude, longitude], Math.max(map.getZoom(), 11), { animate: false }); }, [latitude, longitude, map]);
  return null;
}

export function MapPage() {
  const { selected, online } = useLocationData();
  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!selected) { setReports([]); return () => { active = false; }; }
    setBusy(true); setError(null);
    void api.communityReports(selected.coordinates.latitude, selected.coordinates.longitude, 15)
      .then((result) => { if (active) setReports(result.reports); })
      .catch((cause) => { if (active) { setReports([]); setError(cause instanceof ApiClientError ? cause.message : 'Verified reports are not available.'); } })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [selected?.coordinates.latitude, selected?.coordinates.longitude]);

  return <>
    <PageIntro eyebrow="COMMUNITY / MAP VIEW" title="Community map" description="Visible OpenStreetMap tiles with verified community-generated reports. This is not an official hazard map, and no tiles are prefetched or stored for offline use." />
    {error && <ErrorBanner message={error} />}
    {!selected ? <Panel title="Choose an area to center the map"><EmptyState icon={<Layers3 size={20} />} title="No coordinates selected" message="The map never chooses or requests a location automatically." /></Panel> : <>
      <div className="location-strip"><Layers3 className="location-strip-pin" size={16} /><div><strong>{selected.name ?? 'Selected coordinates'}</strong><span>{selected.coordinates.latitude.toFixed(5)}, {selected.coordinates.longitude.toFixed(5)} · 15 km report search radius</span></div><span className="field-hint">{busy ? 'Loading verified reports…' : `${reports.length} verified reports`}</span></div>
      <Panel title="Location and verified community reports" eyebrow="VISIBLE TILES ONLY">
        <div className="map-frame">
          <MapContainer center={[selected.coordinates.latitude, selected.coordinates.longitude]} zoom={11} scrollWheelZoom={false} aria-label="Map centered on the currently selected place">
            <Recenter latitude={selected.coordinates.latitude} longitude={selected.coordinates.longitude} />
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
            <CircleMarker center={[selected.coordinates.latitude, selected.coordinates.longitude]} radius={8} pathOptions={{ color: '#3fe0d4', fillColor: '#169c9c', fillOpacity: 0.75, weight: 2 }}>
              <Popup>Selected AI·FEWS area · {selected.coordinates.latitude.toFixed(5)}, {selected.coordinates.longitude.toFixed(5)}</Popup>
            </CircleMarker>
            {reports.map((report) => <CircleMarker key={report.id} center={[report.latitude, report.longitude]} radius={7} pathOptions={{ color: '#efba58', fillColor: '#c7892e', fillOpacity: 0.8, weight: 1.5 }}>
              <Popup><strong>COMMUNITY GENERATED · VERIFIED</strong><br />{report.category.replaceAll('_', ' ')}<br />{report.description}<br /><small>{new Date(report.createdAt).toLocaleString()}</small></Popup>
            </CircleMarker>)}
          </MapContainer>
        </div>
        <div className="map-legend" style={{ marginTop: 11 }}><span><i className="legend-dot" />Selected area</span><span><i className="legend-dot report" />Verified community report</span><span><Layers3 size={12} />© OpenStreetMap contributors</span></div>
        <p className="panel-note" style={{ marginTop: 11 }}>Report locations are community observations, not provider measurements or official warnings. Unverified and pending reports are not shown on this public map.</p>
      </Panel>
      {!online && <OfflineNote message="The app shell remains available offline, but map tiles and verified server reports require a connection. No map tile has been cached." />}
      {online && !busy && !error && !reports.length && <div className="data-unavailable" style={{ marginTop: 12 }}><AlertTriangle size={15} />No verified reports were returned for this view; this does not indicate that no hazard exists.</div>}
    </>}
  </>;
}
