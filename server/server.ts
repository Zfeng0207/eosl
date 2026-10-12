import { createApp, genie, server } from '@databricks/appkit';

// Genie is optional. It is only registered when a space is configured, because AppKit
// refuses to start in production when a registered plugin's required resource is missing.
// The space ID comes from the environment (app resource via app.yaml `valueFrom`, or .env locally).
const genieConfigured = Boolean(process.env.DATABRICKS_GENIE_SPACE_ID);

// TODO: register analytics() once a SQL warehouse is bound (DATABRICKS_WAREHOUSE_ID), move
// config/queries-draft/*.sql into config/queries/, and back the client's EoslDataService with it.
createApp({
  plugins: [server(), ...(genieConfigured ? [genie()] : [])],
  onPluginsReady(appkit) {
    appkit.server.extend((app) => {
      // Lets the client show "Genie isn't connected yet." instead of failing requests.
      app.get('/api/eosl/config', (_req, res) => {
        res.json({ genie: genieConfigured });
      });
    });
  },
}).catch(console.error);
