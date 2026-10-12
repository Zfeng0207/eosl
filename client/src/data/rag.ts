import type { LineageRecord, Rag } from './types';

export const RANK: Readonly<Record<Rag, number>> = { red: 3, amber: 2, grey: 1, green: 0 };

/** Status overrides set from the Update Center, keyed by product name. */
export type Overrides = Readonly<Record<string, Rag>>;

/**
 * RAG for a record projected `months` ahead. Matches the prototype's RG():
 * an override wins; no EoSL date is grey; otherwise red within 90 days,
 * amber within 365 days, else green.
 */
export function ragOf(r: LineageRecord, months: number, overrides: Overrides): Rag {
  const ov = overrides[r.p];
  if (ov) return ov;
  if (r.days === null) return 'grey';
  const x = r.days - months * 30.4;
  return x <= 90 ? 'red' : x <= 365 ? 'amber' : 'green';
}

/** Highest-ranked RAG across records (green when empty). */
export function worstOf(rows: readonly LineageRecord[], months: number, overrides: Overrides): Rag {
  return rows.reduce<Rag>((w, r) => {
    const g = ragOf(r, months, overrides);
    return RANK[g] > RANK[w] ? g : w;
  }, 'green');
}

export const ragLabel = (g: Rag): string => (g === 'grey' ? 'Unknown' : g[0].toUpperCase() + g.slice(1));
