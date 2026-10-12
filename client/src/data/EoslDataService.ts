import type { EoslDataset, Rag, StatusOption } from './types';

export interface DatasetState {
  data: EoslDataset | null;
  loading: boolean;
  error: string | null;
  /** SQL warehouse state while it starts (e.g. 'STARTING'); null when not applicable or running. */
  warehouseState: string | null;
}

/**
 * Where EOSL data comes from. Every UI component reads data through this; pages don't know
 * whether it is Unity Catalog (unityCatalog/) or the bundled sample (mock/).
 */
export interface EoslDataSource {
  /** Shown in loading and error messages, e.g. "Unity Catalog". */
  label: string;
  /** React hook that loads the dataset. Called unconditionally by the provider. */
  useDataset(): DatasetState;
  /** Record an owner status update for a product and return the RAG it now maps to. */
  updateStatus(product: string, status: StatusOption): Promise<Rag>;
}
