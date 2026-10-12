export type PlaceholderKey =
  | 'overview'
  | 'hosts-with-app'
  | 'hosts-without-app'
  | 'hosts-without-eosl'
  | 'database-eosl';

export interface PlaceholderConfig {
  /** Page title, as in the prototype. */
  title: string;
  /**
   * Embed URL of the Databricks AI/BI dashboard for this view. When set, the page renders
   * the dashboard in an iframe instead of the reserved slot.
   */
  embedUrl?: string;
}

/** Views reserved for embedded Databricks AI/BI dashboards. */
export const PLACEHOLDERS: Readonly<Record<PlaceholderKey, PlaceholderConfig>> = {
  overview: { title: 'Landscape Overview' },
  'hosts-with-app': { title: 'Host with Application' },
  'hosts-without-app': { title: 'Host without Application' },
  'hosts-without-eosl': { title: 'Host without EoSL' },
  'database-eosl': { title: 'Database EoSL Analysis' },
};
