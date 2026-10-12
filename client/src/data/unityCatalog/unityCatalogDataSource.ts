import { useMemo } from 'react';
import { useAnalyticsQuery } from '@databricks/appkit-ui/react';
import { z } from 'zod';
import { IMPACT, STATUS_RAG, WORKFLOW } from '../appContent';
import type { DatasetState, EoslDataSource } from '../EoslDataService';
import { PRODUCT_TYPES } from '../types';
import type { EoslDataset, ProductType, Rag, StatusOption } from '../types';

/*
 * Reads the EOSL estate from Unity Catalog through the analytics() plugin. The SQL lives in
 * config/queries/*.sql (workspace.eosl.*); rows are validated here so a schema change surfaces as
 * a clear error instead of a broken page.
 */

const productType = z.enum(PRODUCT_TYPES as [ProductType, ...ProductType[]]);
// Numbers can arrive as JSON numbers or numeric strings depending on the column type.
const num = z.union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/)]).transform(Number);

const recordRow = z.object({
  p: z.string(),
  t: productType,
  d: z.string().nullable(),
  sub: z.string(),
  bu: z.string(),
  own: z.string(),
  svc: z.string(),
  app: z.string(),
  biz: z.string(),
  env: z.string(),
  cia: z.string(),
  h: num,
  days: num.nullable(),
});
const productRow = z.object({ name: z.string(), type: productType, eosl: z.string().nullable() });
const rateRow = z.object({ product_type: productType, annual_cost_per_asset_usd: num });

// Stable parameter objects: the hook re-runs whenever the parameters reference changes.
const NO_PARAMS = {};

function parse<T>(schema: z.ZodType<T>, rows: unknown, query: string): T {
  const r = schema.safeParse(rows);
  if (r.success) return r.data;
  const issue = r.error.issues[0];
  throw new Error(`Unexpected data from ${query}: ${issue.path.join('.')} ${issue.message}`);
}

function useUnityCatalogDataset(): DatasetState {
  const records = useAnalyticsQuery('lineage_records', NO_PARAMS);
  const products = useAnalyticsQuery('products', NO_PARAMS);
  const rates = useAnalyticsQuery('support_rates', NO_PARAMS);
  const all = [records, products, rates];

  const parsed = useMemo((): { data: EoslDataset | null; error: string | null } => {
    if (!records.data || !products.data || !rates.data) return { data: null, error: null };
    try {
      const rateRows = parse(z.array(rateRow), rates.data, 'support_rates');
      const rateMap = Object.fromEntries(rateRows.map((r) => [r.product_type, r.annual_cost_per_asset_usd]));
      const missing = PRODUCT_TYPES.filter((t) => rateMap[t] === undefined);
      if (missing.length) throw new Error(`No extended-support rate for: ${missing.join(', ')}`);
      return {
        data: {
          records: parse(z.array(recordRow), records.data, 'lineage_records'),
          products: parse(z.array(productRow), products.data, 'products').map((p) => ({
            name: p.name,
            type: p.type,
            eosl: p.eosl,
          })),
          rates: rateMap as Record<ProductType, number>,
          impact: IMPACT,
          statusRag: STATUS_RAG,
          workflow: WORKFLOW,
        },
        error: null,
      };
    } catch (e) {
      return { data: null, error: e instanceof Error ? e.message : String(e) };
    }
  }, [records.data, products.data, rates.data]);

  const warehouse = all.map((q) => q.warehouseStatus?.state).find((s) => s && s !== 'RUNNING');
  const error = all.map((q) => q.error).find(Boolean) ?? parsed.error;
  return { data: parsed.data, loading: !parsed.data && !error, error, warehouseState: warehouse ?? null };
}

export function createUnityCatalogDataSource(): EoslDataSource {
  return {
    label: 'Unity Catalog',
    useDataset: useUnityCatalogDataset,
    updateStatus: (_product: string, status: StatusOption): Promise<Rag> =>
      // TODO: persist owner status updates (a Delta table written through a server route, or
      // Lakebase) so they survive reloads and are shared across users. In memory for now.
      Promise.resolve(STATUS_RAG[status]),
  };
}
