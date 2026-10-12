import { useEffect } from 'react';
import { OwnerMap } from '@/components/owner/OwnerMap';
import { ALL_STATUSES, FOCUSABLE, STATUS, STATUS_COLOR } from '@/components/owner/status';
import { StatusIcon, StatusTag } from '@/components/owner/StatusIcon';
import { useOwnerView } from '@/components/owner/useOwnerView';
import type { OwnerView } from '@/components/owner/useOwnerView';
import { PRODUCT_TYPES } from '@/data/types';
import { downloadCsv } from '@/lib/csv';
import { fmt, uniq } from '@/lib/format';
import { useEosl } from '@/state/EoslContext';
import { HORIZONS } from '@/state/filters';
import type { TypeFilter } from '@/state/filters';

const TYPE_FILTERS: readonly TypeFilter[] = ['All', ...PRODUCT_TYPES];
const slug = (x: string) => x.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');

type LoadedView = Extract<OwnerView, { focused: unknown }>;

/** Leadership front page: one owner's at-risk estate, traced through to products. */
export function LineagePage() {
  const { type, setType, owner, setOwner } = useEosl();
  const view = useOwnerView();

  // Keep the stored owner in step with the one shown (the prototype falls back to the top owner).
  const shown = view.O?.o;
  useEffect(() => {
    if (shown && shown !== owner) setOwner(shown);
  }, [shown, owner, setOwner]);

  if (!view.O) {
    return (
      <>
        <div className="ow-hd">
          <div className="ttl">Lineage Explorer</div>
        </div>
        <p className="sub">No assets for this product type.</p>
      </>
    );
  }

  return (
    <>
      <div className="ow-hd">
        <div>
          <div className="ttl">Lineage Explorer</div>
        </div>
        <select aria-label="Product type" value={type} onChange={(e) => setType(e.target.value as TypeFilter)}>
          {TYPE_FILTERS.map((t) => (
            <option key={t} value={t}>
              {t === 'All' ? 'All product types' : t}
            </option>
          ))}
        </select>
      </div>
      <Controls totals={view.statusTotals} />
      <OwnerPanel view={view} />
      <ProductsTable view={view} />
    </>
  );
}

function Controls({ totals }: { totals: Record<string, number> }) {
  const { focus, toggleFocus, hz, setHz } = useEosl();
  return (
    <>
      <div className="ow-bar">
        <div className="ow-grp">
          <span className="ow-lab">Focus on</span>
          <div className="ow-seg">
            {FOCUSABLE.map((g) => (
              <button
                type="button"
                key={g}
                className={`ow-chip ${g} ${focus.has(g) ? 'on' : ''}`}
                aria-pressed={focus.has(g)}
                onClick={() => toggleFocus(g)}
              >
                <StatusIcon rag={g} />
                <span>
                  <b>{STATUS[g][0]}</b>
                  <small>{STATUS[g][1]}</small>
                </span>
                <em>{fmt(totals[g])}</em>
              </button>
            ))}
          </div>
        </div>
        <div className="ow-grp">
          <span className="ow-lab">Show status</span>
          <div className="ow-time">
            {HORIZONS.map((m) => (
              <button
                type="button"
                key={m}
                className={m === hz ? 'on' : ''}
                aria-pressed={m === hz}
                onClick={() => setHz(m)}
              >
                {m ? `In ${m} months` : 'Today'}
              </button>
            ))}
          </div>
        </div>
      </div>
      {hz ? (
        <div className="ow-proj">
          {`Projected view: status in ${hz} months if nothing is fixed.`}
          <button type="button" onClick={() => setHz(0)}>
            Back to today
          </button>
        </div>
      ) : null}
    </>
  );
}

