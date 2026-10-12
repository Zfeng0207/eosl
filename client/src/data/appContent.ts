/*
 * App content that isn't loaded from Unity Catalog yet. Shared by every data source.
 */
import type { ImpactData, Rag, StatusOption, WorkflowStep } from './types';

// MOCK: Impact Analysis scenarios (the prototype's IMP) and its static table.
export const IMPACT: ImpactData = {
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

// Owner status → RAG (the prototype's SR). Business rule, not data.
export const STATUS_RAG: Readonly<Record<StatusOption, Rag>> = {
  'In Progress': 'amber',
  'Migration Completed': 'green',
  'Renewal Requested': 'amber',
  Decommissioned: 'green',
};

// Renewal approval workflow steps (the prototype's WF + WM). MOCK until the workflow is real.
export const WORKFLOW: readonly WorkflowStep[] = [
  { name: 'Renewal Request', message: 'Renewal request submitted for review.' },
  { name: 'Manager Approval', message: 'Approved by manager, routed to portfolio owner.' },
  { name: 'Portfolio Approval', message: 'Approved by portfolio owner, routed for system update.' },
  { name: 'Automatic Status Update', message: 'Status updated automatically. RAG and dashboards refreshed.' },
];
