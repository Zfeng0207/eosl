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
   * Height of the embedded dashboard in px. The embed link itself comes from the server
   * (EOSL_EMBED_<PAGE> in the environment); without one the page shows the reserved slot.
   */
  embedHeight?: number;
}

/** Views reserved for embedded Databricks AI/BI dashboards. */
export const PLACEHOLDERS: Readonly<Record<PlaceholderKey, PlaceholderConfig>> = {
  overview: { title: 'Landscape Overview', embedHeight: 1400 },
  'hosts-with-app': { title: 'Host with Application' },
  'hosts-without-app': { title: 'Host without Application' },
  'hosts-without-eosl': { title: 'Host without EoSL' },
  'database-eosl': { title: 'Database EoSL Analysis' },
};
