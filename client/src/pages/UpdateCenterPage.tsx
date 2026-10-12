import { useState } from 'react';
import { Card } from '@/components/Card';
import { RagPill } from '@/components/RagPill';
import type { StatusOption } from '@/data/types';
import { useEosl } from '@/state/EoslContext';

const TX = { color: 'var(--tx)' } as const;

export function UpdateCenterPage() {
  const { data, wf, wlog, lastUpdate, submitStatus, advanceWorkflow, resetWorkflow } = useEosl();
  const statuses = Object.keys(data.statusRag) as StatusOption[];
  const [asset, setAsset] = useState(data.products[0].name);
  const [status, setStatus] = useState<StatusOption>(statuses[0]);

  return (
    <>
      <div className="ttl">EOSL Update Center</div>
      <p className="sub">
        Owners update asset status directly. The platform recalculates RAG and notifies stakeholders, so every page
        reflects real-time status.
      </p>
      <div className="grid c22">
        <div className="card f">
          <h2>Owner status update</h2>
          <label htmlFor="ua">ASSET</label>
          <select id="ua" value={asset} onChange={(e) => setAsset(e.target.value)}>
            {data.products.map((p) => (
              <option key={p.name}>{p.name}</option>
            ))}
          </select>
          <label htmlFor="us">NEW STATUS</label>
          <select id="us" value={status} onChange={(e) => setStatus(e.target.value as StatusOption)}>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <br />
          <button type="button" className="act" onClick={() => void submitStatus(asset, status)}>
            Update status
          </button>
        </div>
        <div className="card lgl">
          <h2>System actions</h2>
          <div className="sub" id="sa" aria-live="polite">
            {lastUpdate ? (
              <>
                <div className="e">
                  ✓ <b style={TX}>Database updated</b>
                  {`: ${lastUpdate.product} set to "${lastUpdate.status}"`}
                </div>
                <div className="e">
                  ✓ <b style={TX}>RAG recalculated</b>: <RagPill rag={lastUpdate.previous} upper /> →{' '}
                  <RagPill rag={lastUpdate.next} upper />. Overview and Lineage now reflect it.
                </div>
                <div className="e">
                  ✓ <b style={TX}>Stakeholders notified</b>: portfolio owner, line manager, EOSL programme lead
                </div>
              </>
            ) : (
              'Submit an update to see the platform react automatically.'
            )}
          </div>
        </div>
      </div>
      <Card title="Renewal approval workflow">
        <div className="stp">
          {data.workflow.map((s, i) => (
            <div key={s.name} className={i < wf ? 'd' : i === wf ? 'c' : ''}>
              <i>{i < wf ? '✓' : i + 1}</i>
              {s.name}
            </div>
          ))}
        </div>
        <button type="button" className="act" onClick={advanceWorkflow} style={{ margin: '0 8px 0 0' }}>
          Advance workflow
        </button>
        <button type="button" className="act gh" onClick={resetWorkflow} style={{ margin: 0 }}>
          Reset
        </button>
        <div className="lgl">
          {wlog.map((e) => (
            <div className="e" key={e.name}>
              <b style={TX}>{e.name}</b>
              {`: ${e.message}`}
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}
