import { analytics, createApp, genie, server } from '@databricks/appkit';

// Plugins are only registered when their resource is configured, because AppKit refuses to start
// in production when a registered plugin's required resource is missing. IDs come from the
// environment (app resources via app.yaml `valueFrom`, or .env locally), never from code.
const warehouseConfigured = Boolean(process.env.DATABRICKS_WAREHOUSE_ID);
const genieConfigured = Boolean(process.env.DATABRICKS_GENIE_SPACE_ID);

// Where the client loads EOSL data from: Unity Catalog via analytics() when a warehouse is bound,
// otherwise the bundled MOCK data only when explicitly asked for (e.g. offline UI work).
const dataSource = warehouseConfigured ? 'unity-catalog' : process.env.EOSL_USE_MOCK_DATA === 'true' ? 'mock' : 'none';

// Embed links for the AI/BI dashboard pages, e.g. EOSL_EMBED_OVERVIEW=https://<host>/embed/dashboardsv3/<id>?o=<workspace-id>.
// Workspace-specific, so they live in the environment (.env locally), never in code.
const EMBED_PAGES = ['overview', 'hosts-with-app', 'hosts-without-app', 'hosts-without-eosl', 'database-eosl'];
const embeds = Object.fromEntries(
  EMBED_PAGES.map((page) => [page, process.env[`EOSL_EMBED_${page.toUpperCase().replace(/-/g, '_')}`]]).filter(
    (e): e is [string, string] => typeof e[1] === 'string' && e[1].startsWith('https://')
  )
);

createApp({
  plugins: [server(), ...(warehouseConfigured ? [analytics()] : []), ...(genieConfigured ? [genie()] : [])],
  onPluginsReady(appkit) {
    appkit.server.extend((app) => {
      // Lets the client pick its data source and show "not connected" states instead of failing requests.
      app.get('/api/eosl/config', (_req, res) => {
        res.json({ genie: genieConfigured, dataSource, embeds });
      });
    });
  },
}).catch(console.error);
