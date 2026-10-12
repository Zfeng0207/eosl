export type ProductType = 'OS' | 'Database' | 'Software' | 'Hardware';
export const PRODUCT_TYPES: readonly ProductType[] = ['OS', 'Database', 'Software', 'Hardware'];

export type Rag = 'red' | 'amber' | 'grey' | 'green';
export type BusinessUnit = 'Upstream' | 'Midstream' | 'Downstream' | 'Digital' | 'Corporate';

export interface Product {
  name: string;
  type: ProductType;
  /** End-of-support-life date (YYYY-MM-DD), or null when unknown. */
  eosl: string | null;
}

/** One product → sub-portfolio → application dependency (the prototype's `D` rows). */
export interface LineageRecord {
  p: string;
  t: ProductType;
  d: string | null;
  sub: string;
  bu: string;
  own: string;
  svc: string;
  app: string;
  biz: string;
  /** 'Production' marks production assets; anything else is treated as non-production. */
  env: string;
  cia: string;
  /** Asset count. */
  h: number;
  /** Days from TODAY to the EoSL date (negative when past), or null when unknown. */
  days: number | null;
}

/** Lineage levels: product, sub-portfolio, owner, technical service, application. */
export type LineageKey = 'p' | 'sub' | 'own' | 'svc' | 'app';

export interface ImpactCluster {
  name: string;
  apps: number;
}

export interface ImpactScenario {
  eosl: string;
  clusters: readonly ImpactCluster[];
  apps: number;
  recommendation: string;
}

export interface ImpactTopAsset {
  asset: string;
  eosl: string;
  apps: number;
}

export interface ImpactData {
  scenarios: Readonly<Record<string, ImpactScenario>>;
  defaultScenario: string;
  topAssets: readonly ImpactTopAsset[];
}

export type StatusOption = 'In Progress' | 'Migration Completed' | 'Renewal Requested' | 'Decommissioned';

export interface WorkflowStep {
  name: string;
  message: string;
}

export interface EoslDataset {
  products: readonly Product[];
  records: readonly LineageRecord[];
  /** Extended-support cost per asset per year, by product type (USD). */
  rates: Readonly<Record<ProductType, number>>;
  impact: ImpactData;
  /** RAG each owner status maps to. */
  statusRag: Readonly<Record<StatusOption, Rag>>;
  workflow: readonly WorkflowStep[];
}
