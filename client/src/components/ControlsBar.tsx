import { PRODUCT_TYPES } from '@/data/types';
import { useEosl } from '@/state/EoslContext';
import { HORIZONS } from '@/state/filters';
import type { TypeFilter } from '@/state/filters';

const TYPE_FILTERS: readonly TypeFilter[] = ['All', ...PRODUCT_TYPES];

/** Product-type pills, projected-status pills and "Reset lineage" (the prototype's `ctl()`). */
export function ControlsBar() {
  const { type, hz, setType, setHz, resetLineage } = useEosl();
  return (
    <div className="bar2">
      {TYPE_FILTERS.map((t) => (
        <button key={t} type="button" className={t === type ? 'on' : ''} onClick={() => setType(t)}>
          {t === 'All' ? 'All product types' : t}
        </button>
      ))}
      <span className="sp"></span>
      <span className="sub" style={{ alignSelf: 'center' }}>
        Projected status:
      </span>
      {HORIZONS.map((m) => (
        <button key={m} type="button" className={m === hz ? 'on' : ''} onClick={() => setHz(m)}>
          {m ? `In ${m} months` : 'Today'}
        </button>
      ))}
      <button type="button" onClick={resetLineage}>
        Reset lineage
      </button>
    </div>
  );
}
