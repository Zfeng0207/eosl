import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { fmt } from '@/lib/format';
import { useEosl } from '@/state/EoslContext';
import { STATUS, STATUS_COLOR } from './status';
import { StatusIcon } from './StatusIcon';
import { MAX_NODES } from './useOwnerView';
import type { Edge, OwnerView } from './useOwnerView';

const delay = (d: number) => ({ '--d': d }) as CSSProperties;

/**
 * Owner → sub-portfolio → service → application → product columns, joined by SVG curves.
 * Curves are drawn imperatively after layout from the nodes' measured positions, as in the
 * prototype's wire(); the map animates in only when the owner changes.
 */
export function OwnerMap({ view }: { view: Extract<OwnerView, { focused: unknown }> }) {
  const { type, hz, focus, overrides, expanded, trace, toggleTrace, shouldAnimateOwner } = useEosl();
  const mapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const edgesRef = useRef<{ edges: readonly Edge[]; tracing: boolean }>({ edges: [], tracing: false });
  const owner = view.O.o;
  // What the prototype redraws on (besides the owner); a redraw drops the entrance animation.
  const redraw = `${type}|${hz}|${[...focus].join()}|${trace ? `${trace.k}|${trace.v}` : ''}|${expanded}`;
  const lastRedraw = useRef<{ key: string; overrides: unknown } | null>(null);

  const wire = useCallback(() => {
    const m = mapRef.current;
    const sv = svgRef.current;
    if (!m || !sv) return;
    const R0 = m.getBoundingClientRect();
    const pos: Record<string, { a: number; z: number; y: number }> = {};
    sv.setAttribute('width', String(m.offsetWidth));
    sv.setAttribute('height', String(m.offsetHeight));
    m.querySelectorAll<HTMLElement>('[data-n]').forEach((e) => {
      const r = e.getBoundingClientRect();
      pos[e.dataset.n ?? ''] = { a: r.left - R0.left, z: r.right - R0.left, y: r.top - R0.top + r.height / 2 };
    });
    const { edges, tracing } = edgesRef.current;
    sv.innerHTML = edges
      .map(([a, z, g, l]) => {
        const A = pos[a];
        const B = pos[z];
        if (!A || !B) return '';
        const x = (A.z + B.a) / 2;
        return `<path d="M${A.z},${A.y} C${x},${A.y} ${x},${B.y} ${B.a},${B.y}" fill="none" style="stroke:${STATUS_COLOR[g]};stroke-width:${l ? 3 : 1.5};stroke-opacity:${tracing ? (l ? 1 : 0.08) : 0.45}"/>`;
      })
      .join('');
  }, []);

  // After every render: animate in when the owner changes, stop animating once anything else
  // the prototype redraws on changes (re-renders that change neither leave it alone), then redraw the curves.
  useLayoutEffect(() => {
    edgesRef.current = { edges: view.edges, tracing: !!trace };
    const m = mapRef.current;
    const prev = lastRedraw.current;
    if (m) {
      if (shouldAnimateOwner(owner)) m.classList.add('ow-anim');
      else if (prev && (prev.key !== redraw || prev.overrides !== overrides)) m.classList.remove('ow-anim');
    }
    lastRedraw.current = { key: redraw, overrides };
    wire();
  });

  useEffect(() => {
    window.addEventListener('resize', wire);
    void document.fonts?.ready.then(wire);
    return () => window.removeEventListener('resize', wire);
  }, [wire]);

  return (
    <div className="ow-mapw">
      {/* Keyed by owner so the entrance animation replays for each newly chosen owner. */}
      <div className="ow-map" id="owmap" ref={mapRef} key={owner}>
        <svg className="ow-svg" aria-hidden="true" ref={svgRef}></svg>
        <div className="ow-col" style={delay(0)}>
          <h4>Owner</h4>
          <div className="ow-own" data-n={`own|${owner}`}>
            <b>{owner}</b>
            <em>{fmt(view.total)}</em>
            <small>{`assets ${view.flx} ${view.when}`}</small>
          </div>
        </div>
        {view.columns.map(({ k, label, items, lit }, ci) => (
          <div className="ow-col" style={delay(ci + 1)} key={k}>
            <h4>
              {label}
              <span>{items.length}</span>
            </h4>
            {items.slice(0, MAX_NODES).map((x) => {
              const on = trace?.k === k && trace.v === x.n;
              return (
                <button
                  type="button"
                  key={x.n}
                  className={`ow-n ${lit(x.n) ? '' : 'dim'} ${on ? 'on' : ''}`}
                  data-n={`${k}|${x.n}`}
                  title={`${x.n}: ${STATUS[x.g][0]}`}
                  aria-pressed={on}
                  onClick={() => toggleTrace({ k, v: x.n })}
                >
                  <StatusIcon rag={x.g} />
                  <span className="t">{x.n}</span>
                  <b>{fmt(x.h)}</b>
                </button>
              );
            })}
            {items.length > MAX_NODES && (
              <div className="ow-more">{`+${items.length - MAX_NODES} more in the full explorer below`}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
