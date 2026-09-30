import { useState, type FormEvent } from 'react';
import { AlertTriangle, Beaker, RotateCcw } from 'lucide-react';
import { SimulationScenarioSchema, type SimulationScenario } from '../../shared/contracts.js';
import { api, ApiClientError } from '../services/api.js';
import type { z } from 'zod';
import { ErrorBanner, PageIntro, Panel, RiskBadge, StatusBadge } from '../app/components.js';
import { useLocationData } from '../app/LocationContext.js';

const scenarios: Array<{ value: SimulationScenario; description: string }> = [
  { value: 'NORMAL', description: 'Low assumed rainfall; reference-only conditions.' },
  { value: 'HEAVY RAIN', description: 'Synthetic heavy precipitation for scenario comparison.' },
  { value: 'EXTREME RAIN', description: 'Synthetic extreme precipitation; not an event forecast.' },
  { value: 'DRAINAGE FAILURE', description: 'Synthetic heavy rainfall with an assumed drainage constraint.' },
  { value: 'HIGH FLOOD RISK', description: 'Synthetic stress case for preparedness discussion.' },
];

type SimulationResult = z.infer<typeof import('../../shared/contracts.js').SimulationResponseSchema>;

export function SimulationPage() {
  const { selected } = useLocationData();
  const [scenario, setScenario] = useState<SimulationScenario>('HEAVY RAIN');
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function runSimulation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!selected) { setError('Select a location first. The simulator does not choose a default place.'); return; }
    setBusy(true);
    try {
      const parsed = SimulationScenarioSchema.parse(scenario);
      const response = await api.simulate(parsed, selected.coordinates.latitude, selected.coordinates.longitude);
      setResult(response);
    } catch (cause) {
      setError(cause instanceof ApiClientError ? cause.message : 'The scenario could not be evaluated.');
    } finally { setBusy(false); }
  }

  return <>
    <PageIntro eyebrow="PLANNING TOOL" title="Scenario lab" description="Explore a small, server-evaluated synthetic rainfall scenario to discuss preparedness. It is never a live observation, flood probability, warning or historical record." />
    {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
    <div className="dashboard-grid">
      <Panel title="Scenario assumptions" eyebrow="SIMULATION ONLY">
        <form onSubmit={runSimulation}>
          <div className="field">
            <label htmlFor="scenario">Choose a scenario</label>
            <select id="scenario" className="select" value={scenario} onChange={(event) => { setScenario(SimulationScenarioSchema.parse(event.target.value)); setResult(null); }}>
              {scenarios.map((item) => <option key={item.value} value={item.value}>{item.value}</option>)}
            </select>
            <span className="field-hint">{scenarios.find((item) => item.value === scenario)?.description}</span>
          </div>
          <div className="inline-info" style={{ marginTop: 14 }}><Beaker size={15} />
            <span>Location: {selected?.name ?? (selected ? `${selected.coordinates.latitude.toFixed(4)}, ${selected.coordinates.longitude.toFixed(4)}` : 'none selected')}. Coordinates are used only for this explicit request.</span>
          </div>
          <div className="form-actions">
            <button className="button button-primary" type="submit" disabled={busy}>{busy ? 'Evaluating…' : 'Run scenario'}</button>
            <button className="button button-secondary" type="button" disabled={!result} onClick={() => setResult(null)}><RotateCcw size={14} />Reset</button>
          </div>
        </form>
      </Panel>
      <Panel title="How to interpret this" eyebrow="BOUNDARIES">
        <ul className="rule-list">
          <li><AlertTriangle size={14} />All inputs are synthetic scenario assumptions, not a provider observation.</li>
          <li><AlertTriangle size={14} />Do not interpret the percentage as calibrated flood probability or a warning.</li>
          <li><AlertTriangle size={14} />Scenario results are not stored in environmental history or community reports.</li>
          <li><AlertTriangle size={14} />Follow official local emergency instructions and current local forecasts.</li>
        </ul>
      </Panel>
    </div>
    {result && <Panel title="Scenario result" eyebrow="SYNTHETIC OUTPUT" className="scenario-result-panel">
      <div className="scenario-banner"><strong>SIMULATION — NOT LIVE DATA.</strong> These values are synthetic and must not be used as a hazard determination.</div>
      <div className="grid grid-3" style={{ marginTop: 13 }}>
        <div className="metric-card metric-amber"><div className="eyebrow">ASSUMED RAINFALL</div><div className="metric-value">{result.simulatedRainfallMm}<small>mm</small></div><div className="metric-bottom">Synthetic input <StatusBadge status="SIMULATION" /></div></div>
        <div className="metric-card"><div className="eyebrow">SCENARIO SCREEN</div><div style={{ margin: '14px 0 10px' }}><RiskBadge risk={result.risk.riskLevel} /></div><div className="metric-bottom">Rule-based heuristic · not calibrated</div></div>
        <div className="metric-card metric-red"><div className="eyebrow">SYNTHETIC INDICATOR</div><div className="metric-value">{result.simulatedProbabilityPercent}<small>%</small></div><div className="metric-bottom">Scenario-only value · not flood probability</div></div>
      </div>
      <div className="source-line"><span>Scenario: {result.scenario}</span><span>Generated {new Date(result.generatedAt).toLocaleString()}</span><StatusBadge status="SIMULATION" /></div>
      <p className="panel-note" style={{ marginTop: 12 }}>{result.disclaimer}</p>
    </Panel>}
  </>;
}
