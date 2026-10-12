"""SQL for the synthetic EOSL landscape estate (Landscape Overview dashboard).

Input: estate.json produced by running the prototype's seeded generator in Chrome
(extract_estate.mjs). Output: ordered .sql files for OUT_DIR. SYNTHETIC demo data.
Usage: python3 generate_sql.py estate.json OUT_DIR [CATALOG.SCHEMA]   (default: workspace.eosl)
"""
import json, os, sys
from datetime import date

ESTATE, OUT = sys.argv[1], sys.argv[2]
SCHEMA = sys.argv[3] if len(sys.argv) > 3 else "workspace.eosl"
AS_OF = date(2026, 10, 6)  # the prototype's "today"; trend and budget snapshots are taken at this date
e = json.load(open(ESTATE))
D, H, DB = e["D"], e["H"], e["DB"]

def q(v):
    if v is None: return "NULL"
    if isinstance(v, bool): return "true" if v else "false"
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"

def values(rows): return ",\n".join("(" + ", ".join(q(x) for x in r) + ")" for r in rows)

def rag(days, months=0):
    if days is None: return "grey"
    x = days - months * 30.4
    return "red" if x <= 90 else "amber" if x <= 365 else "green"

files = {}
# 1. Deployments (product x sub-portfolio x application) with asset counts, exploded into one row per asset.
dep = [(i + 1, r["p"], r["t"], r["d"], r["sub"], r["bu"], r["own"], r["svc"], r["app"], r["biz"],
        "Production" if r["env"] == "Production" else "Non-production", r["cia"], r["h"]) for i, r in enumerate(D)]
files["10_landscape_assets.sql"] = f"""CREATE OR REPLACE TABLE {SCHEMA}.landscape_assets
COMMENT 'Landscape estate: one row per asset with its product lifecycle, ownership and application (SYNTHETIC demo data).' AS
WITH dep AS (
  SELECT * FROM VALUES
{values(dep)}
  AS t(deployment_id, product_name, product_type, eosl_date, sub_portfolio, business_unit, owner, technical_service, application, business_service, environment, cia_rating, asset_count)
)
SELECT
  format_string('LA-%06d', CAST(row_number() OVER (ORDER BY deployment_id, n) AS INT)) AS asset_id,
  product_name, product_type, CAST(eosl_date AS DATE) AS eosl_date,
  sub_portfolio, business_unit, owner, technical_service, application, business_service, environment, cia_rating
FROM dep LATERAL VIEW explode(sequence(1, asset_count)) s AS n"""

# 2. Hosts (cloud VMs and on-premise servers)
hosts = [(r["name"], r["id"], r["type"], r["cloud"], r["env"], r["os"], r["osg"], r["d"], r["app"], r["life"], r["time"], r["cia"],
          r["sub"], r["bu"], r["own"], r["grp"], r["pf"], r["svc"], r["lead"]) for r in H]
files["20_landscape_hosts.sql"] = f"""CREATE OR REPLACE TABLE {SCHEMA}.landscape_hosts
COMMENT 'Host inventory: cloud VMs and on-premise servers with OS lifecycle and hosted application, if any (SYNTHETIC demo data).' AS
SELECT host_name, host_id, host_type, cloud, environment, os_name, os_group, CAST(os_eosl_date AS DATE) AS os_eosl_date,
  application, lifecycle_status, time_model, cia_rating, sub_portfolio, business_unit, owner, portfolio_group, portfolio, technical_service, technical_lead
FROM VALUES
{values(hosts)}
AS t(host_name, host_id, host_type, cloud, environment, os_name, os_group, os_eosl_date, application, lifecycle_status, time_model, cia_rating, sub_portfolio, business_unit, owner, portfolio_group, portfolio, technical_service, technical_lead)"""

# 3. Database instances
dbs = [(r["name"], r["id"], r["type"], r["status"], r["env"], r["os"], None if r["ms"] == "n/a" else r["ms"], r["d"], r["app"], r["life"],
        r["sub"], r["bu"], r["own"], r["grp"], r["pf"], r["svc"], r["lead"]) for r in DB]
