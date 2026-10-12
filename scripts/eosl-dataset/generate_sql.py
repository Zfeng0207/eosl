"""Synthetic EOSL estate for Unity Catalog (SYNTHETIC demo data, not a real inventory).

Seeded, so every run produces the same data. Writes ordered SQL files to OUT_DIR; run them in
name order against a SQL warehouse (see run.sh). EoSL dates are approximate.

Usage: python3 generate_sql.py OUT_DIR [CATALOG.SCHEMA]   (default schema: workspace.eosl)
"""
import random, sys, os, math

OUT = sys.argv[1]
SCHEMA = sys.argv[2] if len(sys.argv) > 2 else "workspace.eosl"
rnd = random.Random(2026)

def q(v):
    if v is None: return "NULL"
    if isinstance(v, (int, float)): return str(v)
    return "'" + str(v).replace("'", "''") + "'"

# --- products: [name, type, EoSL date or None, selection weight]. Dates are approximate/synthetic.
PRODUCTS = [
 ("Windows 10","OS","2025-10-14",8),("Windows 11 22H2","OS","2025-10-14",4),("Windows 11 23H2","OS","2026-11-10",9),
 ("Windows 11 24H2","OS","2027-10-12",7),("Windows Server 2012 R2","OS","2023-10-10",3),("Windows Server 2016","OS","2027-01-12",9),
 ("Windows Server 2019","OS","2029-01-09",12),("Windows Server 2022","OS","2031-10-14",10),("RHEL 7.9","OS","2024-06-30",4),
 ("RHEL 8.10","OS","2029-05-31",9),("RHEL 9.4","OS","2032-05-31",6),("Ubuntu 18.04 LTS","OS","2023-05-31",2),
 ("Ubuntu 20.04 LTS","OS","2025-05-31",5),("Ubuntu 22.04 LTS","OS","2027-04-30",7),("Amazon Linux 2","OS","2026-06-30",5),
 ("Amazon Linux 2023","OS","2029-06-30",6),("SLES 12 SP5","OS","2024-10-31",2),("SLES 15 SP6","OS","2031-07-31",3),
 ("VMware Photon OS 3","OS","2024-03-01",1),
 ("SQL Server 2014","Database","2024-07-09",3),("SQL Server 2016","Database","2026-07-14",6),("SQL Server 2017","Database","2027-10-12",5),
 ("SQL Server 2019","Database","2030-01-08",9),("SQL Server 2022","Database","2033-01-11",7),("Oracle Database 12c","Database","2022-07-31",2),
 ("Oracle Database 19c","Database","2027-04-30",7),("PostgreSQL 12","Database","2024-11-14",3),("PostgreSQL 13","Database","2025-11-13",4),
 ("PostgreSQL 15","Database","2027-11-11",5),("MySQL 5.7","Database","2023-10-31",2),("MySQL 8.0","Database","2026-04-30",4),
 ("MongoDB 5.0","Database","2024-10-31",2),
 ("Python 2.7 Runtime","Software","2020-01-01",2),("Python 3.9","Software","2025-10-31",5),("Python 3.11","Software","2027-10-31",6),
 ("Java 8 (Oracle)","Software","2026-12-31",7),("Java 17 (Oracle)","Software","2029-09-30",6),("Node.js 18","Software","2025-04-30",4),
 ("Node.js 20","Software","2026-04-30",5),("Node.js 22","Software","2027-04-30",5),("Apache Tomcat 8.5","Software","2024-03-31",3),
 ("Apache Tomcat 9","Software","2027-03-31",5),(".NET 6","Software","2024-11-12",4),(".NET 8","Software","2026-11-10",6),
 ("Legacy ETL Service","Software",None,3),("SAP BusinessObjects 4.2","Software",None,2),("Informatica PowerCenter 10.4","Software",None,2),
 ("Dell PowerEdge R630","Hardware","2024-05-31",3),("Dell PowerEdge R640","Hardware","2026-12-31",6),("Dell PowerEdge R750","Hardware","2030-06-30",5),
 ("HPE ProLiant DL380 Gen9","Hardware","2025-06-30",3),("HPE ProLiant DL380 Gen10","Hardware","2028-11-30",5),("Cisco 2960 Switches","Hardware","2026-11-30",4),
 ("Cisco Catalyst 9300","Hardware","2030-10-31",4),("NetApp FAS8200","Hardware","2028-05-31",3),("Fortinet FortiGate 100E","Hardware",None,2),
]
TYPES = ["OS","Database","Software","Hardware"]
RATES = {"OS":85,"Database":420,"Software":60,"Hardware":150}

