-- Controlled deterministic K/S EAN quantity backfill.
-- Run scripts/ean-quantity-ks-preview.sql first. Idempotent; blank quantity only.
BEGIN;
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
), updated AS (
 UPDATE ziiply_ean_products p SET quantity=c.proposed_quantity,updated_at=NOW()
 FROM candidates c WHERE p.ean=c.ean AND p.source=c.source AND trim(coalesce(p.quantity,''))=''
 RETURNING p.ean,p.name,p.source,p.quantity
)
SELECT * FROM updated ORDER BY source,name,ean;
-- Safe default: inspect output; change ONLY ROLLBACK to COMMIT for approved production run.
ROLLBACK;
