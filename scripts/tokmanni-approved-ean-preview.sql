-- Explicit EAN-based, reviewable Tokmanni backfill. READ ONLY.
-- No heuristic mass update: only these independently recognizable products.
WITH approved(ean, proposed_category) AS (
 VALUES
 ('6420256016237','Makeiset & keksit'),
 ('6420256914373','Makeiset & keksit'),
 ('6410500090014','Leipomo'),
 ('6411402976802','Leipomo'),
 ('6411402979902','Leipomo'),
 ('6430039222342','Kuivatuotteet'),
 ('6438565137550','Kodinhoito'),
 ('8001090131294','Hygienia & kosmetiikka'),
 ('8720181027741','Hygienia & kosmetiikka'),
 ('6430039223172','Kuivatuotteet')
)
SELECT p.ean,p.name,p.category AS current_category,a.proposed_category,
 CASE WHEN p.ean IS NULL THEN 'EAN MISSING'
      WHEN p.source <> 'tokmanni-viikkotarjoukset' THEN 'SOURCE CHANGED'
      WHEN lower(trim(coalesce(p.category,''))) <> 'muut' THEN 'ALREADY CLASSIFIED'
      ELSE 'ELIGIBLE' END AS status
FROM approved a
LEFT JOIN ziiply_ean_products p ON p.ean=a.ean
ORDER BY status,p.name;
