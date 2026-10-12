-- Test-only identity repairs: floral-recipe-40673204 / br-weathered-meadow-b1bwpzst.
-- Evidence: data/lidl/verified-ean-links.json and data/search/bruno-mandarin-weight-label-evidence.json.
-- Package price is deliberately not stored as a current product price.
WITH identities(ean,name) AS (VALUES
 ('2001360902261','Bruno mandariini Nadorcott'),
 ('2002676900002','Fazer Dallaspulla 85 g'),
 ('2000343200004','Fazer Berliininmunkki 115 g'),
 ('6413467518508','Fazer Dumle-munkki 106 g'),
 ('2001447100009','Fazer Raspberry Kiss -munkki 108 g'),
 ('2006582500004','Fazer Pihlaja-munkki 108 g')
)
UPDATE ziiply_ean_products p SET name=i.name,updated_at=now()
FROM identities i WHERE p.ean=i.ean AND (coalesce(btrim(p.name),'')='' OR p.name LIKE 'Lidl verified product %')
RETURNING p.ean,p.name;

INSERT INTO ziiply_ean_products(ean,name,brand,category,source)
VALUES('2000638800001','Bruno mandariini Nadorcott','Bruno','Vaakatuote','user-confirmed-k-weight-jokela')
ON CONFLICT(ean) DO NOTHING;
