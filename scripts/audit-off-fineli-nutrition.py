"""Audit OFF/Fineli nutrition and safely fill missing OFF fields. No inferred Fineli-to-EAN values."""
import json, os
import psycopg, certifi

APPLY = os.getenv("NUTRITION_APPLY", "false").lower() == "true"
FIELDS = {
 "energy-kcal_100g":"kcal_100g", "energy-kj_100g":"kj_100g",
 "fat_100g":"fat_100g", "saturated-fat_100g":"saturated_fat_100g",
 "carbohydrates_100g":"carbohydrates_100g", "sugars_100g":"sugars_100g",
 "fiber_100g":"fiber_100g", "proteins_100g":"proteins_100g", "salt_100g":"salt_100g"
}
with psycopg.connect(os.environ["DATABASE_URL"],sslmode="verify-full",sslrootcert=certifi.where()) as conn:
 with conn.cursor() as cur:
  cur.execute("""SELECT count(*) FROM public.ziiply_off_catalogue_staging""")
  staging=cur.fetchone()[0]
  cur.execute("""SELECT count(*) FROM public.ziiply_off_nutrition""")
  nutrition=cur.fetchone()[0]
  cur.execute("""SELECT count(*) FROM public.ziiply_fineli_foods""")
  fineli=cur.fetchone()[0]
  cur.execute("""SELECT count(*),count(*) FILTER (WHERE approved IS TRUE)
   FROM public.ziiply_ean_fineli_matches""")
  fineli_links,approved=cur.fetchone()
  cur.execute("""SELECT count(*) FROM public.ziiply_off_catalogue_staging s
   LEFT JOIN public.ziiply_off_nutrition n ON n.ean=s.ean WHERE n.ean IS NULL""")
  missing=cur.fetchone()[0]
  cur.execute("""SELECT count(*) FROM public.ziiply_off_catalogue_staging s
   JOIN public.ziiply_off_nutrition n ON n.ean=s.ean
   WHERE n.source ILIKE '%open food facts%'""")
  existing_off=cur.fetchone()[0]
  print("NUTRITION_AUDIT",json.dumps(dict(staging=staging,nutrition=nutrition,fineli_foods=fineli,
   fineli_links=fineli_links,approved_fineli_links=approved,staging_without_nutrition=missing,
   existing_off_rows=existing_off)),flush=True)
  # Only update missing numeric values on already-existing OFF-sourced rows.
  # Do not touch Fineli-sourced, manually reviewed, or other nutrition rows.
  # Staging is unverified; every accepted number is checked for physical plausibility.
  expr=[]
  for key,col in FIELDS.items():
   raw="s.nutriments->>'"+key+"'"
   valid="("+raw+" ~ '^[0-9]+(\\.[0-9]+)?$' AND "+raw+"::numeric BETWEEN 0 AND "+("1000" if col=="kcal_100g" else "4000" if col=="kj_100g" else "100")+")"
   expr.append(col+" = COALESCE(n."+col+", CASE WHEN "+valid+" THEN "+raw+"::numeric END)")
  sql="""UPDATE public.ziiply_off_nutrition n SET """+", ".join(expr)+"""
   FROM public.ziiply_off_catalogue_staging s
   WHERE n.ean=s.ean AND n.source ILIKE '%open food facts%'
   AND (n.dietary->>'import_review_status' IS DISTINCT FROM 'approved')
   AND s.nutriments IS NOT NULL
   AND ("""+ " OR ".join("n."+col+" IS NULL" for col in FIELDS.values()) +""")
   RETURNING n.ean"""
  if APPLY:
   cur.execute(sql)
   print("NUTRITION_UPDATED_ROWS",len(cur.fetchall()),flush=True)
  else:
   print("NUTRITION_DRY_RUN","No database rows changed; set NUTRITION_APPLY=true to fill only NULL OFF fields",flush=True)
 conn.commit()
