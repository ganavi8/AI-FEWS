import type { DataStatus } from '../../shared/contracts.js';

export interface ProviderState {
  status: DataStatus;
  observedAt: string | null;
  checkedAt: string;
}

const latest = new Map<string, ProviderState>();

export function recordProviderState(id: string, state: ProviderState): void {
  latest.set(id, state);
}

export function getProviderState(id: string): ProviderState | null {
  return latest.get(id) ?? null;
}

export function clearProviderState(): void {
  latest.clear();
}
