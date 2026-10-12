# Dashboard dataset SQL (bare table names; catalog/schema supplied at deploy time).
STATUS = """WITH horizons AS (
  SELECT * FROM VALUES (0, 'Today'), (3, 'In 3 months'), (6, 'In 6 months'), (12, 'In 12 months') AS t(months, projection)
)
SELECT h.projection, h.months AS projection_months, a.product_type, a.sub_portfolio,
  CASE WHEN a.eosl_date IS NULL THEN 'grey'
       WHEN DATEDIFF(a.eosl_date, CURRENT_DATE()) - h.months * 30.4 <= 90 THEN 'red'
       WHEN DATEDIFF(a.eosl_date, CURRENT_DATE()) - h.months * 30.4 <= 365 THEN 'amber'
       ELSE 'green' END AS rag,
  COUNT(*) AS assets
FROM landscape_assets a CROSS JOIN horizons h
GROUP BY ALL"""

TREND = """WITH last AS (SELECT MAX(month_start) AS m FROM landscape_red_trend)
SELECT 'current' AS series, CAST(months_between(t.month_start, add_months(l.m, -12)) AS INT) AS month_index,
  date_format(t.month_start, 'MMM') AS month_label, date_format(t.month_start, 'MMM yyyy') AS month_name,
  t.product_type, t.red_assets
FROM landscape_red_trend t CROSS JOIN last l
WHERE t.month_start >= add_months(l.m, -12)
UNION ALL
SELECT 'previous' AS series, CAST(months_between(t.month_start, add_months(l.m, -24)) AS INT) AS month_index,
  date_format(add_months(t.month_start, 12), 'MMM') AS month_label, date_format(t.month_start, 'MMM yyyy') AS month_name,
  t.product_type, t.red_assets
FROM landscape_red_trend t CROSS JOIN last l
WHERE t.month_start >= add_months(l.m, -24) AND t.month_start <= add_months(l.m, -12)"""

BUDGET = """SELECT fiscal_year, product_type, budget_usd, spent_usd, committed_usd, forecast_usd
FROM landscape_remediation_budget"""

TILES = """SELECT 1 AS tile_order, 'Host with Application' AS tile, COUNT(*) AS assets,
  COUNT_IF(DATEDIFF(os_eosl_date, CURRENT_DATE()) <= 0) AS at_eosl, COUNT_IF(os_eosl_date IS NULL) AS unknown
FROM landscape_hosts WHERE os_eosl_date IS NOT NULL AND application IS NOT NULL
UNION ALL
SELECT 2, 'Host without Application', COUNT(*), COUNT_IF(DATEDIFF(os_eosl_date, CURRENT_DATE()) <= 0), COUNT_IF(os_eosl_date IS NULL)
FROM landscape_hosts WHERE os_eosl_date IS NOT NULL AND application IS NULL
UNION ALL
SELECT 3, 'Host without EoSL', COUNT(*), COUNT_IF(DATEDIFF(os_eosl_date, CURRENT_DATE()) <= 0), COUNT_IF(os_eosl_date IS NULL)
FROM landscape_hosts WHERE os_eosl_date IS NULL
UNION ALL
SELECT 4, 'Database EoSL', COUNT(*), COUNT_IF(DATEDIFF(eosl_date, CURRENT_DATE()) <= 0), COUNT_IF(eosl_date IS NULL)
FROM landscape_databases"""