BU_SERVICES = {
 "Upstream":["Well Planning","Production Reporting","Drilling Ops","Reservoir Management"],
 "Midstream":["Pipeline Monitoring","Flow Control","Custody Transfer","Terminal Operations"],
 "Downstream":["Fuel Sales","Trade Settlement","Forecourt Payments","Refinery Operations"],
 "Digital":["Cloud Hosting","Geo Services","Identity","Data & Analytics"],
 "Corporate":["Financial Close","HSE Compliance","Payroll","Regulatory Reporting"],
}
SUBS = [  # name, business unit, owner, app/service prefix
 ("Wells & Subsurface","Upstream","Amir Hassan","Wells"),("Drilling Automation","Upstream","Amir Hassan","Drilling"),
 ("Reliability","Upstream","Priya Nair","Reliability"),("Production Optimisation","Upstream","Tomas Ruiz","Production"),
 ("Reservoir Modelling","Upstream","Tomas Ruiz","Reservoir"),("SCADA Systems","Midstream","Chen Wei","SCADA"),
 ("Pipeline Ops","Midstream","Chen Wei","Pipeline"),("Terminals & Storage","Midstream","Fatima Okafor","Terminals"),
 ("Shipping Logistics","Midstream","Fatima Okafor","Shipping"),("Trading Platforms","Downstream","Sarah Doyle","Trading"),
 ("Retail POS","Downstream","Sarah Doyle","Retail"),("Refinery Control","Downstream","Jonas Berg","Refinery"),
 ("Lubricants Supply","Downstream","Jonas Berg","Lubricants"),("Fleet Cards","Downstream","Mei Tanaka","Fleet"),
 ("Azure Core","Digital","Marcus Webb","Azure"),("Corporate IT","Digital","Marcus Webb","Corporate"),
 ("Geospatial Platform","Digital","Priya Nair","Geospatial"),("Data Platform","Digital","Aisha Khan","Data"),
 ("Identity & Access","Digital","Aisha Khan","Identity"),("EV Charging","Digital","Mei Tanaka","EV"),
 ("Finance Systems","Corporate","Lena Fischer","Finance"),("HSE Reporting","Corporate","Lena Fischer","HSE"),
 ("HR & Payroll","Corporate","Ravi Menon","HR"),("Legal & Compliance","Corporate","Ravi Menon","Legal"),
]
SERVICE_KINDS = ["Core Platform","Data Services","Integration Hub","Edge Systems"]
APP_KINDS = ["Portal","Scheduler","Historian","Gateway","Analytics","Reporting","Planner","Monitor","Data Hub","Workbench","API","Mobile"]

def pick(items, weight):
    tot = sum(weight(x) for x in items); r = rnd.random() * tot
    for x in items:
        r -= weight(x)
        if r < 0: return x
    return items[-1]

def count(lo, hi, mu, sigma):
    return max(lo, min(hi, int(round(math.exp(rnd.gauss(mu, sigma))))))

products = [dict(product_id=f"PRD-{i+1:03d}", product_name=n, product_type=t, eosl_date=d, w=w) for i,(n,t,d,w) in enumerate(PRODUCTS)]
by_type = {t:[p for p in products if p["product_type"]==t] for t in TYPES}

subs, apps, deps = [], [], []
for si,(name,bu,owner,prefix) in enumerate(SUBS):
    sid = f"SUB-{si+1:03d}"
    subs.append(dict(sub_portfolio_id=sid, sub_portfolio_name=name, business_unit=bu, owner_name=owner))
    services = [f"{prefix} {k}" for k in rnd.sample(SERVICE_KINDS, rnd.randint(2,3))]
    for kind in rnd.sample(APP_KINDS, rnd.randint(6,10)):
        aid = f"APP-{len(apps)+1:04d}"
        env = "Production" if rnd.random() < 0.65 else "Non-prod"
        apps.append(dict(application_id=aid, application_name=f"{prefix} {kind}", sub_portfolio_id=sid,
                         technical_service=rnd.choice(services), business_service=rnd.choice(BU_SERVICES[bu]),
                         environment=env, cia_rating=rnd.choice("EFGH")))
        scale = 1.0 if env == "Production" else 0.5
        stack = [("OS",1.0,(3,320,3.4,0.9)),("Database",0.7,(1,60,2.0,0.8)),("Software",0.8,(2,200,2.9,0.9)),
                 ("Software",0.35,(2,200,2.6,0.9)),("Hardware",0.4,(1,80,2.3,0.8))]
        used = set()
        for t,prob,(lo,hi,mu,sg) in stack:
            if rnd.random() >= prob: continue
            p = pick([x for x in by_type[t] if x["product_id"] not in used], lambda x: x["w"])
            used.add(p["product_id"])
            deps.append(dict(application_id=aid, product_id=p["product_id"], asset_count=max(1, int(count(lo,hi,mu,sg)*scale))))

