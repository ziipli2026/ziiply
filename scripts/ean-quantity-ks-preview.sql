-- Preview deterministic K/S EAN quantity backfill. Read-only.
-- Handles one unambiguous package-size expression plus explicit approximate weights (n./n).
-- Multipacks and dual-measure names stay outside this automatic batch.
WITH standard_matches AS (
  SELECT p.ean,p.name,p.source,
         regexp_matches(lower(p.name),'(^|[^[:alnum:],.])([0-9]+(?:[,.][0-9]+)?)[ ]?(kg|g|ml|cl|dl|l)([^[:alpha:]]|$)','g') AS m
  FROM ziiply_ean_products p
  WHERE trim(coalesce(p.quantity,''))=''
    AND p.source IN ('ruoanhinta-k','ruoanhinta-s')
    AND p.name !~* '([0-9]+[ ]?[x×][ ]?[0-9]+|[0-9]+[ ]?[- ]?pack|[0-9]+[ ]?kpl|monipakkaus|mpk|[0-9]+[ ]?pkt)'
    AND p.name !~* '[0-9]+(?:[,.][0-9]+)?[ ]?(kg|g|ml|cl|dl|l)[ ]*/[ ]*[0-9]'
), standard AS (
  SELECT ean,min(name) AS name,min(source) AS source,
         min(replace(m[2],',','.')||' '||lower(m[3])) AS proposed_quantity
  FROM standard_matches GROUP BY ean HAVING count(*)=1
), approximate AS (
  SELECT p.ean,p.name,p.source,
         replace((regexp_match(lower(p.name),'(?:^|[^[:alnum:]])n[.~]?[ ]*([0-9]+(?:[,.][0-9]+)?)[ ]?(kg|g)([^[:alpha:]]|$)'))[1],',','.')||' '||
         (regexp_match(lower(p.name),'(?:^|[^[:alnum:]])n[.~]?[ ]*([0-9]+(?:[,.][0-9]+)?)[ ]?(kg|g)([^[:alpha:]]|$)'))[2] AS proposed_quantity
  FROM ziiply_ean_products p
  WHERE trim(coalesce(p.quantity,''))=''
    AND p.source IN ('ruoanhinta-k','ruoanhinta-s')
    AND p.name ~* '(?:^|[^[:alnum:]])n[.~]?[ ]*[0-9]+(?:[,.][0-9]+)?[ ]?(kg|g)([^[:alpha:]]|$)'
), candidates AS (
  SELECT ean,name,source,proposed_quantity FROM standard
  UNION ALL
  SELECT ean,name,source,proposed_quantity FROM approximate
  WHERE ean NOT IN (SELECT ean FROM standard)
)
SELECT ean,name,source,proposed_quantity FROM candidates ORDER BY source,name,ean;
