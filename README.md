# eosl

A Databricks App powered by [AppKit](https://developers.databricks.com/docs/appkit/v0/), featuring React, TypeScript, and Tailwind CSS.

**Enabled plugins:**

- **Server** -- Express HTTP server with static file serving and Vite dev mode
- **Genie** -- registered only when `DATABRICKS_GENIE_SPACE_ID` is set (see below)

## EOSL Decision Intelligence

A React port of the EOSL Decision Intelligence **Leadership** prototype (`EOSL Helios Leadership.dc.html`, BP palette): a green sidebar with the bp mark, and Lineage Explorer as the front page.

| Route                                                                                         | Page                              | State                                      |
| --------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------ |
| `/lineage` (default)                                                                          | Lineage Explorer (owner view)     | Built, Unity Catalog data                  |
| `/impact`                                                                                     | Impact Analysis                   | Built, mock content (not yet in UC)        |
| `/update-center`                                                                              | EOSL Update Center                | Built; status overrides are kept in memory |
| `/overview`, `/hosts-with-app`, `/hosts-without-app`, `/hosts-without-eosl`, `/database-eosl` | Landscape and host/database views | Placeholders for embedded AI/BI dashboards |

Lineage Explorer is owner-centric. Pick statuses to focus on (Act now, At risk, Supported), a projection horizon and an owner. The page then shows that owner's summary and a "Fix first" item. Below them is a map linking owner, sub-portfolios, technical services, applications and products. Click a node to trace it; the map also has full screen and CSV export. A collapsible table shows how the owner's products change over 12 months.

The "Ask Genie" button and panel appear on every page.

### Run it

```bash
cp .env.example .env   # then fill in your profile and DATABRICKS_WAREHOUSE_ID
pnpm install
pnpm dev               # http://localhost:8000 (redirects to /lineage)
```

The client asks the server which data source is configured (`GET /api/eosl/config`):

- **`DATABRICKS_WAREHOUSE_ID` set:** data comes from Unity Catalog through `analytics()`.
- **No warehouse, `EOSL_USE_MOCK_DATA=true`:** the bundled sample data (the prototype's numbers), for offline UI work.
- **Neither:** the pages say they're not connected.

### Where things live

- `client/src/styles/eosl.css`: the prototype stylesheet, copied verbatim (keep the class names). AppKit UI's Tailwind styles are intentionally not loaded, so they can't override it.
- `client/src/data/`: the data layer. Components read data only through the `EoslDataSource` interface (`EoslDataService.ts`).
  - **Unity Catalog:** `client/src/data/unityCatalog/unityCatalogDataSource.ts`. It runs the queries in `config/queries/` with `useAnalyticsQuery` and checks every row against the expected shape.
  - **Sample data:** `client/src/data/mock/mockDataSource.ts`, with a seeded PRNG (seed 11, today = 2026-10-06), matching the prototype's numbers exactly. Everything in it is synthetic and marked `MOCK`.
  - **Not yet in UC:** Impact Analysis content and the workflow steps, in `client/src/data/appContent.ts`.
  - RAG rule: `client/src/data/rag.ts`.
- `client/src/state/EoslContext.tsx`: shared cross-page state (product type, horizon, status focus, owner, traced node, status overrides, workflow).
- `client/src/components/owner/`: the owner-lineage page logic (`useOwnerView.ts`) and the map with its SVG connectors (`OwnerMap.tsx`).
- `client/src/pages/placeholders.config.ts`: titles and the optional `embedUrl` for each AI/BI placeholder page.
- `config/queries/`: the SQL the app runs (`lineage_records`, `products`, `support_rates`) against `workspace.eosl`. Types are generated into `shared/appkit-types/analytics.d.ts` by `pnpm typegen`.
- `config/queries-draft/impact_summary.sql`: draft for Impact Analysis, not wired yet.
- `scripts/eosl-dataset/`: creates the synthetic dataset in Unity Catalog (see below).
- `reference/` (gitignored): the original prototype files.

### Unity Catalog data

The Lineage Explorer reads `workspace.eosl`, a **synthetic** demo estate: 56 products with approximate EoSL dates, 24 sub-portfolios, 12 owners, 190 applications and 13,573 assets.

| Object                   | What it holds                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `products`               | Product name, type and EoSL date                                                                                                                              |
| `sub_portfolios`         | Sub-portfolio, business unit and owner                                                                                                                        |
| `applications`           | Application, technical service, business service, environment and CIA rating                                                                                  |
| `deployments`            | Which products each application runs on, with asset counts                                                                                                    |
| `assets`                 | One row per asset                                                                                                                                             |
| `extended_support_rates` | Annual extended-support cost per asset, by product type                                                                                                       |
| `lineage_records` (view) | One row per product, sub-portfolio and application path, with the asset count and days until EoSL computed from `CURRENT_DATE()`. This is what the app reads. |

**Recreate it in another account.** Run this with your own profile and warehouse. The last argument is optional: the app's service principal (`databricks apps get eosl` → `service_principal_client_id`), which is granted `USE CATALOG` and `USE SCHEMA` + `SELECT` on the schema. The script uses `CREATE OR REPLACE`, so rerunning it rebuilds the tables.

```bash
scripts/eosl-dataset/run.sh <profile> <warehouse-id> workspace.eosl <app-sp-client-id>
```

If you use a different catalog or schema, update the three files in `config/queries/` and run `pnpm typegen`.

**Deployed app.** The deployed app needs the warehouse bound as an app resource, with `DATABRICKS_WAREHOUSE_ID` set via `app.yaml` `valueFrom`. Until then it shows "not connected".

**Owner status updates** (Update Center) are kept in memory. To persist them, add a Delta or Lakebase table; see the TODO in `updateStatus()`.

### Genie (Ask Genie panel)

The panel talks to the Genie space **EOSL Decision Intelligence**, which sits over `workspace.eosl.lineage_records`, with `extended_support_rates` for cost. The space defines:

- business names and synonyms for the short column names, with value matching on owners, products, applications and so on
- the status filters: Act now ≤ 90 days, At risk ≤ 365 days, Supported, No date
- measures for assets and extended-support cost
- six checked example queries and a short instruction block

`server/server.ts` registers `genie()` only when `DATABRICKS_GENIE_SPACE_ID` is set. Without it, the panel replies "Genie isn't connected yet."

Each answer shows Genie's text, the first 10 rows of its result table, a "Show SQL" toggle and an AI-generated note. Genie's suggested follow-ups replace the page's suggested questions, as in the prototype. Switching page starts a new conversation.

**Recreate it in another account** (after creating the dataset), then put the printed ID in `.env`:

```bash
scripts/eosl-genie/create.sh <profile> <warehouse-id> workspace.eosl
```

The definition lives in `scripts/eosl-genie/build_space.py`. Edit it and recreate the space to change instructions or examples.

**Deployed app:** Genie routes always run as the signed-in user. The app needs:

- a `genie_space` resource (`CAN_RUN`) in `databricks.yml`, exposed as `DATABRICKS_GENIE_SPACE_ID` through `app.yaml` `valueFrom`
- the `genie` user API scope (`user_api_scopes`)

Users also need `SELECT` on `workspace.eosl` and access to the warehouse.

### Embed an AI/BI dashboard

Set `embedUrl` for the page in `client/src/pages/placeholders.config.ts`, using the dashboard's embed link from Databricks. Dashboard embedding must be allowed for this app's domain in the workspace settings.

## Prerequisites

- Node.js v22+ and pnpm
- Databricks CLI (for deployment)
- Access to a Databricks workspace

## Databricks Authentication

### Local Development

For local development, configure your environment variables by creating a `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and set the environment variables you need:

```env
DATABRICKS_HOST=https://your-workspace.cloud.databricks.com
DATABRICKS_APP_PORT=8000
# ... other environment variables, depending on the plugins you use
```

### CLI Authentication

The Databricks CLI requires authentication to deploy and manage apps. Configure authentication using one of these methods:

#### OAuth U2M

Interactive browser-based authentication with short-lived tokens:

```bash
databricks auth login --host https://your-workspace.cloud.databricks.com
```

This will open your browser to complete authentication. The CLI saves credentials to `~/.databrickscfg`.

#### Configuration Profiles

Use multiple profiles for different workspaces:

```ini
[DEFAULT]
host = https://dev-workspace.cloud.databricks.com

[production]
host = https://prod-workspace.cloud.databricks.com
client_id = prod-client-id
client_secret = prod-client-secret
```

Deploy using a specific profile:

```bash
databricks bundle deploy --profile production
```

**Note:** Personal Access Tokens (PATs) are legacy authentication. OAuth is strongly recommended for better security.

## Getting Started

### Install Dependencies

```bash
pnpm install
```

### Development

Run the app in development mode with hot reload:

```bash
pnpm run dev
```

The app will be available at the URL shown in the console output.

### Build

Build both client and server for production:

```bash
pnpm run build
```

This creates:

- `dist/server.js` - Compiled server bundle
- `client/dist/` - Bundled client assets

### Production

Run the production build:

```bash
pnpm start
```

## Code Quality

There are a few commands to help you with code quality:

```bash
# Type checking
pnpm run typecheck

# Linting
pnpm run lint
pnpm run lint:fix

# Formatting
pnpm run format
pnpm run format:fix
```

## Deployment with Databricks Asset Bundles

### 1. Configure Bundle

Update `databricks.yml` with your workspace settings:

```yaml
targets:
  default:
    workspace:
      host: https://your-workspace.cloud.databricks.com
```

Make sure to replace all placeholder values in `databricks.yml` with your actual resource IDs.

### 2. Deploy

Deploy and start the app with a single command:

```bash
databricks apps deploy
```

`databricks apps deploy` validates the project, deploys it, starts the app, and prints its URL.

### Deploy to Production

1. Configure the production target in `databricks.yml`
2. Deploy to production:

```bash
databricks apps deploy -t prod
```

> **Restarting a stopped app:** apps stop after a period of inactivity. To start one again without redeploying, run `databricks apps start <APP_NAME>`.

## Project Structure

```
* client/          # React frontend
  * src/           # Source code
  * public/        # Static assets
* server/          # Express backend
  * server.ts      # Server entry point
  * routes/        # Routes
* shared/          # Shared types
* databricks.yml   # Bundle configuration
* app.yaml         # App configuration
* .env.example     # Environment variables example
```

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: React.js, TypeScript, Vite, Tailwind CSS, React Router
- **UI Components**: Radix UI, shadcn/ui
- **Databricks**: AppKit SDK
