import { useCallback, useMemo } from 'react';
import { ragOf } from '@/data/rag';
import type { LineageKey, LineageRecord, Rag } from '@/data/types';
import { useEosl } from './EoslContext';

export const LINEAGE_COLUMNS: readonly [LineageKey, string][] = [
  ['p', 'Product'],
  ['sub', 'Sub-portfolio'],
  ['own', 'Owner'],
  ['svc', 'Technical service'],
  ['app', 'Dependency (application)'],
];

/**
 * The prototype's lineage selectors. All synchronous over in-memory records, so
 * cross-filtering (e.g. clicking an owner) re-renders instantly.
 */
export function useLineageView() {
  const { data, type, hz, ragFocus, sel, overrides } = useEosl();

  /** RAG at the current horizon, with overrides. */
  const rag = useCallback((r: LineageRecord, months: number = hz): Rag => ragOf(r, months, overrides), [hz, overrides]);

  /** `bt()`: records for the current product-type filter. */
  const byType = useMemo(() => data.records.filter((r) => type === 'All' || r.t === type), [data.records, type]);

  /** `flt(except)`: records matching the RAG focus and every selection except `except`. */
  const filtered = useCallback(
    (except: LineageKey | null) =>
      byType.filter(
        (r) =>
          (!ragFocus || rag(r) === ragFocus) &&
          LINEAGE_COLUMNS.every(([k]) => k === except || !sel[k] || r[k] === sel[k])
      ),
    [byType, ragFocus, rag, sel]
  );

  return { rag, byType, filtered };
}
