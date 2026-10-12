-- Lineage Explorer rows: one per product -> sub-portfolio -> application path, with its asset
-- count. Shape matches LineageRecord (client/src/data/types.ts); RAG, owners and the map are
-- derived in the browser. Source view: workspace.eosl.lineage_records (synthetic demo estate).
SELECT p, t, d, sub, bu, own, svc, app, biz, env, cia, h, days
FROM workspace.eosl.lineage_records
