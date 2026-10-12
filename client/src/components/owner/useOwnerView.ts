import { useMemo } from 'react';
import { RANK, ragOf, worstOf } from '@/data/rag';
import type { LineageKey, LineageRecord, ProductType, Rag } from '@/data/types';
import { sum, uniq } from '@/lib/format';
import { useEosl } from '@/state/EoslContext';
import type { Trace } from '@/state/EoslContext';
import { ALL_STATUSES, FOCUSABLE, STATUS } from './status';

/** Map levels to the right of the owner (the prototype's LV). */
export const LEVELS: readonly [Exclude<LineageKey, 'own'>, string][] = [
  ['sub', 'Sub-portfolios'],
  ['svc', 'Technical services'],
  ['app', 'Applications'],
  ['p', 'Products'],
];
/** Nodes shown per column before "+N more". */
export const MAX_NODES = 9;

export interface OwnerSummary {
  o: string;
  rows: LineageRecord[];
  /** Assets per status. */
  c: Record<Rag, number>;
  /** Assets in focus. */
  f: number;
  /** All assets. */
  t: number;
}

export interface MapNode {
  n: string;
  g: Rag;
  h: number;
}

/** [from "level|name", to "level|name", worst status, part of the traced path]. */
export type Edge = [string, string, Rag, boolean];

export interface ProductRow {
  p: string;
  t: ProductType;
  h: number;
  r: LineageRecord;
}

/** Everything the owner-lineage page derives from shared state (the prototype's ownerPage()). */
export function useOwnerView() {
  const { data, type, hz, overrides, focus, owner, trace } = useEosl();

  return useMemo(() => {
    const rag = (r: LineageRecord, months: number = hz): Rag => ragOf(r, months, overrides);
    const byType = data.records.filter((r) => type === 'All' || r.t === type);
    const inFocus = (r: LineageRecord) => focus.has(rag(r));

    const owners: OwnerSummary[] = uniq(byType, 'own')
      .map((o) => {
        const rows = byType.filter((r) => r.own === o);
        const c = Object.fromEntries(
          ALL_STATUSES.map((g) => [
            g,
            sum(
              rows.filter((r) => rag(r) === g),
              (r) => r.h
            ),
          ])
        ) as Record<Rag, number>;
        return { o, rows, c, f: sum(rows.filter(inFocus), (r) => r.h), t: sum(rows, (r) => r.h) };
      })
      .sort((x, y) => y.f - x.f || y.c.red - x.c.red);

    const statusTotals = Object.fromEntries(
      FOCUSABLE.map((g) => [
        g,
        sum(
          byType.filter((r) => rag(r) === g),
          (r) => r.h
        ),
      ])
    ) as Record<Rag, number>;

    const when = hz ? `in ${hz} months` : 'today';
    const fl = FOCUSABLE.filter((g) => focus.has(g)).map((g) => STATUS[g][0].toLowerCase());
    const flx = fl.length > 1 ? fl.slice(0, -1).join(', ') + ' or ' + fl[fl.length - 1] : (fl[0] ?? '');

    const O = owners.find((x) => x.o === owner) ?? owners[0];
    if (!O) return { owners, statusTotals, when, flx, O: null } as const;

    const f = O.rows.filter(inFocus);
    const recs = trace ? f.filter((r) => r[trace.k] === trace.v) : null;
    const lit = (k: LineageKey, v: string) => !recs || recs.some((r) => r[k] === v);

    const columns = LEVELS.map(([k, label]) => {
      const groups = new Map<string, LineageRecord[]>();
      for (const r of f) {
        const list = groups.get(r[k]);
        if (list) list.push(r);
        else groups.set(r[k], [r]);
      }
      const items: MapNode[] = [...groups]
        .map(([n, a]) => ({ n, g: worstOf(a, hz, overrides), h: sum(a, (r) => r.h) }))
        .sort((x, y) => RANK[y.g] - RANK[x.g] || y.h - x.h);
      return { k, label, items, lit: (v: string) => lit(k, v) };
    });

    const chain: LineageKey[] = ['own', ...LEVELS.map(([k]) => k)];
    const edgeMap = new Map<string, Edge>();
    for (const r of f) {
      const on = !!recs && recs.includes(r);
      const g = rag(r);
      for (let i = 0; i < chain.length - 1; i++) {
        const a = `${chain[i]}|${r[chain[i]]}`;
        const z = `${chain[i + 1]}|${r[chain[i + 1]]}`;
        const key = `${a}>${z}`;
        let e = edgeMap.get(key);
        if (!e) edgeMap.set(key, (e = [a, z, 'green', false]));
        if (RANK[g] > RANK[e[2]]) e[2] = g;
        if (on) e[3] = true;
      }
    }

    const top = f.filter((r) => r.env === 'Production').sort((a, c) => RANK[rag(c)] - RANK[rag(a)] || c.h - a.h)[0];

    const products: ProductRow[] = uniq(O.rows, 'p')
      .map((p) => {
        const a = O.rows.filter((r) => r.p === p);
        return { p, t: a[0].t, h: sum(a, (r) => r.h), r: a[0] };
      })
      .sort((x, y) => RANK[rag(y.r, 0)] - RANK[rag(x.r, 0)] || y.h - x.h);

    return {
      owners,
      statusTotals,
      when,
      flx,
      O,
      focused: f,
      traced: recs,
      columns,
      edges: [...edgeMap.values()],
      total: sum(f, (r) => r.h),
      products: uniq(f, 'p').length,
      apps: uniq(f, 'app').length,
      bizServices: uniq(f, 'biz').length,
      exposure: sum(
        f.filter((r) => rag(r) !== 'green'),
        (r) => r.h * data.rates[r.t]
      ),
      top,
      productRows: products,
      rag,
    } as const;
  }, [data, type, hz, overrides, focus, owner, trace]);
}

export type OwnerView = ReturnType<typeof useOwnerView>;
export type { Trace };
