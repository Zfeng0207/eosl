import type { KeyboardEvent } from 'react';
import type { Rag } from '@/data/types';
import { fmt, sum } from '@/lib/format';
import { useEosl } from '@/state/EoslContext';
import { useLineageView } from '@/state/lineage';

const ORDER: readonly Rag[] = ['red', 'amber', 'grey', 'green'];
const LABEL: Readonly<Record<Rag, string>> = {
  red: 'Red: past EoSL or within 90 days',
  amber: 'Amber: within 12 months',
  grey: 'Grey: no EoSL date',
  green: 'Green: supported',
};

/** Assets per RAG for the current type and horizon; clicking a card toggles the RAG focus. */
export function KpiCards() {
  const { hz, ragFocus, toggleRagFocus } = useEosl();
  const { byType, rag } = useLineageView();
  const tot = sum(byType, (r) => r.h);
  const assets = (g: Rag) =>
    sum(
      byType.filter((r) => rag(r) === g),
      (r) => r.h
    );

  return (
    <div className="grid c4">
      {ORDER.map((g) => (
        <div
          key={g}
          className={`card k ${g} ${ragFocus === g ? 'on' : ''}`}
          role="button"
          tabIndex={0}
          aria-pressed={ragFocus === g}
          onClick={() => toggleRagFocus(g)}
          onKeyDown={(e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleRagFocus(g);
            }
          }}
        >
          <div className="n">{fmt(assets(g))}</div>
          <div className="l">
            {LABEL[g]}
            <br />
            {`${tot ? Math.round((assets(g) / tot) * 100) : 0}% of ${fmt(tot)} assets${hz ? ' (projected)' : ''}`}
          </div>
        </div>
      ))}
    </div>
  );
}
