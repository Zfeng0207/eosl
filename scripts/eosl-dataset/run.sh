#!/usr/bin/env bash
# Create the synthetic EOSL estate in Unity Catalog and grant the app read access.
# Usage: scripts/eosl-dataset/run.sh <profile> <warehouse-id> [catalog.schema] [app-service-principal-client-id]
# The app's queries (config/queries/*.sql) read workspace.eosl; change them if you use another schema.
set -euo pipefail
PROFILE="${1:?profile}"; WAREHOUSE="${2:?warehouse id}"; SCHEMA="${3:-workspace.eosl}"; SP="${4:-}"
DIR="$(cd "$(dirname "$0")" && pwd)"; OUT="$(mktemp -d)"
python3 -I "$DIR/generate_sql.py" "$OUT" "$SCHEMA"
q() { databricks experimental aitools tools query --profile "$PROFILE" --warehouse "$WAREHOUSE" --output json "$@" >/dev/null; }
for f in "$OUT"/*.sql; do echo "running $(basename "$f")"; q --file "$f"; done
if [ -n "$SP" ]; then
  q "GRANT USE CATALOG ON CATALOG ${SCHEMA%%.*} TO \`$SP\`"
  q "GRANT USE SCHEMA, SELECT ON SCHEMA $SCHEMA TO \`$SP\`"
  echo "granted read access on $SCHEMA to $SP"
fi
echo "done: $SCHEMA"
