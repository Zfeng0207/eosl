/** Sidebar nav, in the Leadership prototype's order (Lineage Explorer first). `key` matches the prototype's page keys. */
export type PageKey = 'ov' | 'wa' | 'na' | 'ne' | 'db' | 'lin' | 'imp' | 'upd';

export interface PageDef {
  key: PageKey;
  path: string;
  label: string;
}

export const PAGES: readonly PageDef[] = [
  { key: 'lin', path: '/lineage', label: 'Lineage Explorer' },
  { key: 'ov', path: '/overview', label: 'Landscape Overview' },
  { key: 'wa', path: '/hosts-with-app', label: 'Host with Application' },
  { key: 'na', path: '/hosts-without-app', label: 'Host without Application' },
  { key: 'ne', path: '/hosts-without-eosl', label: 'Host without EoSL' },
  { key: 'db', path: '/database-eosl', label: 'Database EoSL' },
  { key: 'imp', path: '/impact', label: 'Impact Analysis' },
  { key: 'upd', path: '/update-center', label: 'EOSL Update Center' },
];

export const DEFAULT_PATH = '/lineage';

export function pageForPath(pathname: string): PageDef {
  return PAGES.find((p) => p.path === pathname) ?? PAGES.find((p) => p.path === DEFAULT_PATH)!;
}
