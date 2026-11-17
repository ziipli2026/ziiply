-- Read-only coverage audit for K-Citymarket local Tjek campaign offers.
-- Run against the Ziiply Neon database. Never infer or write EANs from titles.
WITH local_offers AS (
  SELECT x->>'title' AS title,
         x->>'ean' AS ean,
         x->>'brand' AS brand,
         x->>'quantity' AS quantity
  FROM public.ziiply_kcitymarket_tjek_snapshots s
  CROSS JOIN LATERAL jsonb_array_elements(s.offers) x
  WHERE s.store_key = 'k citymarket hyvinkaa'
), catalog_matches AS (
  SELECT o.title, o.ean,
         count(DISTINCT p.ean) AS exact_name_ean_candidates,
         count(DISTINCT p.category) FILTER (WHERE p.category IS NOT NULL AND p.category <> '') AS distinct_categories
  FROM local_offers o
  LEFT JOIN public.ziiply_ean_products p
    ON lower(trim(o.title)) = lower(trim(p.name))
  GROUP BY o.title, o.ean
)
SELECT count(*) AS distinct_offer_names,
       count(*) FILTER (WHERE ean ~ '^[0-9]{8,14}$') AS offers_with_ean,
       count(*) FILTER (WHERE exact_name_ean_candidates = 1) AS unique_exact_name_candidates,
       count(*) FILTER (WHERE exact_name_ean_candidates > 1) AS ambiguous_exact_name_candidates,
       count(*) FILTER (WHERE exact_name_ean_candidates = 0) AS unmatched_names,
       count(*) FILTER (WHERE exact_name_ean_candidates = 1 AND distinct_categories = 1) AS unique_name_category_candidates
FROM catalog_matches;
