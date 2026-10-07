-- Controlled deterministic quantity backfill for K/S EAN-bank rows.
-- Run scripts/ean-quantity-ks-preview.sql first.
-- Idempotent: updates ONLY rows whose quantity is still blank.
BEGIN;
WITH matches AS (
  SELECT p.ean,p.name,p.source,
         regexp_matches(lower(p.name),'(^|[^[:alnum:]])([0-9]+(?:[,.][0-9]+)?)[ ]?(kg|g|ml|cl|dl|l)([^[:alpha:]]|$)','g') AS m
  FROM ziiply_ean_products p
  WHERE trim(coalesce(p.quantity,''))=''
    AND p.source IN ('ruoanhinta-k','ruoanhinta-s')
    AND p.name !~* '([0-9]+[ ]?[x×][ ]?[0-9]+|[0-9]+[ ]?[- ]?pack|[0-9]+[ ]?kpl|monipakkaus|mpk|[0-9]+[ ]?pkt)'
    AND p.name !~* '[0-9]+(?:[,.][0-9]+)?[ ]?(kg|g|ml|cl|dl|l)[ ]*/[ ]*[0-9]'
), candidates AS (
  SELECT ean,count(*) AS unit_matches,
         min(replace(m[2],',','.')||' '||lower(m[3])) AS proposed_quantity
  FROM matches GROUP BY ean
), updated AS (
  UPDATE ziiply_ean_products p
  SET quantity=c.proposed_quantity,updated_at=NOW()
  FROM candidates c
  WHERE p.ean=c.ean
    AND c.unit_matches=1
    AND p.source IN ('ruoanhinta-k','ruoanhinta-s')
    AND trim(coalesce(p.quantity,''))=''
  RETURNING p.ean,p.name,p.source,p.quantity
)
SELECT * FROM updated ORDER BY source,name,ean;
-- Safe default: no persistent changes. Inspect output first.
-- Change ONLY this ROLLBACK to COMMIT for the approved production run.
ROLLBACK;