files["30_landscape_databases.sql"] = f"""CREATE OR REPLACE TABLE {SCHEMA}.landscape_databases
COMMENT 'Database instance inventory with product lifecycle (SYNTHETIC demo data).' AS
SELECT database_name, database_id, instance_type, run_status, environment, product_name,
  CAST(mainstream_end_date AS DATE) AS mainstream_end_date, CAST(eosl_date AS DATE) AS eosl_date,
  application, lifecycle_status, sub_portfolio, business_unit, owner, portfolio_group, portfolio, technical_service, technical_lead
FROM VALUES
{values(dbs)}
AS t(database_name, database_id, instance_type, run_status, environment, product_name, mainstream_end_date, eosl_date, application, lifecycle_status, sub_portfolio, business_unit, owner, portfolio_group, portfolio, technical_service, technical_lead)"""

# 4. Monthly red-asset snapshots per product type (Oct 2024 .. Oct 2026), scaled from the as-of red counts
TY = [1.5, 1.48, 1.42, 1.38, 1.3, 1.25, 1.2, 1.12, 1.08, 1.05, 1.12, 1.14, 1]
LY = [2, 2.05, 2.1, 2.15, 2.1, 2.05, 2, 1.95, 1.9, 1.8, 1.7, 1.6, 1.5]
factors = LY + TY[1:]  # 25 months, LY[12] == TY[0]
red_now = {}
for r in D:
    if rag(r["days"]) == "red": red_now[r["t"]] = red_now.get(r["t"], 0) + r["h"]
trend = []
for i, f in enumerate(factors):
    m = (AS_OF.month - 1 + i - 24) % 12 + 1
    y = AS_OF.year + (AS_OF.month - 1 + i - 24) // 12
    for t in ["OS", "Database", "Software", "Hardware"]:
        trend.append((f"{y:04d}-{m:02d}-01", t, round(f * red_now.get(t, 0))))
files["40_landscape_red_trend.sql"] = f"""CREATE OR REPLACE TABLE {SCHEMA}.landscape_red_trend
COMMENT 'Month-end snapshots of red assets (past EoSL or within 90 days) by product type (SYNTHETIC demo data).' AS
SELECT CAST(month_start AS DATE) AS month_start, product_type, CAST(red_assets AS INT) AS red_assets FROM VALUES
{values(trend)}
AS t(month_start, product_type, red_assets)"""

# 5. FY26 remediation budget, split by each product type's share of assets
TOT = {"budget_usd": 4.8e6, "spent_usd": 2.1e6, "committed_usd": 1.3e6, "forecast_usd": 5.4e6}
assets = {}
for r in D: assets[r["t"]] = assets.get(r["t"], 0) + r["h"]
total = sum(assets.values())
budget = [("FY26", t, *[round(v * assets[t] / total, 2) for v in TOT.values()]) for t in ["OS", "Database", "Software", "Hardware"]]
files["50_landscape_remediation_budget.sql"] = f"""CREATE OR REPLACE TABLE {SCHEMA}.landscape_remediation_budget
COMMENT 'EOSL remediation budget, spend, commitments and forecast by product type (SYNTHETIC demo data).' AS
SELECT fiscal_year, product_type, CAST(budget_usd AS DECIMAL(14,2)) AS budget_usd, CAST(spent_usd AS DECIMAL(14,2)) AS spent_usd,
  CAST(committed_usd AS DECIMAL(14,2)) AS committed_usd, CAST(forecast_usd AS DECIMAL(14,2)) AS forecast_usd
FROM VALUES
{values(budget)}
AS t(fiscal_year, product_type, budget_usd, spent_usd, committed_usd, forecast_usd)"""

os.makedirs(OUT, exist_ok=True)
for k, v in files.items(): open(os.path.join(OUT, k), "w").write(v + "\n")
print(f"assets={total} hosts={len(H)} databases={len(DB)} trend_rows={len(trend)} red_now={red_now}")