function OwnerPanel({ view }: { view: LoadedView }) {
  const { focus, toggleFocus, hz, setHz, setOwner, trace, clearTrace, expanded, setExpanded } = useEosl();
  const { O, owners, flx, when, focused } = view;

  // Full screen locks page scroll; Esc exits.
  useEffect(() => {
    if (!expanded) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [expanded, setExpanded]);

  const exportView = () => {
    const rows = view.traced ?? focused;
    downloadCsv(
      {
        headers: [
          'Owner',
          'Status view',
          'Focus',
          'Traced item',
          'Sub-portfolio',
          'Technical service',
          'Application',
          'Business service',
          'Product',
          'Product type',
          'Environment',
          'Assets',
          'Status',
        ],
        rows: rows.map((r) => [
          O.o,
          when,
          flx,
          trace ? trace.v : '',
          r.sub,
          r.svc,
          r.app,
          r.biz,
          r.p,
          r.t,
          r.env,
          r.h,
          STATUS[view.rag(r)][0],
        ]),
      },
      `EOSL-${slug(O.o)}-lineage-${slug(when)}.csv`
    );
  };

  let stage;
  if (!focus.size) {
    stage = (
      <div className="ow-empty">
        {`Choose at least one status above to see ${O.o}'s dependencies.`}
        <div>
          <button type="button" onClick={() => toggleFocus('red')}>
            Show Act now
          </button>
        </div>
      </div>
    );
  } else if (!focused.length) {
    stage = (
      <div className="ow-empty">
        <b>{O.o}</b>
        {` has nothing marked ${flx} ${when}.`}
        <div>
          {hz ? null : (
            <button type="button" onClick={() => setHz(6)}>
              Look 6 months ahead
            </button>
          )}
          {focus.has('amber') ? null : (
            <button type="button" onClick={() => toggleFocus('amber')}>
              Add At risk
            </button>
          )}
        </div>
      </div>
    );
  } else {
    stage = (
      <>
        <p className="ow-sum">
          <b>{O.o}</b> owns <b>{fmt(view.total)}</b>
          {` assets marked ${flx} ${when}. They support `}
          <b>{view.apps}</b> applications and <b>{view.bizServices}</b> business services.
        </p>
        <div className="ow-stats">
          <div>
            <b>{fmt(view.total)}</b>
            <span>Assets</span>
          </div>
          <div>
            <b>{view.products}</b>
            <span>Products</span>
          </div>
          <div>
            <b>{view.apps}</b>
            <span>Applications</span>
          </div>
          <div>
            <b>{view.bizServices}</b>
            <span>Business services</span>
          </div>
          <div>
            <b>{`$${(view.exposure / 1e6).toFixed(2)}M`}</b>
            <span>Extended-support cost per year</span>
          </div>
        </div>
        {view.top && (
          <div className="ow-fix">
            <b>Fix first:</b>
            {` ${view.top.app} on ${view.top.p}. ${fmt(view.top.h)} production assets, feeding ${view.top.biz}.`}
          </div>
        )}
        <OwnerMap view={view} />
        <div className="ow-hint">
          {trace && (
            <>
              {'Showing only what connects to '}
              <b style={{ color: 'var(--tx)' }}>{trace.v}</b>.
              <button type="button" onClick={clearTrace}>
                Show everything
              </button>
            </>
          )}
        </div>
      </>
    );
  }

  return (
    <section className={`card ow-main ${expanded ? 'ow-max' : ''}`} id="owmain">
      <div className="ow-rail">
        <label className="ow-pick">
          <span className="ow-lab">Owner</span>
          <select aria-label="Choose owner" value={O.o} onChange={(e) => setOwner(e.target.value)}>
            {owners.map((x) => (
              <option key={x.o} value={x.o}>
                {`${x.o} (${fmt(x.f)} ${flx || 'in focus'})`}
              </option>
            ))}
          </select>
        </label>
        <div className="ow-oc">
          <div className="nm">
            <b>{O.o}</b>
            <small>{`${uniq(O.rows, 'sub').length} sub-portfolios · ${fmt(O.t)} assets`}</small>
          </div>
          <span className="mb">
            {ALL_STATUSES.map((g) =>
              O.c[g] ? (
                <i
                  key={g}
                  style={{ flex: O.c[g], background: STATUS_COLOR[g] }}
                  title={`${STATUS[g][0]}: ${fmt(O.c[g])}`}
                ></i>
              ) : null
            )}
          </span>
          <div className="ow-leg">
            {ALL_STATUSES.filter((g) => O.c[g]).map((g) => (
              <span key={g}>
                <StatusIcon rag={g} />
                {`${STATUS[g][0]} `}
                <b>{fmt(O.c[g])}</b>
              </span>
            ))}
          </div>
        </div>
        <div className="ow-acts">
          <button
            type="button"
            className="ow-xp"
            disabled={!focused.length}
            title="Download what is shown as CSV"
            onClick={exportView}
          >
            Export CSV
          </button>
          <button
            type="button"
            className="ow-ic"
            aria-pressed={expanded}
            aria-label={expanded ? 'Exit full screen' : 'Expand lineage map to full screen'}
            title={expanded ? 'Exit full screen (Esc)' : 'Full screen'}
            onClick={() => setExpanded(!expanded)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path
                d={expanded ? 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5' : 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5'}
              />
            </svg>
          </button>
        </div>
      </div>
      <div className="ow-stage">{stage}</div>
    </section>
  );
}

function ProductsTable({ view }: { view: LoadedView }) {
  const { tableOpen, setTableOpen } = useEosl();
  const { O, productRows, rag } = view;

  const exportTable = () =>
    downloadCsv(
      {
        headers: ['Owner', 'Product', 'Product type', 'Assets', 'Today', 'In 3 months', 'In 6 months', 'In 12 months'],
        rows: productRows.map((x) => [O.o, x.p, x.t, x.h, ...HORIZONS.map((m) => STATUS[rag(x.r, m)][0])]),
      },
      `EOSL-${slug(O.o)}-status-change.csv`
    );

  return (
    <details className="ow-dt" open={tableOpen} onToggle={(e) => setTableOpen(e.currentTarget.open)}>
      <summary>
        {`How ${O.o}'s products change if nothing is fixed`}
        <span>{`${productRows.length} products, today to 12 months`}</span>
      </summary>
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
          <button type="button" className="ow-xp" onClick={exportTable}>
            Export table (CSV)
          </button>
        </div>
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
              {productRows.map((x) => (
                <tr key={x.p}>
                  <td>
                    <b>{x.p}</b>
                    <br />
                    <span className="sub">{x.t}</span>
                  </td>
                  <td>{fmt(x.h)}</td>
                  {HORIZONS.map((m) => (
                    <td key={m}>
                      <StatusTag rag={rag(x.r, m)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}
