import type { Repository, ProviderAdapters } from '../services/types.js';

export interface RouteContext {
  repository: Repository;
  providers: ProviderAdapters;
  moderationToken: string;
  supportContact: string;
  operatorLegalName: string;
  operatorServiceAddress: string;
}
