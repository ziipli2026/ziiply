-- READ ONLY: inspect conservative Tokmanni backfill candidates before any UPDATE.
-- Only existing Muut rows from the weekly-offers source are considered.
WITH candidates AS (
  SELECT ean, name, category AS old_category,
    CASE
      WHEN name ~* '(kissan|koiran|lemmikin|marsun|jyrsijän|lemmikki|real dog|bestvet)' THEN 'Lemmikit'
      WHEN name ~* '(deodorantti|deo roll|deo spray|body.?spray|hoitoaine|hiuskiinne|hiusnaamio|hiusvaha|hiusöljy|shampoo|suihkugeeli|saippua|pikkuhousunsuoja|hammastahna|aurinkosuojavoide|kasvovoide|eau de parfum|eau de toilette)' THEN 'Hygienia & kosmetiikka'
      WHEN name ~* '(alumiinifolio|foliovuoka|talouspaperi|wc-paperi|jätesäkki|roskapussi|astianpesuaine|pyykinpesuaine|huuhteluaine|leivinpaperi)' THEN 'Kodinhoito'
      WHEN name ~* '(aakkoset malaco|aarrearkku fazer|malaco|daim|fisherman.s friend|suklaa|karkki|makeinen|pastilli|keksi)' THEN 'Makeiset & keksit'
      WHEN name ~* '(hapankorppu|näkkileipä|ruisleipä|paahtoleipä)' THEN 'Leipomo'
      WHEN name ~* '(oliiviöljy|chia-siemen|spagetti|makaroni|riisi|jauho)' THEN 'Kuivatuotteet'
      WHEN name ~* '(vitamiini|biotiini|ashwagandha|heraproteiini|elektrolyyttijauhe|ravintolisä)' THEN 'Ravintolisät'
      ELSE NULL
    END AS proposed_category
  FROM ziiply_ean_products
  WHERE source = 'tokmanni-viikkotarjoukset'
    AND LOWER(TRIM(COALESCE(category, ''))) = 'muut'
)
SELECT proposed_category, COUNT(*) AS products
FROM candidates
GROUP BY proposed_category
ORDER BY products DESC;
-- For individual candidate review, replace the final SELECT with:
-- SELECT ean, name, old_category, proposed_category FROM candidates
-- WHERE proposed_category IS NOT NULL ORDER BY proposed_category, name;
