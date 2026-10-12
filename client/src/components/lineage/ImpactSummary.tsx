import { Card } from '@/components/Card';
import { fmt, sum, uniq } from '@/lib/format';
import { useEosl } from '@/state/EoslContext';
import { useLineageView } from '@/state/lineage';

/** Stats and templated "AI summary" for everything the current selection touches. */
export function ImpactSummary() {
  const { data, hz } = useEosl();
  const { filtered, rag } = useLineageView();

  const f = filtered(null);
  const red = f.filter((r) => rag(r) === 'red');
  const redProducts = uniq(red, 'p');
  const exposure = sum(
    f.filter((r) => rag(r) !== 'green'),
    (r) => r.h * data.rates[r.t]
  );
  const top = red.filter((r) => r.env === 'Production').sort((a, b) => b.h - a.h)[0];

  // Same template and wording as the prototype; not model-generated.
  const summary = redProducts.length
    ? `${redProducts.length} red product${redProducts.length > 1 ? 's' : ''} (${redProducts.slice(0, 3).join(', ')}${
        redProducts.length > 3 ? '...' : ''
      }) affect ${uniq(red, 'app').length} applications under ${uniq(red, 'own').length} owner(s). ${
        top ? `Start with ${top.app} on ${top.p}: ${top.h} production assets, feeding ${top.biz}.` : ''
      }`
    : 'No red products in this selection.';

  return (
    <Card title={'Impact of the current selection' + (hz ? ` (projected +${hz} months)` : '')}>
      <div className="stats">
        <div>
          <b>{fmt(sum(f, (r) => r.h))}</b>assets
        </div>
        <div>
          <b>{uniq(f, 'app').length}</b>dependent applications
        </div>
        <div>
          <b>{uniq(f, 'svc').length}</b>technical services
        </div>
        <div>
          <b>{uniq(f, 'biz').length}</b>business services
        </div>
        <div>
          <b>{uniq(f, 'own').length}</b>owners
        </div>
        <div>
          <b>${(exposure / 1e6).toFixed(2)}M</b>extended-support exposure per year
        </div>
      </div>
      <div className="ai">
        <b>AI summary.</b> {summary} Click any row to narrow every column, or a dependency to trace it up to its owner.
      </div>
    </Card>
  );
}
