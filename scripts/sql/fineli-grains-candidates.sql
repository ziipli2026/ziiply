-- Review-only discovery. Check ingredients, processing and dry weight basis before approval.
WITH rules(token,fineli_id) AS(VALUES ('kvinoa|quinoa',31175),('täysjyväriisi',158),('ohrahiutale(et)?',152),('ohrasuurimo(t)?',151),('kaurahiutale(et)?',153),('ruisjauho(t)?',100),('ohrajauho(t)?',150),('kaurajauho(t)?',30190),('riisijauho(t)?',182),('täysjyväriisijauho(t)?',183),('grahamjauho(t)?',111),('ruishiutale(et)?',103),('vehnähiutale(et)?',114),('perunajauho(t)?',162),('mannasuurimo(t)?',112),('tumma mannasuurimo(t)?',113),('couscous|kuskus',29208)),
names AS(SELECT e.ean,e.name,e.brand,CASE WHEN coalesce(e.brand,'')<>'' AND left(lower(e.name),length(e.brand)+1)=lower(e.brand)||' ' THEN substring(lower(e.name) FROM length(e.brand)+2) ELSE lower(e.name) END AS n FROM public.ziiply_ean_products e WHERE NOT EXISTS(SELECT 1 FROM public.ziiply_ean_fineli_matches m WHERE m.ean=e.ean) AND NOT EXISTS(SELECT 1 FROM public.ziiply_off_nutrition o WHERE o.ean=e.ean)),
normalized AS(SELECT *,trim(regexp_replace(regexp_replace(n,'[0-9]+([,.][0-9]+)?[[:space:]]*(kg|g)\M',' ','g'),'[[:space:]]+',' ','g')) AS clean FROM names)
SELECT n.ean,n.name,n.brand,r.fineli_id,f.name_fi FROM normalized n JOIN rules r ON n.clean ~ ('^((luomu|suomalainen) )?('||r.token||')( (luomu|natural|gluteeniton|suolaamaton|kokonainen|kokonaiset))*$')
JOIN public.ziiply_fineli_foods f USING(fineli_id)
WHERE coalesce(n.brand,'') !~* '(bird|linnu|lemmik)' AND n.name !~* '(linnuille|lintu|rehu|saippua|öljy|kuorrut|suolattu|paahdettu)'
AND NOT (r.fineli_id=29208 AND n.name ~* '(gluteeniton|täysjyvä)')
ORDER BY n.name;
