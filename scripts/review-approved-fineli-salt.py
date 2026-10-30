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
                   f.nutrients->'NACL'->>'value' AS salt_value,
                   jsonb_typeof(f.nutrients->'NACL'->'value') AS salt_value_type
            FROM public.ziiply_ean_fineli_matches m
            JOIN public.ziiply_fineli_foods f ON f.fineli_id = m.fineli_id
            JOIN public.ziiply_off_nutrition n ON n.ean = m.ean
            JOIN public.ziiply_ean_products e ON e.ean = m.ean
            WHERE m.approved IS TRUE AND n.salt_100g IS NULL
        """)
        counts = {}
        reasons = {}
        reason_counts = {}
        for ean, confidence, method, unit, value, value_type in cur.fetchall():
            eligible = confidence in ("verified", "high") and method == "manual_verified" and unit == "MG" and value_type == "number"
            try:
                eligible = eligible and value is not None and 0 <= float(value) <= 100000
            except (ValueError, TypeError):
                eligible = False
            if eligible:
                counts[ean] = counts.get(ean, 0) + 1
            else:
                reason = ("unverified_match" if method != "manual_verified"
                          else "low_confidence" if confidence not in ("verified", "high")
                          else "wrong_salt_unit" if unit != "MG"
                          else "non_numeric_salt" if value_type != "number"
                          else "invalid_salt_range")
                reasons.setdefault(ean, set()).add(reason)
                reason_counts[reason] = reason_counts.get(reason, 0) + 1
        print("FINELI_SALT_ELIGIBILITY",
              json.dumps({"unique_eligible":sum(n == 1 for n in counts.values()),
                          "multiple_eligible_matches":sum(n > 1 for n in counts.values()),
                          "no_eligible_match":sum(ean not in counts for ean, _, _ in rows)}),
              flush=True)
        print("FINELI_SALT_INELIGIBLE_REASONS",
              json.dumps({"match_level_counts":reason_counts,
                          "product_level_counts":{reason:sum(reason in v for ean, v in reasons.items() if ean not in counts)
                                                  for reason in sorted(reason_counts)}}),
              flush=True)
        for ean, name, matches in rows:
            if ean not in counts:
                print("FINELI_SALT_MANUAL_REVIEW",
                      json.dumps({"ean":ean, "product_name":name,
                                  "reasons":sorted(reasons.get(ean, {"no_eligible_match"}))},
                                 ensure_ascii=False),
                      flush=True)
            print("FINELI_SALT_REVIEW_ITEM",
                  json.dumps({"ean":ean,"product_name":name,
                              "approved_matches":matches},ensure_ascii=False),
                  flush=True)
    conn.rollback()
