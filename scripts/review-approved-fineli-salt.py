"""Read-only review of approved Fineli matches for missing EAN salt values.

Does not write, infer salt from sodium, or change approval status.
"""
import json
import os
import certifi
import psycopg

with psycopg.connect(os.environ["DATABASE_URL"], sslmode="verify-full",
                     sslrootcert=certifi.where()) as conn:
    with conn.cursor() as cur:
        cur.execute("""
            SELECT column_name, data_type
            FROM information_schema.columns
            WHERE table_schema='public'
              AND table_name IN ('ziiply_fineli_foods','ziiply_ean_fineli_matches')
            ORDER BY table_name, ordinal_position
        """)
        columns = [dict(column_name=r[0], data_type=r[1]) for r in cur.fetchall()]
        print("FINELI_SALT_SCHEMA", json.dumps(columns), flush=True)
        cur.execute("""
            SELECT n.ean, n.product_name, count(*) AS approved_matches
            FROM public.ziiply_off_nutrition n
            JOIN public.ziiply_ean_products e ON e.ean=n.ean
            JOIN public.ziiply_ean_fineli_matches m
              ON m.ean=n.ean AND m.approved IS TRUE
            WHERE n.salt_100g IS NULL
            GROUP BY n.ean, n.product_name
            ORDER BY n.ean
        """)
        rows = cur.fetchall()
        print("FINELI_SALT_APPROVED_REVIEW",
              json.dumps({"products":len(rows),
                          "multiple_approved_matches":sum(r[2]>1 for r in rows)}),
              flush=True)
        cur.execute("""
            SELECT m.ean, m.confidence, m.match_method,
                   f.nutrients->'NACL'->>'unit' AS salt_unit,
                   f.nutrients->'NACL'->>'value' AS salt_value
            FROM public.ziiply_ean_fineli_matches m
            JOIN public.ziiply_fineli_foods f ON f.fineli_id = m.fineli_id
            JOIN public.ziiply_off_nutrition n ON n.ean = m.ean
            JOIN public.ziiply_ean_products e ON e.ean = m.ean
            WHERE m.approved IS TRUE AND n.salt_100g IS NULL
        """)
        counts = {}
        for ean, confidence, method, unit, value in cur.fetchall():
            eligible = confidence in ("verified", "high") and method == "manual_verified" and unit == "MG"
            try:
                eligible = eligible and value is not None and 0 <= float(value) <= 100000
            except (ValueError, TypeError):
                eligible = False
            if eligible:
                counts[ean] = counts.get(ean, 0) + 1
        print("FINELI_SALT_ELIGIBILITY",
              json.dumps({"unique_eligible":sum(n == 1 for n in counts.values()),
                          "multiple_eligible_matches":sum(n > 1 for n in counts.values()),
                          "no_eligible_match":sum(ean not in counts for ean, _, _ in rows)}),
              flush=True)
        for ean, name, matches in rows:
            print("FINELI_SALT_REVIEW_ITEM",
                  json.dumps({"ean":ean,"product_name":name,
                              "approved_matches":matches},ensure_ascii=False),
                  flush=True)
    conn.rollback()
