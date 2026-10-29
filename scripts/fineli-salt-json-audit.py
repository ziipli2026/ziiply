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
        cur.execute("""
          SELECT jsonb_typeof(f.nutrients->'NACL') AS value_type,
                 count(*) AS amount,
                 min(left((f.nutrients->'NACL')::text, 120)) AS example
          FROM public.ziiply_ean_fineli_matches m
          JOIN public.ziiply_off_nutrition n ON n.ean=m.ean
          JOIN public.ziiply_ean_products e ON e.ean=m.ean
          JOIN public.ziiply_fineli_foods f ON f.fineli_id=m.fineli_id
          WHERE m.approved IS TRUE AND n.salt_100g IS NULL
          GROUP BY jsonb_typeof(f.nutrients->'NACL')
          ORDER BY amount DESC
        """)
        print("FINELI_SALT_VALUE_SHAPES", json.dumps([
          {"type":kind, "count":count, "example":example}
          for kind,count,example in cur.fetchall()
        ], ensure_ascii=False), flush=True)
        cur.execute("""
          SELECT upper(f.nutrients->'NACL'->>'unit') AS unit,
                 count(*) AS items,
                 count(*) FILTER (WHERE jsonb_typeof(f.nutrients->'NACL'->'value')='number') AS numeric_values,
                 min(CASE WHEN jsonb_typeof(f.nutrients->'NACL'->'value')='number'
                          THEN (f.nutrients->'NACL'->>'value')::numeric END) AS min_value,
                 max(CASE WHEN jsonb_typeof(f.nutrients->'NACL'->'value')='number'
                          THEN (f.nutrients->'NACL'->>'value')::numeric END) AS max_value
          FROM public.ziiply_ean_fineli_matches m
          JOIN public.ziiply_off_nutrition n ON n.ean=m.ean
          JOIN public.ziiply_ean_products e ON e.ean=m.ean
          JOIN public.ziiply_fineli_foods f ON f.fineli_id=m.fineli_id
          WHERE m.approved IS TRUE AND n.salt_100g IS NULL
            AND jsonb_typeof(f.nutrients->'NACL')='object'
          GROUP BY upper(f.nutrients->'NACL'->>'unit')
          ORDER BY items DESC
        """)
        print("FINELI_SALT_UNIT_AUDIT", json.dumps([
          {"unit":unit,"items":items,"numeric_values":numeric,
           "min_value":str(low) if low is not None else None,
           "max_value":str(high) if high is not None else None}
          for unit,items,numeric,low,high in cur.fetchall()
        ]), flush=True)
        cur.execute("""
          SELECT m.ean, e.name, f.name_fi, m.match_method, m.confidence,
                 (f.nutrients->'NACL'->>'value')::numeric / 1000 AS salt_g_100g
          FROM public.ziiply_ean_fineli_matches m
          JOIN public.ziiply_off_nutrition n ON n.ean=m.ean
          JOIN public.ziiply_ean_products e ON e.ean=m.ean
          JOIN public.ziiply_fineli_foods f ON f.fineli_id=m.fineli_id
          WHERE m.approved IS TRUE AND n.salt_100g IS NULL
            AND f.nutrients->'NACL'->>'unit' = 'MG'
            AND jsonb_typeof(f.nutrients->'NACL'->'value')='number'
          ORDER BY salt_g_100g DESC
          LIMIT 20
        """)
        print("FINELI_SALT_REVIEW_TOP20", json.dumps([
          {"ean":ean,"product":product,"fineli":fineli,"method":method,
           "confidence":confidence,"salt_g_100g":str(salt)}
          for ean,product,fineli,method,confidence,salt in cur.fetchall()
        ], ensure_ascii=False), flush=True)
        cur.execute("""
          SELECT m.match_method, m.confidence,
                 count(*) AS matched,
                 count(*) FILTER (WHERE f.nutrients->'NACL'->>'unit'='MG'
                   AND jsonb_typeof(f.nutrients->'NACL'->'value')='number'
                   AND (f.nutrients->'NACL'->>'value')::numeric BETWEEN 0 AND 100000)
                   AS valid_mg,
                 count(*) FILTER (WHERE f.nutrients->'NACL' IS NULL) AS missing_nacl
          FROM public.ziiply_ean_fineli_matches m
          JOIN public.ziiply_off_nutrition n ON n.ean=m.ean
          JOIN public.ziiply_ean_products e ON e.ean=m.ean
          JOIN public.ziiply_fineli_foods f ON f.fineli_id=m.fineli_id
          WHERE m.approved IS TRUE AND n.salt_100g IS NULL
          GROUP BY m.match_method, m.confidence
          ORDER BY matched DESC
        """)
        print("FINELI_SALT_DRY_RUN", json.dumps([
          {"match_method":method,"confidence":confidence,"matched":matched,
           "valid_mg":valid,"missing_nacl":missing}
          for method,confidence,matched,valid,missing in cur.fetchall()
        ], ensure_ascii=False), flush=True)
        cur.execute("""
          SELECT m.ean, e.name, f.name_fi, m.confidence,
                 round((f.nutrients->'NACL'->>'value')::numeric / 1000, 4)
          FROM public.ziiply_ean_fineli_matches m
          JOIN public.ziiply_off_nutrition n ON n.ean=m.ean
          JOIN public.ziiply_ean_products e ON e.ean=m.ean
          JOIN public.ziiply_fineli_foods f ON f.fineli_id=m.fineli_id
          WHERE m.approved IS TRUE AND n.salt_100g IS NULL
            AND m.match_method='manual_verified'
            AND m.confidence IN ('verified','high')
            AND f.nutrients->'NACL'->>'unit'='MG'
            AND jsonb_typeof(f.nutrients->'NACL'->'value')='number'
            AND (f.nutrients->'NACL'->>'value')::numeric BETWEEN 0 AND 100000
          ORDER BY m.ean
        """)
        candidates = cur.fetchall()
        print("FINELI_MANUAL_SALT_PREVIEW", json.dumps({
          "count":len(candidates),
          "items":[{"ean":ean,"product":product,"fineli":fineli,
                    "confidence":confidence,"estimated_salt_g_100g":str(salt)}
                   for ean,product,fineli,confidence,salt in candidates]
        }, ensure_ascii=False), flush=True)
        cur.execute("""
          SELECT count(*) AS total,
                 count(*) FILTER (WHERE (f.nutrients->'NACL'->>'value')::numeric=0) AS zeros,
                 count(*) FILTER (WHERE (f.nutrients->'NACL'->>'value')::numeric>500) AS over_half_gram,
                 count(*) FILTER (WHERE (f.nutrients->'NACL'->>'value')::numeric>1000) AS over_one_gram,
                 count(*) FILTER (WHERE m.confidence='verified') AS verified,
                 count(*) FILTER (WHERE m.confidence='high') AS high_confidence
          FROM public.ziiply_ean_fineli_matches m
          JOIN public.ziiply_off_nutrition n ON n.ean=m.ean
          JOIN public.ziiply_ean_products e ON e.ean=m.ean
          JOIN public.ziiply_fineli_foods f ON f.fineli_id=m.fineli_id
          WHERE m.approved IS TRUE AND n.salt_100g IS NULL
            AND m.match_method='manual_verified'
            AND m.confidence IN ('verified','high')
            AND f.nutrients->'NACL'->>'unit'='MG'
            AND jsonb_typeof(f.nutrients->'NACL'->'value')='number'
            AND (f.nutrients->'NACL'->>'value')::numeric BETWEEN 0 AND 100000
        """)
        total,zeros,half,one,verified,high=cur.fetchone()
        print("FINELI_MANUAL_SALT_RISK_BUCKETS", json.dumps({
          "total":total,"zero_values":zeros,"above_0_5g":half,
          "above_1g":one,"verified":verified,"high_confidence":high,
          "source_type":"generic_estimate","database_writes":0
        }), flush=True)
    conn.rollback()
