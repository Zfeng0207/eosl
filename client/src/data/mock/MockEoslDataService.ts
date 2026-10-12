/*
 * MOCK DATA. Everything in this file is synthetic, ported as-is from the EOSL v3
 * prototype (reference/eosl-app.js) so the numbers match it exactly. Replace this
 * service with a real EoslDataService backed by analytics() before using the app
 * for decisions.
 */
import type { EoslDataService } from '../EoslDataService';
import type {
  BusinessUnit,
  EoslDataset,
  ImpactData,
  LineageRecord,
  Product,
  ProductType,
  Rag,
  StatusOption,
  WorkflowStep,
} from '../types';
import { mulberry32 } from './prng';

// MOCK: the prototype's fixed "today" and PRNG seed.
const TODAY = new Date('2026-10-06');
const SEED = 11;

// MOCK: products [name, type, EoSL date].
const P: readonly [string, ProductType, string | null][] = [
  ['Windows 10', 'OS', '2025-10-14'],
  ['Windows 11 23H2', 'OS', '2026-10-14'],
  ['Windows Server 2016', 'OS', '2027-01-12'],
  ['RHEL 7.9', 'OS', '2024-06-30'],
  ['Ubuntu 20.04', 'OS', '2025-05-31'],
  ['Amazon Linux 2', 'OS', '2026-06-30'],
  ['Windows Server 2019', 'OS', '2029-01-09'],
  ['SQL Server 2016', 'Database', '2026-07-14'],
  ['Oracle DB 19c', 'Database', '2027-01-31'],
  ['SQL Server 2019', 'Database', '2030-01-08'],
  ['PostgreSQL 12', 'Database', '2024-11-14'],
  ['Apache Tomcat 8.5', 'Software', '2024-03-31'],
  ['Python 2.7 Runtime', 'Software', '2020-01-01'],
  ['Java 8 (Oracle)', 'Software', '2026-12-31'],
  ['Legacy ETL Service', 'Software', null],
  ['Dell PowerEdge R640', 'Hardware', '2026-12-31'],
  ['Cisco 2960 Switches', 'Hardware', '2026-11-30'],
  ['NetApp FAS8200', 'Hardware', '2028-05-31'],
];

// MOCK: sub-portfolios [name, business unit, owner].
const S: readonly [string, BusinessUnit, string][] = [
  ['Wells & Subsurface', 'Upstream', 'Amir Hassan'],
  ['Drilling Automation', 'Upstream', 'Amir Hassan'],
  ['Reliability', 'Upstream', 'Priya Nair'],
  ['Geospatial Platform', 'Digital', 'Priya Nair'],
  ['SCADA Systems', 'Midstream', 'Chen Wei'],
  ['Pipeline Ops', 'Midstream', 'Chen Wei'],
  ['Trading Platforms', 'Downstream', 'Sarah Doyle'],
  ['Retail POS', 'Downstream', 'Sarah Doyle'],
  ['Azure Core', 'Digital', 'Marcus Webb'],
  ['Corporate IT', 'Digital', 'Marcus Webb'],
  ['Finance Systems', 'Corporate', 'Lena Fischer'],
  ['HSE Reporting', 'Corporate', 'Lena Fischer'],
];

// MOCK: application / technical service name builders and business services.
const AP = ['Portal', 'Scheduler', 'Historian', 'Gateway'];
const SV = ['Core Platform', 'Data Services'];
const BZ: Readonly<Record<BusinessUnit, readonly string[]>> = {
  Upstream: ['Well Planning', 'Production Reporting', 'Drilling Ops'],
  Midstream: ['Pipeline Monitoring', 'Flow Control', 'Custody Transfer'],
  Downstream: ['Fuel Sales', 'Trade Settlement', 'Forecourt Payments'],
  Digital: ['Cloud Hosting', 'Geo Services', 'Identity'],
  Corporate: ['Financial Close', 'HSE Compliance', 'Payroll'],
};

// MOCK: extended-support cost per asset per year (USD).
const RATE: Readonly<Record<ProductType, number>> = { OS: 85, Database: 420, Software: 60, Hardware: 150 };

