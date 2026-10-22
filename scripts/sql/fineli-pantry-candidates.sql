-- Review-only discovery. Legume candidates MUST be verified dry: names and package sizes do not establish preparation. Check ingredients, processing and dry weight basis before approval.
WITH rules(token,fineli_id) AS(VALUES ('sokeri',1),('hunaja',4),('makaroni(t)?',117),('kookoshiutale(et)?',382),('punaiset linssit|punainen linssi',31219),('vihreät linssit|vihreä linssi',399),('kikherne(et)?',31218)),
names AS(SELECT e.ean,e.name,e.brand,CASE WHEN coalesce(e.brand,'')<>'' AND left(lower(e.name),length(e.brand)+1)=lower(e.brand)||' ' THEN substring(lower(e.name) FROM length(e.brand)+2) ELSE lower(e.name) END AS n FROM public.ziiply_ean_products e WHERE NOT EXISTS(SELECT 1 FROM public.ziiply_ean_fineli_matches m WHERE m.ean=e.ean) AND NOT EXISTS(SELECT 1 FROM public.ziiply_off_nutrition o WHERE o.ean=e.ean)),
normalized AS(SELECT *,trim(regexp_replace(regexp_replace(n,'[0-9]+([,.][0-9]+)?[[:space:]]*(kg|g)\M',' ','g'),'[[:space:]]+',' ','g')) AS clean FROM names)
SELECT n.ean,n.name,n.brand,r.fineli_id,f.name_fi FROM normalized n JOIN rules r ON n.clean ~ ('^(luomu )?('||r.token||')( (luomu|natural|suolaamaton|kokonainen|kokonaiset))*$')
JOIN public.ziiply_fineli_foods f USING(fineli_id)
WHERE coalesce(n.brand,'') !~* '(bird|linnu|lemmik)' AND n.name !~* '(linnuille|lintu|rehu|saippua|öljy|kuorrut|suolattu|paahdettu)'
ORDER BY n.name;
