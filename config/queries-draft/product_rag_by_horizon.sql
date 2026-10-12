-- DRAFT: not loaded by AppKit. Move to config/queries/ once a SQL warehouse is bound and the
-- TODO table names are filled in.
--
-- RAG per product today and projected 3/6/12 months ahead, using the same rule as
-- client/src/data/rag.ts: no EoSL date → grey; else x = days − months × 30.4;
-- x ≤ 90 → red, x ≤ 365 → amber, otherwise green. Status overrides (Update Center) are
-- applied on top of this once they are persisted. TODO: join the overrides table here.
-- @param productType STRING
WITH d AS (
  SELECT
    product_name,
    product_type,
    DATEDIFF(eosl_date, CURRENT_DATE()) AS days
  FROM TODO_catalog.TODO_schema.products              -- TODO: product lifecycle / EoSL dates
  WHERE :productType = 'All' OR product_type = :productType
)
SELECT
  product_name,
  product_type,
  CASE WHEN days IS NULL THEN 'grey' WHEN days <= 90 THEN 'red' WHEN days <= 365 THEN 'amber' ELSE 'green' END AS rag_today,
  CASE WHEN days IS NULL THEN 'grey' WHEN days - 3 * 30.4 <= 90 THEN 'red' WHEN days - 3 * 30.4 <= 365 THEN 'amber' ELSE 'green' END AS rag_3m,
  CASE WHEN days IS NULL THEN 'grey' WHEN days - 6 * 30.4 <= 90 THEN 'red' WHEN days - 6 * 30.4 <= 365 THEN 'amber' ELSE 'green' END AS rag_6m,
  CASE WHEN days IS NULL THEN 'grey' WHEN days - 12 * 30.4 <= 90 THEN 'red' WHEN days - 12 * 30.4 <= 365 THEN 'amber' ELSE 'green' END AS rag_12m
FROM d
