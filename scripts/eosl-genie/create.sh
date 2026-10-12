#!/usr/bin/env bash
# Create the "EOSL Decision Intelligence" Genie space over the EOSL dataset and print its ID.
# Usage: scripts/eosl-genie/create.sh <profile> <warehouse-id> [catalog.schema]
# Then put the printed ID in .env as DATABRICKS_GENIE_SPACE_ID (never commit it).
set -euo pipefail
PROFILE="${1:?profile}"; WAREHOUSE="${2:?warehouse id}"; SCHEMA="${3:-workspace.eosl}"
DIR="$(cd "$(dirname "$0")" && pwd)"; TMP="$(mktemp -d)"
ME="$(databricks current-user me --profile "$PROFILE" -o json | python3 -I -c 'import json,sys; print(json.load(sys.stdin)["userName"])')"
PARENT="/Workspace/Users/$ME/genie_spaces"
databricks workspace mkdirs "$PARENT" --profile "$PROFILE"
python3 -I "$DIR/build_space.py" "$SCHEMA" > "$TMP/space.json"
python3 -I - "$TMP/space.json" "$WAREHOUSE" "$PARENT" "$SCHEMA" > "$TMP/create.json" <<'PY'
import json, sys
space, wh, parent, schema = open(sys.argv[1]).read(), sys.argv[2], sys.argv[3], sys.argv[4]
print(json.dumps({
    "warehouse_id": wh,
    "title": "EOSL Decision Intelligence",
    "description": "Answers leadership questions about end-of-support-life (EoSL) risk across OS, database, software and hardware: which owners, sub-portfolios, applications and products are Act now, At risk or Supported, projected statuses, and extended-support cost. Synthetic demo estate in " + schema + ".",
    "parent_path": parent,
    "serialized_space": space,
}))
PY
databricks genie create-space --json "@$TMP/create.json" --profile "$PROFILE" -o json \
  | python3 -I -c 'import json,sys; print("DATABRICKS_GENIE_SPACE_ID=" + json.load(sys.stdin)["space_id"])'
