-- DRAFT: not loaded by AppKit. Move to config/queries/ once a SQL warehouse is bound and the
-- TODO table names are filled in.
--
-- Headline numbers and per-product dependency clusters for the Impact Analysis page
-- (today these come from MOCK constants in MockEoslDataService). "At risk" = EoSL past or
-- within 12 months.
-- @param product STRING
SELECT
  p.product_name,
  DATE_FORMAT(p.eosl_date, 'MMM yyyy')      AS eosl,
  a.cluster_name,                                   -- TODO: how clusters are defined in the CMDB
  COUNT(DISTINCT a.application_id)          AS applications,
  COUNT(DISTINCT a.business_service)        AS business_services,
  COUNT(DISTINCT sp.portfolio_group)        AS portfolio_groups,
  COUNT(DISTINCT ast.asset_id)              AS assets_at_risk
FROM TODO_catalog.TODO_schema.assets ast                       -- TODO: asset inventory table
JOIN TODO_catalog.TODO_schema.products p USING (product_id)    -- TODO: product lifecycle / EoSL dates
JOIN TODO_catalog.TODO_schema.applications a USING (application_id)       -- TODO: CMDB applications
JOIN TODO_catalog.TODO_schema.sub_portfolios sp USING (sub_portfolio_id)  -- TODO: portfolio hierarchy
WHERE p.product_name = :product
  AND p.eosl_date <= DATE_ADD(CURRENT_DATE(), 365)
GROUP BY ALL
