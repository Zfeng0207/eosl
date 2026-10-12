-- Product catalogue with EoSL dates (Update Center asset list).
SELECT product_name AS name, product_type AS type, CAST(eosl_date AS STRING) AS eosl
FROM workspace.eosl.products
ORDER BY CASE product_type WHEN 'OS' THEN 1 WHEN 'Database' THEN 2 WHEN 'Software' THEN 3 ELSE 4 END, product_name
