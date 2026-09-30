import type { ReactNode } from 'react';
import {
  ArrowUpRight, CircleAlert, Clock3, CloudOff, Database, MapPin, RefreshCw, ShieldAlert,
} from 'lucide-react';
import type { DataStatus, RiskLevel } from '../../shared/contracts.js';

type WorkflowState = 'SIMULATION' | 'UNKNOWN' | 'PENDING SYNC' | 'SYNCING' | 'SYNCED' | 'FAILED'
  | 'COMMUNITY GENERATED' | 'SUBMITTED' | 'PENDING_REVIEW' | 'VERIFIED' | 'REJECTED' | 'EXPIRED';

export function StatusBadge({ status }: { status: DataStatus | WorkflowState }) {
  const className = status === 'LIVE' || status === 'SYNCED' || status === 'VERIFIED' ? 'status-badge is-live'
    : status === 'RECENT' || status === 'CACHED' || status === 'SIMULATION' || status === 'PENDING SYNC' || status === 'SYNCING' || status === 'PENDING_REVIEW' ? 'status-badge is-caution'
      : status === 'STALE' || status === 'ERROR' || status === 'FAILED' || status === 'REJECTED' || status === 'EXPIRED' ? 'status-badge is-alert'
        : 'status-badge is-muted';
  return <span className={className}><span className="status-dot" aria-hidden="true" />{status}</span>;
}

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  return <span className={`risk-badge risk-${risk.toLowerCase().replace('_', '-')}`}>
    <ShieldAlert size={14} aria-hidden="true" />{risk.replace('_', ' ')}
  </span>;
}

export function PageIntro({ eyebrow, title, description, action }: {
  eyebrow: string; title: string; description: string; action?: ReactNode;
}) {
  return <div className="page-intro">
    <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></div>
    {action && <div className="page-intro-action">{action}</div>}
  </div>;
}

export function Panel({ title, eyebrow, action, className = '', children }: {
  title?: string; eyebrow?: string; action?: ReactNode; className?: string; children: ReactNode;
}) {
  return <section className={`panel ${className}`.trim()}>
    {(title || eyebrow || action) && <div className="panel-heading">
      <div>{eyebrow && <div className="eyebrow">{eyebrow}</div>}{title && <h2>{title}</h2>}</div>
      {action && <div className="panel-heading-action">{action}</div>}
    </div>}
    {children}
  </section>;
}

export function MetricCard({ label, value, unit, detail, status, icon, tone = 'neutral' }: {
  label: string; value: string | number; unit?: string; detail?: string; status?: DataStatus;
  icon?: ReactNode; tone?: 'neutral' | 'cyan' | 'amber' | 'red';
}) {
  return <article className={`metric-card metric-${tone}`}>
    <div className="metric-top"><span className="eyebrow">{label}</span>{icon && <span className="metric-icon" aria-hidden="true">{icon}</span>}</div>
    <div className="metric-value">{value}<small>{unit}</small></div>
    <div className="metric-bottom">{detail && <span>{detail}</span>}{status && <StatusBadge status={status} />}</div>
  </article>;
}

export function SourceLine({ provider, source, observedAt, fetchedAt, status }: {
  provider: string; source?: string | null; observedAt?: string | null; fetchedAt?: string | null; status: DataStatus;
}) {
  const value = observedAt ?? fetchedAt;
  return <div className="source-line">
    <span><Database size={13} aria-hidden="true" />{source ? <a href={source} target="_blank" rel="noreferrer">{provider}<ArrowUpRight size={12} aria-hidden="true" /></a> : provider}</span>
    <span><Clock3 size={13} aria-hidden="true" />{value ? `${observedAt ? 'Observed' : 'Fetched'} ${new Date(value).toLocaleString()}` : 'No source timestamp'}</span>
    <StatusBadge status={status} />
  </div>;
}

export function ErrorBanner({ message, onDismiss }: { message: string; onDismiss?: () => void }) {
  return <div className="error-banner" role="alert">
    <CircleAlert size={17} aria-hidden="true" /><p>{message}</p>
    {onDismiss && <button type="button" className="icon-button" aria-label="Dismiss message" onClick={onDismiss}>×</button>}
  </div>;
}

export function EmptyState({ icon = <MapPin size={20} />, title, message, action }: {
  icon?: ReactNode; title: string; message: string; action?: ReactNode;
}) {
  return <div className="empty-state"><div className="empty-icon" aria-hidden="true">{icon}</div>
    <h3>{title}</h3><p>{message}</p>{action && <div>{action}</div>}</div>;
}

export function OfflineNote({ message = 'This screen remains available offline. Live provider values and new server records do not.' }: { message?: string }) {
  return <div className="offline-note"><CloudOff size={15} aria-hidden="true" /><span>{message}</span></div>;
}

export function RefreshButton({ onClick, disabled, busy }: { onClick: () => void; disabled?: boolean; busy?: boolean }) {
  return <button type="button" className="button button-secondary button-compact" disabled={disabled || busy} onClick={onClick}>
    <RefreshCw size={15} className={busy ? 'spin' : ''} aria-hidden="true" />{busy ? 'Refreshing' : 'Refresh'}
  </button>;
}

export function SectionLabel({ children }: { children: ReactNode }) { return <div className="eyebrow section-label">{children}</div>; }

export function DataUnavailable({ reason = 'No verified observation is available for this selection.' }: { reason?: string }) {
  return <div className="data-unavailable"><CircleAlert size={15} aria-hidden="true" /><span>{reason}</span></div>;
}
