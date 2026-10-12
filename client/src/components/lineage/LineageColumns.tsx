import { useMemo } from 'react';
import { RANK } from '@/data/rag';
import type { LineageKey, LineageRecord, Rag } from '@/data/types';
import { fmt, sum, uniq } from '@/lib/format';
import { useEosl } from '@/state/EoslContext';
import { LINEAGE_COLUMNS, useLineageView } from '@/state/lineage';

interface Group {
  name: string;
  rows: LineageRecord[];
  rag: Rag;
  assets: number;
}

function subtitle(k: LineageKey, g: Group): string {
  const r = g.rows[0];
  switch (k) {
    case 'p':
      return `${r.t}, ${r.d && r.days !== null ? (r.days < 0 ? 'ended ' + r.d : Math.round(r.days) + ' days left') : 'no EoSL date'}`;
    case 'sub':
      return r.bu;
    case 'own':
      return `${uniq(g.rows, 'sub').length} sub-portfolios`;
    case 'svc':
      return `${uniq(g.rows, 'app').length} applications`;
    case 'app':
      return `${r.env}, CIA ${r.cia}, ${r.biz}`;
  }
}

/** Product → sub-portfolio → owner → technical service → application columns, cross-filtered. */
export function LineageColumns() {
  const { sel, toggleSel } = useEosl();
  const { filtered, rag } = useLineageView();

  const columns = useMemo(
    () =>
      LINEAGE_COLUMNS.map(([k, label]) => {
        const groups = new Map<string, LineageRecord[]>();
        for (const r of filtered(k)) {
          const list = groups.get(r[k]);
          if (list) list.push(r);
          else groups.set(r[k], [r]);
        }
        const rows: Group[] = [...groups].map(([name, rs]) => ({
          name,
          rows: rs,
          rag: rs.reduce<Rag>((w, r) => (RANK[rag(r)] > RANK[w] ? rag(r) : w), 'green'),
          assets: sum(rs, (r) => r.h),
        }));
        rows.sort((x, y) => RANK[y.rag] - RANK[x.rag] || y.assets - x.assets);
        return { k, label, rows };
      }),
    [filtered, rag]
  );

  return (
    <div className="cols">
      {columns.map(({ k, label, rows }) => (
        <div className="col" key={k}>
          <h3>{`${label} (${rows.length})`}</h3>
          {rows.length ? (
            rows.map((g) => (
              <div
                key={g.name}
                className={`row ${sel[k] === g.name ? 'on' : ''}`}
                role="button"
                tabIndex={0}
                aria-pressed={sel[k] === g.name}
                onClick={() => toggleSel(k, g.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSel(k, g.name);
                  }
                }}
              >
                <span className={`dot ${g.rag}`}></span>
                <div className="t">
                  {g.name}
                  <small>{subtitle(k, g)}</small>
                </div>
                <span className="v">{fmt(g.assets)}</span>
              </div>
            ))
          ) : (
            <div className="row sub">No matches.</div>
          )}
        </div>
      ))}
    </div>
  );
}
