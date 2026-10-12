import { analytics, createApp, genie, server } from '@databricks/appkit';

// Plugins are only registered when their resource is configured, because AppKit refuses to start
// in production when a registered plugin's required resource is missing. IDs come from the
// environment (app resources via app.yaml `valueFrom`, or .env locally), never from code.
const warehouseConfigured = Boolean(process.env.DATABRICKS_WAREHOUSE_ID);
const genieConfigured = Boolean(process.env.DATABRICKS_GENIE_SPACE_ID);

// Where the client loads EOSL data from: Unity Catalog via analytics() when a warehouse is bound,
// otherwise the bundled MOCK data only when explicitly asked for (e.g. offline UI work).
const dataSource = warehouseConfigured ? 'unity-catalog' : process.env.EOSL_USE_MOCK_DATA === 'true' ? 'mock' : 'none';

createApp({
  plugins: [server(), ...(warehouseConfigured ? [analytics()] : []), ...(genieConfigured ? [genie()] : [])],
  onPluginsReady(appkit) {
    appkit.server.extend((app) => {
      // Lets the client pick its data source and show "not connected" states instead of failing requests.
      app.get('/api/eosl/config', (_req, res) => {
        res.json({ genie: genieConfigured, dataSource });
      });
    });
  },
}).catch(console.error);
