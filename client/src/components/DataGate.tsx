import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { createMockDataSource } from '@/data/mock/mockDataSource';
import { createUnityCatalogDataSource } from '@/data/unityCatalog/unityCatalogDataSource';
import { useAppConfig } from '@/lib/appConfig';
import { EoslProvider } from '@/state/EoslContext';

/** Picks the data source the server is configured for and provides it to the pages. */
export function DataGate({ children }: { children: ReactNode }) {
  const config = useAppConfig();
  const kind = config?.dataSource;
  const source = useMemo(
    () => (kind === 'unity-catalog' ? createUnityCatalogDataSource() : kind === 'mock' ? createMockDataSource() : null),
    [kind]
  );

  if (!config) return null;
  if (!source)
    return (
      <p className="sub" style={{ marginTop: 32 }}>
        Not connected to Unity Catalog. Set DATABRICKS_WAREHOUSE_ID (see the README) to load the EOSL estate, or set
        EOSL_USE_MOCK_DATA=true to use the bundled sample data.
      </p>
    );
  return (
    <EoslProvider key={kind} source={source}>
      {children}
    </EoslProvider>
  );
}
