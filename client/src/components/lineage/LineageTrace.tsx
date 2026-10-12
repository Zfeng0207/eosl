import { Fragment } from 'react';
import type { LineageRecord } from '@/data/types';
import { uniq } from '@/lib/format';
import { useLineageView } from '@/state/lineage';

const CHAIN: readonly [keyof LineageRecord, string][] = [
  ['bu', 'business unit'],
  ['sub', 'sub-portfolio'],
  ['own', 'owner'],
  ['svc', 'technical service'],
  ['app', 'application'],
  ['p', 'product'],
];

/** "Lineage: BU › sub-portfolio › owner › service › application › product" chips. */
export function LineageTrace() {
  const { filtered } = useLineageView();
  const f = filtered(null);
  return (
    <div className="trace">
      <b>Lineage:</b>{' '}
      {CHAIN.map(([k, l], i) => {
        const u = uniq(f, k);
        return (
          <Fragment key={k}>
            {i > 0 && '›'}
            <span className={`s ${u.length === 1 ? '' : 'm'}`}>
              {u.length === 1 ? String(u[0]) : `${u.length} ${l}s`}
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}
