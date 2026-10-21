-- Read-only discovery. Stone fruits require with_stone API support.
-- Only explicitly dark plums match the dark-plum entry. Whole watermelon includes peel weight.
WITH rules(token,fineli_id) AS (VALUES ('aprikoosi',28921),('persikka',28922),('nektariini',28922),('luumu tumma',28918),('vesimeloni',28931)),
normalized AS(SELECT e.ean,e.name,e.brand,trim(regexp_replace(regexp_replace(lower(e.name),'[0-9]+([,.][0-9]+)?[[:space:]]*(kg|g)\M',' ','g'),'[[:space:]]+',' ','g')) n FROM public.ziiply_ean_products e
WHERE lower(coalesce(e.brand,'')) IN ('','pirkka','coop','kotimaista')
AND NOT EXISTS(SELECT 1 FROM public.ziiply_ean_fineli_matches m WHERE m.ean=e.ean)
AND NOT EXISTS(SELECT 1 FROM public.ziiply_off_nutrition o WHERE o.ean=e.ean))
SELECT e.ean,e.name,e.brand,r.fineli_id,f.name_fi FROM normalized e JOIN rules r ON e.n ~ ('^(pirkka |coop |kotimaista )?(luomu )?'||r.token||'( (luomu|suomi|ulkomainen|espanja|etelä-afrikka|1lk|i|siemenetön))*$')
JOIN public.ziiply_fineli_foods f USING(fineli_id) ORDER BY r.fineli_id,e.name;
