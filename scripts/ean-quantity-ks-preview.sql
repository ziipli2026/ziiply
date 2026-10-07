-- Preview deterministic quantity backfill for K/S EAN-bank rows.
-- Read-only: derives quantity only when the product name contains exactly one unambiguous unit expression.
WITH matches AS (
  SELECT p.ean,p.name,p.source,p.quantity,
         regexp_matches(lower(p.name),'(^|[^[:alnum:]])([0-9]+(?:[,.][0-9]+)?)[ ]?(kg|g|ml|cl|dl|l)([^[:alpha:]]|$)','g') AS m
  FROM ziiply_ean_products p
  WHERE trim(coalesce(p.quantity,''))=''
    AND p.source IN ('ruoanhinta-k','ruoanhinta-s')
    AND p.name !~* '([0-9]+[ ]?[x×][ ]?[0-9]+|[0-9]+[ ]?[- ]?pack|[0-9]+[ ]?kpl|monipakkaus|mpk|[0-9]+[ ]?pkt)'
    AND p.name !~* '[0-9]+(?:[,.][0-9]+)?[ ]?(kg|g|ml|cl|dl|l)[ ]*/[ ]*[0-9]'
), candidates AS (
  SELECT ean,min(name) AS name,min(source) AS source,count(*) AS unit_matches,
         min(replace(m[2],',','.')||' '||lower(m[3])) AS proposed_quantity
  FROM matches GROUP BY ean
)
SELECT ean,name,source,proposed_quantity
FROM candidates
WHERE unit_matches=1
ORDER BY source,name,ean;
