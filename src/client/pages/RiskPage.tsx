import { useState } from 'react';
import { AlertTriangle, ArrowUpRight, CircleHelp, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLocationData } from '../app/LocationContext.js';
import { DataUnavailable, ErrorBanner, PageIntro, Panel, RiskBadge, StatusBadge } from '../app/components.js';
import { api, ApiClientError } from '../services/api.js';
import type { RiskExplanationResponse } from '../../shared/contracts.js';

type Explanation = RiskExplanationResponse;

export function RiskPage() {
  const { environment, selected } = useLocationData();
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function loadInputs() {
    if (!selected) return;
    setBusy(true); setError(null);
    try { setExplanation(await api.riskExplain(selected.coordinates.latitude, selected.coordinates.longitude, selected.method === 'android' ? 'android' : selected.method === 'browser' ? 'browser' : 'manual')); }
    catch (cause) { setError(cause instanceof ApiClientError ? cause.message : 'Source inputs could not be loaded.'); }
    finally { setBusy(false); }
  }
  if (!selected || !environment) return <><PageIntro eyebrow="DECISION SUPPORT / EXPLAINABLE" title="Risk assessment" description="A rule-based rainfall screening result, never a calibrated flood probability or official warning." /><Panel title="Select a location"><DataUnavailable reason="A screening assessment is available only after an explicit provider request for a selected place." /><Link className="button button-primary" to="/location" style={{ marginTop: 14 }}>Choose location</Link></Panel></>;
  const risk = environment.risk;
  return <>
    <PageIntro eyebrow="DECISION SUPPORT / RULE-BASED" title="Risk assessment" description="The server applies a deterministic rainfall heuristic to provider-returned precipitation values. It is not trained, calibrated or validated as a flood forecast." />
    {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
    <div className="dashboard-grid">
      <Panel title="Assessment" eyebrow={risk.model} action={<StatusBadge status={risk.riskLevel === 'UNKNOWN' ? 'UNAVAILABLE' : environment.status} />}>
        <div className="risk-hero"><div><div className="eyebrow">SCREENING LEVEL</div><RiskBadge risk={risk.riskLevel} /></div><div><div className="eyebrow">HEURISTIC SCORE</div><strong>{risk.score === null ? '—' : `${risk.score}/100`}</strong></div></div>
        <p className="risk-explanation">{risk.explanation}</p>
        <dl className="key-value"><dt>Probability of flooding</dt><dd>Not estimated — no calibrated probability model is configured.</dd><dt>Confidence</dt><dd>Not estimated or calibrated.</dd><dt>Uncertainty</dt><dd>Not quantified. Missing terrain/drainage data limit this screening.</dd><dt>Inputs assessed</dt><dd>Hourly precipitation and precipitation probability, when returned by the weather provider.</dd><dt>Assessment time</dt><dd>{new Date(risk.evaluatedAt).toLocaleString()}</dd><dt>Saved history</dt><dd>{risk.persisted ? 'Persisted for this saved location' : 'Not persisted to server history'}</dd></dl>
        <div className="form-actions"><button type="button" className="button button-secondary" onClick={() => void loadInputs()} disabled={busy}>{busy ? 'Loading source inputs…' : 'Review provider inputs'}</button></div>
      </Panel>
      <Panel title="Factors" eyebrow="SERVER-CALCULATED INPUTS">
        {risk.factors.length ? <div className="factor-list">{risk.factors.map((factor) => <article className="factor-card" key={factor.key}>
          <div className="factor-head"><strong>{factor.label}</strong><span className="small-mono">{factor.value === null ? 'Not supplied' : `${factor.value}${factor.unit ? ` ${factor.unit}` : ''}`}</span></div>
          <p>{factor.explanation}</p>
          <div className="factor-foot"><span>Contribution: {factor.contribution === null ? 'not available' : factor.contribution}</span>{factor.source && <a href={factor.source} target="_blank" rel="noreferrer">Source <ArrowUpRight size={12} /></a>}</div>
        </article>)}</div> : <DataUnavailable reason="No usable live rainfall inputs were available to the server-side rule." />}
      </Panel>
    </div>
    {explanation && <Panel title="Provider inputs used by the server" eyebrow="LIVE REQUEST DETAIL" className="explanation-panel">
      <div className="grid grid-2">
        {[['Weather', explanation.inputs.weather], ['Air quality', explanation.inputs.airQuality]].map(([label, entry]) => {
          const value = entry as Explanation['inputs']['weather'];
          return <div className="source-card" key={label as string}><div className="eyebrow">{label as string}</div><strong>{value.provider}</strong><p>Observation time: {value.observedAt ? new Date(value.observedAt).toLocaleString() : 'Not supplied'}</p><p>Fetched: {new Date(value.fetchedAt).toLocaleString()}</p><a href={value.source} target="_blank" rel="noreferrer">Provider documentation <ArrowUpRight size={12} /></a><StatusBadge status={value.status} /></div>;
        })}
      </div>
      <p className="panel-note" style={{ marginTop: 14 }}>{explanation.disclaimer}</p>
    </Panel>}
    <div className="scenario-banner" style={{ marginTop: 14 }}><ShieldAlert size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />This is not an official flood warning. If conditions are unsafe, use local emergency alerts, authorities and evacuation guidance.</div>
  </>;
}
