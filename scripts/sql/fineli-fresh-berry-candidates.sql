-- Review-only discovery: excludes existing matches and EAN-specific OFF nutrition.
-- Frozen berries, concentrates, preserves and preparations are excluded.
WITH rules(token,fineli_id) AS (VALUES ('puolukka',440),('karpalo',441),('mustikka',442),('mustaherukka',444),('punaherukka',445),('karviainen',446),('raparperi',338)),
normalized AS (SELECT e.ean,e.name,e.brand,trim(regexp_replace(regexp_replace(lower(e.name),'[0-9]+([,.][0-9]+)?[[:space:]]*(kg|g)\M',' ','g'),'[[:space:]]+',' ','g')) n FROM public.ziiply_ean_products e
WHERE lower(coalesce(e.brand,'')) IN ('','pirkka','coop','kotimaista')
AND NOT EXISTS(SELECT 1 FROM public.ziiply_ean_fineli_matches m WHERE m.ean=e.ean)
AND NOT EXISTS(SELECT 1 FROM public.ziiply_off_nutrition o WHERE o.ean=e.ean))
SELECT e.ean,e.name,e.brand,r.fineli_id,f.name_fi FROM normalized e JOIN rules r ON e.n ~ ('^(pirkka |coop |kotimaista )?(suomalainen |luomu )?'||r.token||'( (suomi|luomu|1lk))*$')
JOIN public.ziiply_fineli_foods f USING(fineli_id) ORDER BY r.fineli_id,e.name;
