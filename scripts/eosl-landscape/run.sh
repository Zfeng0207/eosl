#!/usr/bin/env bash
# Create the synthetic landscape tables and the "EOSL Landscape Overview" AI/BI dashboard.
# Usage: scripts/eosl-landscape/run.sh <profile> <warehouse-id> [catalog] [schema]
set -euo pipefail
PROFILE="${1:?profile}"; WAREHOUSE="${2:?warehouse id}"; CATALOG="${3:-workspace}"; SCHEMA="${4:-eosl}"
DIR="$(cd "$(dirname "$0")" && pwd)"; OUT="$(mktemp -d)"
python3 -I "$DIR/generate_sql.py" "$DIR/estate.json" "$OUT" "$CATALOG.$SCHEMA"
for f in "$OUT"/*.sql; do echo "running $(basename "$f")"; databricks experimental aitools tools query --profile "$PROFILE" --warehouse "$WAREHOUSE" --output json --file "$f" >/dev/null; done
(cd "$DIR" && python3 -I build_dashboard.py) > "$OUT/dashboard.json"
ME="$(databricks current-user me --profile "$PROFILE" -o json | python3 -I -c 'import json,sys; print(json.load(sys.stdin)["userName"])')"
databricks workspace mkdirs "/Workspace/Users/$ME/dashboards" --profile "$PROFILE"
ID="$(databricks lakeview create --profile "$PROFILE" --display-name "EOSL Landscape Overview" --warehouse-id "$WAREHOUSE" \
  --dataset-catalog "$CATALOG" --dataset-schema "$SCHEMA" --serialized-dashboard "$(cat "$OUT/dashboard.json")" \
  --json "{\"parent_path\": \"/Workspace/Users/$ME/dashboards\"}" -o json | python3 -I -c 'import json,sys; print(json.load(sys.stdin)["dashboard_id"])')"
databricks lakeview publish "$ID" --warehouse-id "$WAREHOUSE" --profile "$PROFILE" >/dev/null
echo "dashboard: $ID (published)"
