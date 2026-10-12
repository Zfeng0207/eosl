import { useEffect, useState } from 'react';

export type DataSourceKind = 'unity-catalog' | 'mock' | 'none';

/** What the server has configured (from GET /api/eosl/config). */
export interface AppConfig {
  genie: boolean;
  dataSource: DataSourceKind;
  /** Embed links for AI/BI dashboard pages, keyed by page (e.g. 'overview'). */
  embeds: Readonly<Record<string, string>>;
}

const FALLBACK: AppConfig = { genie: false, dataSource: 'none', embeds: {} };
let request: Promise<AppConfig> | null = null;

async function fetchConfig(): Promise<AppConfig> {
  try {
    const r = await fetch('/api/eosl/config');
    if (!r.ok) return FALLBACK;
    const c = (await r.json()) as Partial<AppConfig>;
    const dataSource: DataSourceKind =
      c.dataSource === 'unity-catalog' || c.dataSource === 'mock' ? c.dataSource : 'none';
    const embeds = Object.fromEntries(
      Object.entries(c.embeds ?? {}).filter(([, url]) => typeof url === 'string' && url.startsWith('https://'))
    );
    return { genie: Boolean(c.genie), dataSource, embeds };
  } catch {
    return FALLBACK;
  }
}

function loadConfig(): Promise<AppConfig> {
  request ??= fetchConfig();
  return request;
}

/** Server configuration, fetched once per page load; null until it arrives. */
export function useAppConfig(): AppConfig | null {
  const [config, setConfig] = useState<AppConfig | null>(null);
  useEffect(() => {
    let live = true;
    void loadConfig().then((c) => live && setConfig(c));
    return () => {
      live = false;
    };
  }, []);
  return config;
}