os.makedirs(OUT, exist_ok=True)
def values(rows, cols): return ",\n".join("(" + ", ".join(q(r[c]) for c in cols) + ")" for r in rows)
files = {
"01_schema.sql": f"CREATE SCHEMA IF NOT EXISTS {SCHEMA} COMMENT 'EOSL Decision Intelligence demo estate. SYNTHETIC data, not a real inventory.'",
"02_products.sql": f"""CREATE OR REPLACE TABLE {SCHEMA}.products (
  product_id STRING NOT NULL COMMENT 'Product key', product_name STRING NOT NULL, product_type STRING NOT NULL COMMENT 'OS | Database | Software | Hardware',
  eosl_date DATE COMMENT 'End of support life; NULL when unknown. Synthetic, approximate dates.')
COMMENT 'Product lifecycle catalogue (synthetic).'""",
"02b_products_rows.sql": f"""INSERT INTO {SCHEMA}.products
SELECT product_id, product_name, product_type, CAST(eosl_date AS DATE) AS eosl_date FROM VALUES
{values(products, ['product_id','product_name','product_type','eosl_date'])}
AS t(product_id, product_name, product_type, eosl_date)""",
"03_sub_portfolios.sql": f"""CREATE OR REPLACE TABLE {SCHEMA}.sub_portfolios
COMMENT 'Portfolio hierarchy: sub-portfolio, business unit and accountable owner (synthetic).' AS
SELECT * FROM VALUES
{values(subs, ['sub_portfolio_id','sub_portfolio_name','business_unit','owner_name'])}
AS t(sub_portfolio_id, sub_portfolio_name, business_unit, owner_name)""",
"04_applications.sql": f"""CREATE OR REPLACE TABLE {SCHEMA}.applications
COMMENT 'Application catalogue with technical and business service mapping (synthetic).' AS
SELECT * FROM VALUES
{values(apps, ['application_id','application_name','sub_portfolio_id','technical_service','business_service','environment','cia_rating'])}
AS t(application_id, application_name, sub_portfolio_id, technical_service, business_service, environment, cia_rating)""",
"05_deployments.sql": f"""CREATE OR REPLACE TABLE {SCHEMA}.deployments
COMMENT 'Which products each application runs on, and how many assets (synthetic).' AS
SELECT application_id, product_id, CAST(asset_count AS INT) AS asset_count FROM VALUES
{values(deps, ['application_id','product_id','asset_count'])}
AS t(application_id, product_id, asset_count)""",
"06_support_rates.sql": f"""CREATE OR REPLACE TABLE {SCHEMA}.extended_support_rates
COMMENT 'Extended-support cost per asset per year by product type, USD (synthetic).' AS
SELECT * FROM VALUES {", ".join(f"({q(t)}, {RATES[t]})" for t in TYPES)} AS t(product_type, annual_cost_per_asset_usd)""",
"07_assets.sql": f"""CREATE OR REPLACE TABLE {SCHEMA}.assets
COMMENT 'Asset inventory: one row per host, database instance, install or device (synthetic).' AS
SELECT
  format_string('AST-%06d', CAST(row_number() OVER (ORDER BY d.application_id, d.product_id, n) AS INT)) AS asset_id,
  lower(regexp_replace(concat(a.application_name, '-', substr(p.product_type, 1, 2), '-', lpad(CAST(n AS STRING), 3, '0')), '[^A-Za-z0-9]+', '-')) AS asset_name,
  d.product_id, d.application_id, a.environment
FROM {SCHEMA}.deployments d
JOIN {SCHEMA}.applications a USING (application_id)
JOIN {SCHEMA}.products p USING (product_id)
LATERAL VIEW explode(sequence(1, d.asset_count)) s AS n""",
"08_lineage_view.sql": f"""CREATE OR REPLACE VIEW {SCHEMA}.lineage_records
COMMENT 'One row per product -> sub-portfolio -> application path with its asset count. Read by the EOSL app Lineage Explorer.' AS
SELECT
  p.product_name AS p, p.product_type AS t, CAST(p.eosl_date AS STRING) AS d,
  s.sub_portfolio_name AS sub, s.business_unit AS bu, s.owner_name AS own,
  a.technical_service AS svc, a.application_name AS app, a.business_service AS biz,
  a.environment AS env, a.cia_rating AS cia,
  CAST(COUNT(*) AS INT) AS h,
  DATEDIFF(p.eosl_date, CURRENT_DATE()) AS days
FROM {SCHEMA}.assets x
JOIN {SCHEMA}.products p ON p.product_id = x.product_id
JOIN {SCHEMA}.applications a ON a.application_id = x.application_id
JOIN {SCHEMA}.sub_portfolios s ON s.sub_portfolio_id = a.sub_portfolio_id
GROUP BY ALL""",
}
for k,v in files.items(): open(os.path.join(OUT,k),"w").write(v + "\n")
print(f"products={len(products)} subs={len(subs)} owners={len({s['owner_name'] for s in subs})} apps={len(apps)} deployments={len(deps)} assets={sum(d['asset_count'] for d in deps)}")
