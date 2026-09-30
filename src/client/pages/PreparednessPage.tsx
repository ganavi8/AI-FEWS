import { useEffect, useState } from 'react';
import { BatteryCharging, BookOpenCheck, House, Route, ShieldCheck, Siren, Zap } from 'lucide-react';
import { PageIntro, Panel } from '../app/components.js';
import { OfflineNote } from '../app/components.js';
import { cachePreparedness } from '../services/offline.js';

const sections = [
  { title: 'Before heavy rain or flooding', icon: BookOpenCheck, items: [
    'Learn the official local warning channels and identify more than one route to safer, higher ground.',
    'Follow local authority evacuation notices early; agree on a family meeting point and out-of-area contact.',
    'Prepare essential medication, drinking water, a first-aid kit, a torch, batteries, chargers, copies of key documents and a small emergency bag.',
    'Keep phones charged; write down important contacts in case mobile networks or mains power fail.',
    'If you are responsible for livestock or farm operations, plan safe animal movement and protect medicines, feed and equipment without entering rising water.',
  ] },
  { title: 'During flooding', icon: Siren, items: [
    'Follow official emergency instructions and evacuation routes. Do not wait for an app or community report to confirm danger.',
    'Never walk, swim or drive through floodwater. Its depth, speed, debris and road condition may not be visible.',
    'Stay away from bridges, culverts, drains, riverbanks, downed power lines and flooded electrical equipment.',
    'If indoors and water is rising, move to a safer higher level only if the building and official guidance allow it; do not enter a roof space that traps you.',
    'Check on others only when it is safe to do so. Do not put yourself or responders at risk.',
  ] },
  { title: 'After the water recedes', icon: House, items: [
    'Return only when authorities say it is safe. Flood-damaged buildings, roads, wells and electrical systems may remain unsafe.',
    'Avoid standing water, sewage, sharp debris and downed wires; use protective footwear and gloves when advised.',
    'Do not reconnect utilities or use wet electrical equipment until qualified personnel confirm safety.',
    'Use safe drinking-water guidance from local authorities and document damage only from a safe position.',
  ] },
  { title: 'Road and electrical safety', icon: Zap, items: [
    'Turn around rather than entering water-covered roads; road surfaces, bridges and edges can be washed away.',
    'Never touch downed lines or anything in contact with them. Report hazards using local utility/emergency channels.',
    'Keep generators outdoors, far from doors and windows. Carbon monoxide can be fatal indoors or in enclosed areas.',
  ] },
  { title: 'Rural and farm readiness', icon: Route, items: [
    'Use locally approved shelter and livestock movement plans; do not cross flooded fields, channels or access roads.',
    'Keep essential feed, water, veterinary supplies and identification in a place above known flood exposure where feasible.',
    'Protect farm chemical and fuel storage according to local environmental and emergency guidance.',
  ] },
];

export function PreparednessPage() {
  const [cacheState, setCacheState] = useState('');
  useEffect(() => {
    void cachePreparedness({ version: 1, sections: sections.map(({ title, items }) => ({ title, items })), savedAt: new Date().toISOString() })
      .then(() => setCacheState('A local copy is available in this browser’s offline store.'))
      .catch(() => setCacheState('Your browser did not allow a local preparedness copy.'));
  }, []);
  return <>
    <PageIntro eyebrow="SAFETY / FIELD REFERENCE" title="Preparedness" description="Practical reminders for heavy rain and flooding. This page is cached locally when browser storage is available and does not require location access." />
    <div className="scenario-banner"><ShieldCheck size={15} style={{ verticalAlign: 'middle', marginRight: 7 }} />Always follow official local emergency instructions, evacuation orders and emergency services. AI·FEWS is not an authority.</div>
    <OfflineNote message={cacheState || 'Saving this preparedness guide locally for offline use…'} />
    <div className="stack preparedness-stack" style={{ marginTop: 14 }}>{sections.map(({ title, icon: Icon, items }) => <Panel key={title} className="preparedness-panel"><div className="preparedness-section"><h3><Icon size={16} />{title}</h3><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div></Panel>)}</div>
    <Panel title="Emergency kit reminder" eyebrow="PLAN AHEAD" className="kit-panel"><div className="grid grid-3"><div className="kit-item"><BookOpenCheck size={17} /><strong>Documents & contacts</strong><span>Local contacts, IDs and essential records stored safely.</span></div><div className="kit-item"><BatteryCharging size={17} /><strong>Light & power</strong><span>Battery torch, charged phone, power bank and spare batteries.</span></div><div className="kit-item"><House size={17} /><strong>Water & essentials</strong><span>Safe drinking water, essential medicines and first aid.</span></div></div></Panel>
  </>;
}
