import type { EoslDataset, Rag, StatusOption } from './types';

/**
 * Every UI component reads EOSL data through this interface. Today it is backed by
 * MockEoslDataService; swap in an implementation that calls the analytics() plugin
 * (SQL against Unity Catalog) without touching the UI.
 */
export interface EoslDataService {
  /** Load everything the pages need. Called once at startup. */
  load(): Promise<EoslDataset>;
  /** Record an owner status update for a product and return the RAG it now maps to. */
  updateStatus(product: string, status: StatusOption): Promise<Rag>;
}
