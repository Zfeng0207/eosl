import { useMemo } from 'react';
import { ragLabel } from '@/data/rag';
import { Card } from '@/components/Card';
import { RagPill } from '@/components/RagPill';
import { fmt, sum } from '@/lib/format';
import type { CsvTable } from '@/lib/csv';
import { useEosl } from '@/state/EoslContext';
import { HORIZONS } from '@/state/filters';
import { useLineageView } from '@/state/lineage';

const TITLE = 'Product status over time: what turns red, amber or green if nothing changes';

/** Product × horizon RAG table; clicking a row toggles the product selection. */
export function StatusMatrix() {
  const { data, type, sel, toggleSel } = useEosl();
  const { rag } = useLineageView();

  const rows = useMemo(
    () =>
      data.products
        .filter((p) => type === 'All' || p.type === type)
        .map((p) => {
          const recs = data.records.filter((r) => r.p === p.name);
          return {
            ...p,
            assets: sum(recs, (r) => r.h),
            // The prototype reads the first record: every record of a product shares its EoSL date.
            rags: HORIZONS.map((m) => rag(recs[0], m)),
          };
        }),
    [data, type, rag]
  );

  const csv: CsvTable = {
    headers: ['Product', 'Type', 'Assets', 'Today', 'In 3 months', 'In 6 months', 'In 12 months'],
    rows: rows.map((r) => [r.name, r.type, r.assets, ...r.rags.map(ragLabel)]),
  };

  return (
    <Card title={TITLE} csv={csv}>
      <div className="tw">
        <table>
          <tbody>
            <tr>
              <th>Product</th>
              <th>Assets</th>
              <th>Today</th>
              <th>In 3 months</th>
              <th>In 6 months</th>
              <th>In 12 months</th>
            </tr>
            {rows.map((r) => (
              <tr
                key={r.name}
                data-pr={r.name}
                style={{ cursor: 'pointer' }}
                className={sel.p === r.name ? 'on' : ''}
                onClick={() => toggleSel('p', r.name)}
              >
                <td>
                  <b>{r.name}</b>
                  <br />
                  <span className="sub">{r.type}</span>
                </td>
                <td>{fmt(r.assets)}</td>
                {r.rags.map((g, i) => (
                  <td key={HORIZONS[i]}>
                    <RagPill rag={g} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
