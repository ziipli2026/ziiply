"""Read-only inspection of Fineli nutrient keys for approved EAN matches."""
import os
import json
import psycopg
import certifi

with psycopg.connect(os.environ["DATABASE_URL"], sslmode="verify-full",
                     sslrootcert=certifi.where()) as conn:
    with conn.cursor() as cur:
        cur.execute("""
          SELECT count(*), count(*) FILTER (WHERE f.fineli_id IS NULL)
          FROM public.ziiply_ean_fineli_matches m
          JOIN public.ziiply_off_nutrition n ON n.ean=m.ean
          JOIN public.ziiply_ean_products e ON e.ean=m.ean
          LEFT JOIN public.ziiply_fineli_foods f ON f.fineli_id=m.fineli_id
          WHERE m.approved IS TRUE AND n.salt_100g IS NULL
        """)
        total, absent = cur.fetchone()
        cur.execute("""
          SELECT k.key, count(*) AS count
          FROM public.ziiply_ean_fineli_matches m
          JOIN public.ziiply_off_nutrition n ON n.ean=m.ean
          JOIN public.ziiply_ean_products e ON e.ean=m.ean
          JOIN public.ziiply_fineli_foods f ON f.fineli_id=m.fineli_id
          CROSS JOIN LATERAL jsonb_object_keys(f.nutrients) AS k(key)
          WHERE m.approved IS TRUE AND n.salt_100g IS NULL
            AND jsonb_typeof(f.nutrients)='object'
          GROUP BY k.key ORDER BY count DESC, k.key
        """)
        keys = cur.fetchall()
        print("FINELI_SALT_KEY_AUDIT", json.dumps({
          "approved_matches":total, "missing_food":absent,
          "nutrient_keys":[{"key":key,"count":count} for key,count in keys]
        }, ensure_ascii=False), flush=True)
    conn.rollback()
