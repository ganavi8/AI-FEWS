import { useEffect, useState } from 'react';
import { ArrowUpRight, Database, Info } from 'lucide-react';
import { ErrorBanner, PageIntro, Panel, StatusBadge } from '../app/components.js';
import type { DataQualityEntry } from '../../shared/contracts.js';
import { api, ApiClientError } from '../services/api.js';

interface Provider { id: string; name: string; category: string; source: string | null; status: DataQualityEntry['status']; configured: boolean; attribution: string; limitations: string[] }
interface Model { id: string; kind: string; status: 'LIVE' | 'UNAVAILABLE' | 'CONFIGURATION REQUIRED'; probabilityAvailable: boolean; confidenceAvailable: boolean; uncertaintyAvailable: boolean; inputs: string[]; outputLevels: string[]; limitation: string; source: string }

export function DataQualityPage() {
  const [entries, setEntries] = useState<DataQualityEntry[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [limitations, setLimitations] = useState<string[]>([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true; setBusy(true);
    void Promise.all([api.dataQuality(), api.providers(), api.models()]).then(([quality, providerList, modelList]) => {
      if (!active) return;
      setEntries(quality.entries); setLimitations(quality.limitations); setUpdatedAt(quality.generatedAt);
      setProviders(providerList.providers); setModels(modelList.models);
    }).catch((cause) => { if (active) setError(cause instanceof ApiClientError ? cause.message : 'Data quality information is unavailable.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, []);

  const entriesByProvider = new Map(entries.map((entry) => [entry.provider, entry]));
  return <>
    <PageIntro eyebrow="PROVENANCE / CURRENT SERVER VIEW" title="Data quality & sources" description="The backend reports provider configuration and its latest in-process observation state. A configured integration is not reported as live until a request returns successfully." />
    {error && <ErrorBanner message={error} />}
    {updatedAt && <div className="data-timestamp"><Database size={13} />Catalog generated {new Date(updatedAt).toLocaleString()}{busy && ' · Refreshing'}</div>}
    {providers.length > 0 && <Panel title="Provider inventory" eyebrow="CONFIGURED & UNCONFIGURED SOURCES">
      <div className="provider-list">{providers.map((provider) => {
        const entry = entriesByProvider.get(provider.name);
        return <article className="provider-card" key={provider.id}>
          <div className="provider-head"><div><div className="eyebrow">{provider.category}</div><h3>{provider.name}</h3></div><StatusBadge status={provider.status} /></div>
          <p className="provider-attribution">{provider.attribution}</p>
          <div className="provider-details"><div><span>Latest provider data</span><strong>{entry?.latestUpdate ? new Date(entry.latestUpdate).toLocaleString() : 'No successful observation recorded in this server process'}</strong></div><div><span>Coverage</span><strong>{entry?.coverage ?? 'Coverage not reported'}</strong></div><div><span>Configured</span><strong>{provider.configured ? 'Configured; current status is shown above' : 'NO — CONFIGURATION REQUIRED'}</strong></div></div>
          <ul className="provider-limitations">{[...provider.limitations, ...(entry?.limitations ?? [])].filter((item, index, array) => array.indexOf(item) === index).map((item) => <li key={item}>{item}</li>)}</ul>
          <div className="source-line"><span>Freshness: <StatusBadge status={entry?.freshness ?? provider.status} /></span>{provider.source && <a href={provider.source} target="_blank" rel="noreferrer">Provider policy / docs <ArrowUpRight size={12} /></a>}</div>
        </article>;
      })}</div>
    </Panel>}
    {!providers.length && !busy && !error && <Panel title="No source status is available"><p className="panel-note">The server did not provide a data-quality catalog.</p></Panel>}
    <div className="dashboard-grid" style={{ marginTop: 14 }}>
      <Panel title="Risk model" eyebrow="ONE SERVER-AUTHORITATIVE IMPLEMENTATION">
        {models.map((model) => <div className="model-card" key={model.id}><div className="provider-head"><div><div className="eyebrow">{model.kind}</div><h3>{model.id}</h3></div><StatusBadge status={model.status} /></div><dl className="key-value"><dt>Inputs</dt><dd>{model.inputs.join(' · ')}</dd><dt>Risk levels</dt><dd>{model.outputLevels.join(' / ')}</dd><dt>Flood probability</dt><dd>{model.probabilityAvailable ? 'Available' : 'Not available'}</dd><dt>Confidence / uncertainty</dt><dd>{model.confidenceAvailable || model.uncertaintyAvailable ? 'Model-provided' : 'Not calibrated'}</dd><dt>Limitations</dt><dd>{model.limitation}</dd></dl><div className="inline-info" style={{ marginTop: 12 }}><Info size={15} />Only the rule-based rainfall screen is available. Its level/score is not a calibrated flood probability or validated impact prediction.</div></div>)}
      </Panel>
      <Panel title="Cross-cutting limitations" eyebrow="WHAT IS NOT MODELED">
        <ul className="rule-list">{limitations.map((item) => <li key={item}><Info size={14} />{item}</li>)}{!limitations.length && <li><Info size={14} />No additional server-level limitations were returned.</li>}</ul>
      </Panel>
    </div>
  </>;
}
