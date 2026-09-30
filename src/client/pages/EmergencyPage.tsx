import { AlertOctagon, ArrowUpRight, PhoneCall, ShieldCheck } from 'lucide-react';
import { PageIntro, Panel } from '../app/components.js';

export function EmergencyPage() {
  return <>
    <PageIntro eyebrow="SAFETY / OFFICIAL GUIDANCE FIRST" title="Emergency guidance" description="A general safety reminder only. Emergency response, evacuation zones and shelter instructions vary by location and must come from local authorities." />
    <div className="scenario-banner emergency-banner"><AlertOctagon size={17} style={{ verticalAlign: 'middle', marginRight: 8 }} /><strong>If you are in immediate danger, contact your local emergency services using the official number for your area.</strong> AI·FEWS cannot dispatch help and does not know your emergency jurisdiction.</div>
    <div className="dashboard-grid" style={{ marginTop: 14 }}>
      <Panel title="If flooding may affect you" eyebrow="TAKE GUIDANCE FROM LOCAL AUTHORITIES">
        <ul className="rule-list"><li><ShieldCheck size={14} />Follow official evacuation orders and local warnings immediately; do not wait for an AI·FEWS assessment.</li><li><ShieldCheck size={14} />Move away from rising water and never walk, swim or drive through floodwater.</li><li><ShieldCheck size={14} />Stay clear of rivers, drains, bridges, culverts, fallen power lines and flooded electrical equipment.</li><li><ShieldCheck size={14} />Call your area's official emergency services if you need urgent rescue. Do not rely on this website to contact them.</li><li><ShieldCheck size={14} />Share community observations only when doing so is safe; never enter a dangerous area to take a photograph.</li></ul>
      </Panel>
      <Panel title="What this page cannot do" eyebrow="IMPORTANT LIMITS">
        <ul className="rule-list"><li><PhoneCall size={14} />No emergency dispatch, phone calling or live connection to local government is configured.</li><li><PhoneCall size={14} />No local emergency number or shelter location is invented or inferred.</li><li><PhoneCall size={14} />Weather and screening outputs are not official alerts, evacuation decisions or an all-clear.</li><li><PhoneCall size={14} />Provider, network or device location failures must not delay seeking official help.</li></ul>
        <a className="button button-secondary button-compact" href="https://www.ready.gov/floods" target="_blank" rel="noreferrer" style={{ marginTop: 13 }}>General flood safety (Ready.gov) <ArrowUpRight size={12} /></a>
        <p className="field-hint" style={{ marginTop: 8 }}>This general US resource does not replace the applicable guidance where you are.</p>
      </Panel>
    </div>
  </>;
}
