-- DRAFT: not loaded by AppKit. Move to config/queries/ once a SQL warehouse is bound and the
-- TODO table names are filled in (typegen runs DESCRIBE QUERY on every file in config/queries/).
--
-- One row per product → sub-portfolio → application dependency, matching LineageRecord in
-- client/src/data/types.ts (the mock service's `records`). RAG is computed client-side so the
-- Lineage Explorer can re-project horizons and apply Update Center overrides instantly.
SELECT
  p.product_name                          AS p,
  p.product_type                          AS t,       -- 'OS' | 'Database' | 'Software' | 'Hardware'
  CAST(p.eosl_date AS STRING)             AS d,       -- YYYY-MM-DD or NULL
  sp.sub_portfolio_name                   AS sub,
  sp.business_unit                        AS bu,
  sp.owner_name                           AS own,
  a.technical_service                     AS svc,
  a.application_name                      AS app,
  a.business_service                      AS biz,
  a.environment                           AS env,     -- 'Production' | 'Non-prod'
  a.cia_rating                            AS cia,
  COUNT(DISTINCT ast.asset_id)            AS h,
  DATEDIFF(p.eosl_date, CURRENT_DATE())   AS days     -- NULL when eosl_date is NULL
FROM TODO_catalog.TODO_schema.assets ast                       -- TODO: asset inventory table
JOIN TODO_catalog.TODO_schema.products p USING (product_id)    -- TODO: product lifecycle / EoSL dates
JOIN TODO_catalog.TODO_schema.applications a USING (application_id)       -- TODO: CMDB applications
JOIN TODO_catalog.TODO_schema.sub_portfolios sp USING (sub_portfolio_id)  -- TODO: portfolio hierarchy
GROUP BY ALL
