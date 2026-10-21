-- Read-only discovery; fresh herbs and raw vegetables only.
WITH rules(token,fineli_id) AS (VALUES ('basilika',11134),('tilli',369),('persilja',333),('ruohosipuli',392),('lehtikaali',326),('kiinankaali',359),('ruusukaali',327),('palsternakka',309)),
normalized AS(SELECT e.ean,e.name,e.brand,trim(regexp_replace(regexp_replace(lower(e.name),'[0-9]+([,.][0-9]+)?[[:space:]]*(kg|g)\M',' ','g'),'[[:space:]]+',' ','g')) n FROM public.ziiply_ean_products e WHERE lower(coalesce(e.brand,'')) IN ('','pirkka','coop','kotimaista') AND NOT EXISTS(SELECT 1 FROM public.ziiply_ean_fineli_matches m WHERE m.ean=e.ean) AND NOT EXISTS(SELECT 1 FROM public.ziiply_off_nutrition o WHERE o.ean=e.ean))
SELECT e.ean,e.name,e.brand,r.fineli_id,f.name_fi FROM normalized e JOIN rules r ON e.n ~ ('^(pirkka |coop |kotimaista )?(suomalainen |luomu )?'||r.token||'( (luomu|suomi|1lk|rkk|ruukku|ruukussa|nippu|pesty|pakattu))*$')
JOIN public.ziiply_fineli_foods f USING(fineli_id)
WHERE NOT(e.name ~ '[0-9]{1,2}[[:space:]]*g' AND r.token='basilika' AND lower(coalesce(e.brand,''))='pirkka')
ORDER BY r.fineli_id,e.name;
