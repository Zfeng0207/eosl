# eosl

A Databricks App powered by [AppKit](https://developers.databricks.com/docs/appkit/v0/), featuring React, TypeScript, and Tailwind CSS.

**Enabled plugins:**

- **Server** -- Express HTTP server with static file serving and Vite dev mode
- **Genie** -- registered only when `DATABRICKS_GENIE_SPACE_ID` is set (see below)

## EOSL Decision Intelligence

A React port of the EOSL Decision Intelligence **Leadership** prototype (`EOSL Helios Leadership.dc.html`, BP palette): a green sidebar with the bp mark, and Lineage Explorer as the front page.

| Route                                                                                         | Page                              | State                                      |
| --------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------ |
| `/lineage` (default)                                                                          | Lineage Explorer (owner view)     | Built, mock data                           |
| `/impact`                                                                                     | Impact Analysis                   | Built, mock data                           |
| `/update-center`                                                                              | EOSL Update Center                | Built; status overrides are kept in memory |
| `/overview`, `/hosts-with-app`, `/hosts-without-app`, `/hosts-without-eosl`, `/database-eosl` | Landscape and host/database views | Placeholders for embedded AI/BI dashboards |

Lineage Explorer is owner-centric. Pick statuses to focus on (Act now, At risk, Supported), a projection horizon and an owner. The page then shows that owner's summary and a "Fix first" item. Below them is a map linking owner, sub-portfolios, technical services, applications and products. Click a node to trace it; the map also has full screen and CSV export. A collapsible table shows how the owner's products change over 12 months.

The "Ask Genie" button and panel appear on every page.

### Run it

```bash
pnpm install
pnpm dev          # http://localhost:8000 (redirects to /lineage)
```

### Where things live

- `client/src/styles/eosl.css`: the prototype stylesheet, copied verbatim (keep the class names). AppKit UI's Tailwind styles are intentionally not loaded, so they can't override it.
- `client/src/data/`: the data layer. Components read data only through the `EoslDataService` interface (`EoslDataService.ts`).
  - **Mock data:** `client/src/data/mock/MockEoslDataService.ts`, with a seeded PRNG (seed 11, today = 2026-10-06). Its records match the prototype's numbers exactly. Everything in it is synthetic and marked `MOCK`.
  - RAG rule: `client/src/data/rag.ts`.
- `client/src/state/EoslContext.tsx`: shared cross-page state (product type, horizon, status focus, owner, traced node, status overrides, workflow).
- `client/src/components/owner/`: the owner-lineage page logic (`useOwnerView.ts`) and the map with its SVG connectors (`OwnerMap.tsx`).
- `client/src/pages/placeholders.config.ts`: titles and the optional `embedUrl` for each AI/BI placeholder page.
- `config/queries-draft/`: draft SQL for the real data, with `TODO` table names.
- `reference/` (gitignored): the original prototype files.

### Swap in real data (`analytics()`)

1. Bind a SQL warehouse to the app (a `sql_warehouse` resource in `databricks.yml`, exposed as `DATABRICKS_WAREHOUSE_ID` via `app.yaml` `valueFrom`). For local runs, put `DATABRICKS_WAREHOUSE_ID` in `.env`.
2. Fill in the Unity Catalog table names in `config/queries-draft/*.sql`, then move the files to `config/queries/`. Run `pnpm typegen`.
3. Register `analytics()` in `server/server.ts`. Then write an `EoslDataService` that loads data with the analytics query endpoints. Pass it to `<EoslProvider service={...}>` in `client/src/App.tsx` in place of `MockEoslDataService`. No page code needs to change.
4. To persist Update Center changes (`updateStatus()`, see the TODO in the mock), add a Lakebase or Delta table. Expose it through a server route.

### Connect Genie

1. Add a `genie_space` resource (`CAN_RUN`) to `databricks.yml`. Expose it as `DATABRICKS_GENIE_SPACE_ID` in `app.yaml` with `valueFrom`. For local runs, set it in `.env`.
2. Genie runs as the signed-in user, so enable the `genie` user API scope (`user_api_scopes`) in `databricks.yml`.
3. Restart. `server/server.ts` registers `genie()` only when the variable is set. Until then the panel replies "Genie isn't connected yet."

The Leadership prototype has no suggested questions, so that block is hidden. To show it, add questions per page in `client/src/components/genie/questions.ts`. Genie answers show as plain text. Genie doesn't see the visible page content the way the prototype's assistant did.

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
