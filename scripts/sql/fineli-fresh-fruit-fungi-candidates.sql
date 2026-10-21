-- Read-only candidate discovery. Whole and peeled pineapple use different weight bases.
-- Pear cultivars use a generic estimate. Preserved and frozen products are excluded.
WITH rules(token,fineli_id) AS (VALUES ('päärynä',28917),('ananas',28923),('ananas kuorittu',11056),('hunajameloni',28944),('herkkusieni',345),('pinaatti',33456)),
normalized AS(SELECT e.ean,e.name,e.brand,trim(regexp_replace(regexp_replace(lower(e.name),'[0-9]+([,.][0-9]+)?[[:space:]]*(kg|g)\M',' ','g'),'[[:space:]]+',' ','g')) n FROM public.ziiply_ean_products e
WHERE lower(coalesce(e.brand,'')) IN ('','pirkka','coop','kotimaista')
AND NOT EXISTS(SELECT 1 FROM public.ziiply_ean_fineli_matches m WHERE m.ean=e.ean)
AND NOT EXISTS(SELECT 1 FROM public.ziiply_off_nutrition o WHERE o.ean=e.ean))
SELECT e.ean,e.name,e.brand,r.fineli_id,f.name_fi FROM normalized e JOIN rules r ON e.n ~ ('^(pirkka |coop |kotimaista )?(luomu )?'||r.token||'( (luomu|suomi|alankomaat|1lk|i|conference|williams|xenia))*$')
JOIN public.ziiply_fineli_foods f USING(fineli_id) ORDER BY r.fineli_id,e.name;
