-- Controlled Tokmanni category backfill: ONLY the ten reviewed EANs.
-- Execute manually in Neon after inspecting tokmanni-approved-ean-preview.sql.
-- This script is idempotent and never overwrites a category other than Muut.
BEGIN;
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
), updated AS (
 UPDATE ziiply_ean_products p
 SET category = a.proposed_category,
     updated_at = NOW()
 FROM approved a
 WHERE p.ean = a.ean
   AND p.source = 'tokmanni-viikkotarjoukset'
   AND lower(trim(coalesce(p.category,''))) = 'muut'
 RETURNING p.ean, p.name, p.category
)
SELECT * FROM updated ORDER BY name;
-- Safe default: this run makes NO persistent changes.
-- Inspect the returned EAN/name/category rows. To apply deliberately,
-- change only the final ROLLBACK to COMMIT and execute the whole script again.
ROLLBACK;