// MOCK: Impact Analysis scenarios (the prototype's IMP) and its static table.
const IMPACT: ImpactData = {
  scenarios: {
    'Oracle Database 19c': {
      eosl: 'Jan 2027',
      clusters: [
        { name: 'Production Cluster', apps: 18 },
        { name: 'DR Cluster', apps: 12 },
        { name: 'Analytics Cluster', apps: 8 },
      ],
      apps: 38,
      recommendation: 'Upgrade is recommended within 6 months, prioritizing the Production cluster first.',
    },
    'Windows 11 23H2': {
      eosl: 'Oct 2026',
      clusters: [
        { name: 'Corporate Desktops', apps: 15 },
        { name: 'Field Laptops', apps: 9 },
        { name: 'Kiosk Fleet', apps: 5 },
      ],
      apps: 29,
      recommendation:
        'EoSL is days away: patch-only exposure starts immediately, so prioritize field laptops handling operational data.',
    },
    'SQL Server 2016': {
      eosl: 'Mar 2027',
      clusters: [
        { name: 'Finance Cluster', apps: 10 },
        { name: 'Reporting Cluster', apps: 8 },
        { name: 'Dev/Test Cluster', apps: 4 },
      ],
      apps: 22,
      recommendation: 'Migrate finance first to avoid an unsupported platform during financial close.',
    },
  },
  defaultScenario: 'Oracle Database 19c',
  topAssets: [
    { asset: 'Oracle DB', eosl: 'Jan 2027', apps: 38 },
    { asset: 'Windows 11', eosl: 'Oct 2026', apps: 29 },
    { asset: 'SQL Server', eosl: 'Mar 2027', apps: 22 },
  ],
};

// MOCK: owner status → RAG (the prototype's SR).
const STATUS_RAG: Readonly<Record<StatusOption, Rag>> = {
  'In Progress': 'amber',
  'Migration Completed': 'green',
  'Renewal Requested': 'amber',
  Decommissioned: 'green',
};

// MOCK: renewal approval workflow (the prototype's WF + WM).
const WORKFLOW: readonly WorkflowStep[] = [
  { name: 'Renewal Request', message: 'Renewal request submitted for review.' },
  { name: 'Manager Approval', message: 'Approved by manager, routed to portfolio owner.' },
  { name: 'Portfolio Approval', message: 'Approved by portfolio owner, routed for system update.' },
  { name: 'Automatic Status Update', message: 'Status updated automatically. RAG and dashboards refreshed.' },
];

/**
 * MOCK lineage records. The PRNG call order (and the random-comparator sorts) must
 * stay exactly as in the prototype, or every generated number changes.
 */
function generateRecords(): LineageRecord[] {
  const R = mulberry32(SEED);
  const D: LineageRecord[] = [];
  P.forEach(([p, t, d], i) => {
    S.map((_, k) => k)
      .sort(() => R() - 0.5)
      .slice(0, 3)
      .forEach((k) => {
        const s = S[k];
        const w = s[0].split(' ')[0];
        [0, 1, 2, 3]
          .sort(() => R() - 0.5)
          .slice(0, 2)
          .forEach((a) =>
            D.push({
              p,
              t,
              d,
              sub: s[0],
              bu: s[1],
              own: s[2],
              svc: w + ' ' + SV[a >> 1],
              app: w + ' ' + AP[a],
              biz: BZ[s[1]][(a + i) % 3],
              env: R() < 0.6 ? 'Production' : 'Non-prod',
              cia: 'EFGH'[Math.floor(R() * 4)],
              h: Math.round(8 + R() * R() * 420),
              days: d ? (new Date(d).getTime() - TODAY.getTime()) / 864e5 : null,
            })
          );
      });
  });
  return D;
}

export class MockEoslDataService implements EoslDataService {
  private dataset: EoslDataset | null = null;

  load(): Promise<EoslDataset> {
    this.dataset ??= {
      products: P.map(([name, type, eosl]): Product => ({ name, type, eosl })),
      records: generateRecords(),
      rates: RATE,
      impact: IMPACT,
      statusRag: STATUS_RAG,
      workflow: WORKFLOW,
    };
    return Promise.resolve(this.dataset);
  }

  updateStatus(_product: string, status: StatusOption): Promise<Rag> {
    // TODO: persist the update (Lakebase table or a Delta table via a server route)
    // so overrides survive reloads and are shared across users. Today they live in
    // React state only.
    return Promise.resolve(STATUS_RAG[status]);
  }
}
