import { Card } from '@/components/Card';
import type { CsvTable } from '@/lib/csv';
import { useEosl } from '@/state/EoslContext';

const TOP_TITLE = 'Top impact by asset';

export function ImpactPage() {
  const { data, impSel, setImpSel } = useEosl();
  const { scenarios, topAssets } = data.impact;
  const s = scenarios[impSel];

  const csv: CsvTable = {
    headers: ['Asset', 'EOSL date', 'Applications impacted'],
    rows: topAssets.map((r) => [r.asset, r.eosl, r.apps]),
  };

  // Headline numbers and copy are static in the prototype. MOCK until backed by real data.
  return (
    <>
      <div className="ttl">Impact Analysis</div>
      <div className="grid c4">
        <div className="card k red">
          <div className="n">2,711</div>
          <div className="l">Assets at risk</div>
        </div>
        <div className="card k amber">
          <div className="n">38</div>
          <div className="l">Applications impacted</div>
        </div>
        <div className="card">
          <div className="n" style={{ fontSize: 25, fontWeight: 700 }}>
            31
          </div>
          <div className="l sub">Business services impacted</div>
        </div>
        <div className="card">
          <div className="n" style={{ fontSize: 25, fontWeight: 700 }}>
            12
          </div>
          <div className="l sub">Portfolio groups impacted</div>
        </div>
      </div>
      <div className="bar2">
        <select aria-label="Product" value={impSel} onChange={(e) => setImpSel(e.target.value)}>
          {Object.keys(scenarios).map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <span className="sub" style={{ alignSelf: 'center' }}>
          Dependency tree traced to business impact, summarized by AI
        </span>
      </div>
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="node">
          <b>{impSel}</b>
          {`EOSL ${s.eosl}`}
        </div>
        <div className="stem"></div>
        <div className="lv">
          {s.clusters.map((c) => (
            <div className="node" key={c.name}>
              <b>{c.name}</b>
              {`${c.apps} applications`}
            </div>
          ))}
        </div>
        <div className="stem"></div>
        <div className="node">
          <b>Business &amp; Customer Impact</b>31 services · 12 portfolio groups
        </div>
        <div className="stem"></div>
        <div className="ai" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'left' }}>
          <b>AI SUMMARY</b>{' '}
          {`${s.apps} applications across ${s.clusters.length} clusters depend on ${impSel}. Losing support introduces service-continuity and compliance risk across 12 portfolio groups. ${s.recommendation}`}
        </div>
      </div>
      <Card title={TOP_TITLE} csv={csv}>
        <div className="tw">
          <table>
            <tbody>
              <tr>
                {csv.headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
              {topAssets.map((r) => (
                <tr key={r.asset}>
                  <td>{r.asset}</td>
                  <td>{r.eosl}</td>
                  <td>{r.apps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
