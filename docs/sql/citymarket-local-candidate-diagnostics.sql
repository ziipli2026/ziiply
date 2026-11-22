-- Diagnostic only: potential full-title matches where the catalog name contains
-- additional words such as brand, variant or pack size. These are NOT verified
-- EAN identities and MUST NOT be automatically assigned to offers.
WITH offers AS (
  SELECT DISTINCT x->>'title' AS title
  FROM public.ziiply_kcitymarket_tjek_snapshots s
  CROSS JOIN LATERAL jsonb_array_elements(s.offers) x
  WHERE s.store_key = 'k citymarket hyvinkaa'
), candidates AS (
  SELECT o.title, p.ean, p.name, p.category
  FROM offers o
  JOIN public.ziiply_ean_products p
    ON lower(p.name) LIKE '%' || lower(o.title) || '%'
  WHERE length(o.title) >= 12
    AND p.category IS NOT NULL AND trim(p.category) <> ''
)
SELECT title, count(DISTINCT ean) AS candidate_count,
       min(name) AS example_catalog_name,
       count(DISTINCT category) AS distinct_catalog_categories
FROM candidates
GROUP BY title
ORDER BY candidate_count, title;
