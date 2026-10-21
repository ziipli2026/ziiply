-- Review-only discovery for raw vegetables, roots and colour-specific peppers.
-- Does not approve matches or change nutrition. Existing matches and OFF rows are excluded.
-- Normalization is deliberately strict: prepared, powdered and mixed products do not match.
WITH rules(token,fineli_id) AS (VALUES ('lanttu',303),('nauris',304),('punajuuri',305),('retiisi',308),('valkokaali',320),('punakaali',321),('purjo',337),('munakoiso',362),('kesäkurpitsa',389),('inkivääri',33023),('paprika punainen',386),('paprika keltainen',388),('paprika vihreä',387)),
normalized AS (
SELECT e.ean,e.name,e.brand,trim(regexp_replace(regexp_replace(lower(e.name),'[0-9]+([,.][0-9]+)?[[:space:]]*(kg|g|kpl)\M',' ','g'),'[[:space:]]+',' ','g')) n
FROM public.ziiply_ean_products e
WHERE lower(coalesce(e.brand,'')) IN ('','pirkka','coop','kotimaista')
AND NOT EXISTS(SELECT 1 FROM public.ziiply_ean_fineli_matches m WHERE m.ean=e.ean)
AND NOT EXISTS(SELECT 1 FROM public.ziiply_off_nutrition o WHERE o.ean=e.ean))
SELECT e.ean,e.name,e.brand,r.fineli_id,f.name_fi FROM normalized e JOIN rules r ON e.n ~
('^(pirkka |coop |kotimaista )?(luomu |suomalainen )?'||r.token||'( (luomu|suomi|ulkomainen|kotimainen|pakattu|alustapakattu|alankomaat|espanja|peru|kiina|1lk|1 lk|i))*$')
JOIN public.ziiply_fineli_foods f USING(fineli_id) ORDER BY r.fineli_id,e.name;
