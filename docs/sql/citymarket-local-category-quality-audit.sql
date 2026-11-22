-- Read-only quality audit for local Citymarket Tjek offers.
-- This does not infer or assign EANs, and does not change categories.
WITH offers AS (
 SELECT x->>'title' AS title,
        x->>'category' AS category,
        x->>'additionalInfo' AS additional_info,
        x->>'offerId' AS offer_id
 FROM public.ziiply_kcitymarket_tjek_snapshots s
 CROSS JOIN LATERAL jsonb_array_elements(s.offers) x
 WHERE s.store_key = 'k citymarket hyvinkaa'
)
SELECT category, count(*) AS offers,
       count(*) FILTER (WHERE nullif(trim(additional_info),'') IS NOT NULL) AS with_additional_info,
       count(*) FILTER (WHERE additional_info ~* '(^|[[:space:]])[0-9]+([,.][0-9]+)?[[:space:]]*(g|kg|ml|l|kpl|pkt)([^[:alpha:]]|$)') AS with_size_like_text,
       count(*) FILTER (WHERE title ~* '(tai|sekä|valikoima|sarja|tuotteet)') AS possible_multi_product_offers
FROM offers
GROUP BY category
ORDER BY offers DESC;

-- Inspect provenance and descriptions before adding any category override.
SELECT category, title, additional_info, offer_id
FROM offers
WHERE category IN ('Koti & vapaa-aika','Muut')
ORDER BY category, title;
