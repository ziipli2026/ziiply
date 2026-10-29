"""Conservative OFF nutrition backfill; Fineli matches remain separate."""
import json
import os
import psycopg
import certifi

APPLY = os.getenv("NUTRITION_APPLY", "false").lower() == "true"
FIELDS = {
    "energy-kcal_100g": ("kcal_100g", 1000),
    "energy-kj_100g": ("kj_100g", 4000),
    "fat_100g": ("fat_100g", 100),
    "saturated-fat_100g": ("saturated_fat_100g", 100),
    "carbohydrates_100g": ("carbohydrates_100g", 100),
    "sugars_100g": ("sugars_100g", 100),
    "fiber_100g": ("fiber_100g", 100),
    "proteins_100g": ("proteins_100g", 100),
    "salt_100g": ("salt_100g", 100),
}

def numeric_expr(key, maximum):
    value = "s.nutriments->>'" + key + "'"
    # PostgreSQL CASE prevents unsafe casts for nonnumeric / huge values.
    return ("CASE WHEN length(" + value + ") <= 20 AND " + value
            + " ~ '^[0-9]{1,4}(\\.[0-9]{1,8})?$' THEN "
            + "CASE WHEN (" + value + ")::numeric BETWEEN 0 AND "
            + str(maximum) + " THEN (" + value + ")::numeric END END")

with psycopg.connect(os.environ["DATABASE_URL"],
                     sslmode="verify-full", sslrootcert=certifi.where()) as conn:
    with conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM public.ziiply_off_catalogue_staging")
        staging = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM public.ziiply_off_nutrition")
        nutrition = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM public.ziiply_fineli_foods")
        fineli = cur.fetchone()[0]
        cur.execute("SELECT count(*),count(*) FILTER (WHERE approved IS TRUE) FROM public.ziiply_ean_fineli_matches")
        links, approved = cur.fetchone()
        cur.execute("""SELECT count(*) FROM public.ziiply_off_catalogue_staging s
            LEFT JOIN public.ziiply_off_nutrition n ON n.ean=s.ean
            WHERE n.ean IS NULL""")
        missing = cur.fetchone()[0]
        print("NUTRITION_AUDIT", json.dumps(dict(staging=staging,
              nutrition=nutrition, fineli_foods=fineli,
              fineli_links=links, approved_fineli_links=approved,
              staging_without_nutrition=missing)), flush=True)

        cols = [column for column, _ in FIELDS.values()]
        exprs = [numeric_expr(key, maximum) for key, (_, maximum) in FIELDS.items()]
        available = " OR ".join("(" + expression + ") IS NOT NULL" for expression in exprs)
        # Inserts ONLY new OFF-sourced rows, marked unverified.
        insert_sql = ("""INSERT INTO public.ziiply_off_nutrition
            (ean,product_name,""" + ",".join(cols) + """,dietary,source,source_url)
            SELECT s.ean,s.product_name,""" + ",".join(exprs) +
            """, '{"import_review_status":"unverified"}'::jsonb,
            'Open Food Facts (ODbL) - unverified',s.source_url
            FROM public.ziiply_off_catalogue_staging s
            WHERE s.nutriments IS NOT NULL AND (""" + available + """)
            ON CONFLICT (ean) DO NOTHING RETURNING ean""")
        # Existing OFF records: only fill NULL numeric columns; never overwrite.
        # Approved records are explicitly excluded.
        setters = [col + "=COALESCE(n." + col + "," + expr + ")"
                   for col, expr in zip(cols, exprs)]
        # Update only if at least one missing field can actually be filled.
        fillable = " OR ".join("(n." + col + " IS NULL AND (" + expr + ") IS NOT NULL)"
                               for col, expr in zip(cols, exprs))
        update_sql = ("""UPDATE public.ziiply_off_nutrition n SET """
                      + ",".join(setters) + """
            FROM public.ziiply_off_catalogue_staging s
            WHERE n.ean=s.ean
              AND n.source ILIKE '%open food facts%'
              AND n.dietary->>'import_review_status' IS DISTINCT FROM 'approved'
              AND s.nutriments IS NOT NULL
              AND (""" + fillable
                      + """) RETURNING n.ean""")
        if APPLY:
            cur.execute(insert_sql)
            inserted = len(cur.fetchall())
            cur.execute(update_sql)
            updated = len(cur.fetchall())
            cur.execute("""SELECT count(*) FROM public.ziiply_off_catalogue_staging s
                LEFT JOIN public.ziiply_off_nutrition n ON n.ean=s.ean
                WHERE n.ean IS NULL""")
            remaining = cur.fetchone()[0]
            print("NUTRITION_BACKFILL_REPORT",
                  json.dumps(dict(inserted=inserted, updated=updated,
                                  remaining_without_nutrition=remaining)), flush=True)
        else:
            print("NUTRITION_DRY_RUN", "No rows modified", flush=True)
        # Diagnose every remaining missing row without inventing nutrition values.
        cur.execute("""SELECT s.ean, s.product_name,
            CASE WHEN s.nutriments IS NULL THEN 'no_nutriments'
                 WHEN s.nutriments = '{}'::jsonb THEN 'empty_nutriments'
                 ELSE 'no_usable_numeric_fields' END AS reason
            FROM public.ziiply_off_catalogue_staging s
            LEFT JOIN public.ziiply_off_nutrition n ON n.ean=s.ean
            WHERE n.ean IS NULL ORDER BY s.ean""")
        missing_rows = [dict(ean=row[0], product_name=row[1], reason=row[2])
                        for row in cur.fetchall()]
        summary = {}
        for row in missing_rows:
            summary[row["reason"]] = summary.get(row["reason"], 0) + 1
        print("NUTRITION_MISSING_DIAGNOSIS", json.dumps(summary), flush=True)
        for row in missing_rows:
            print("NUTRITION_MISSING_ITEM", json.dumps(row, ensure_ascii=False), flush=True)
        cur.execute("""SELECT
            count(*) AS total,
            count(*) FILTER (WHERE kcal_100g IS NULL) AS missing_kcal,
            count(*) FILTER (WHERE proteins_100g IS NULL) AS missing_protein,
            count(*) FILTER (WHERE salt_100g IS NULL) AS missing_salt,
            count(*) FILTER (WHERE fat_100g IS NULL) AS missing_fat,
            count(*) FILTER (WHERE carbohydrates_100g IS NULL) AS missing_carbs,
            count(*) FILTER (WHERE kcal_100g < 0 OR kcal_100g > 1000
                OR fat_100g < 0 OR fat_100g > 100
                OR proteins_100g < 0 OR proteins_100g > 100
                OR salt_100g < 0 OR salt_100g > 100) AS implausible
            FROM public.ziiply_off_nutrition""")
        stats = cur.fetchone()
        print("NUTRITION_FIELD_QUALITY", json.dumps(dict(zip(
            ["total", "missing_kcal", "missing_protein", "missing_salt",
             "missing_fat", "missing_carbs", "implausible"], stats))), flush=True)
        # Flag implausible existing values for review, without silently overwriting.
        cur.execute("""SELECT ean, product_name, source, kcal_100g, fat_100g,
            proteins_100g, salt_100g FROM public.ziiply_off_nutrition
            WHERE kcal_100g < 0 OR kcal_100g > 1000
               OR fat_100g < 0 OR fat_100g > 100
               OR proteins_100g < 0 OR proteins_100g > 100
               OR salt_100g < 0 OR salt_100g > 100
            ORDER BY ean""")
        for row in cur.fetchall():
            print("NUTRITION_ANOMALY", json.dumps({
                "ean":row[0],"product_name":row[1],"source":row[2],
                "kcal":str(row[3]) if row[3] is not None else None,
                "fat":str(row[4]) if row[4] is not None else None,
                "protein":str(row[5]) if row[5] is not None else None,
                "salt":str(row[6]) if row[6] is not None else None},
                ensure_ascii=False),flush=True)
        # Identify whether the 135 missing OFF records have a separately reviewed
        # Fineli fallback or only pending suggestions. Never auto-approve matches.
        cur.execute("""SELECT
            count(*) AS missing_total,
            count(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM public.ziiply_ean_fineli_matches m
                WHERE m.ean=s.ean AND m.approved IS TRUE)) AS approved_fineli,
            count(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM public.ziiply_ean_fineli_candidates c
                WHERE c.ean=s.ean AND c.status='pending')) AS pending_fineli
            FROM public.ziiply_off_catalogue_staging s
            LEFT JOIN public.ziiply_off_nutrition n ON n.ean=s.ean
            WHERE n.ean IS NULL""")
        missing_fineli = cur.fetchone()
        print("NUTRITION_MISSING_FINELI_COVERAGE", json.dumps(dict(zip(
            ["missing_total", "approved_fineli", "pending_fineli"], missing_fineli))), flush=True)
        # Separate missing OFF records present in the EAN master from unrelated
        # catalogue records; only master records can benefit the EAN scanner.
        cur.execute("""SELECT
            count(*) AS missing_off,
            count(*) FILTER (WHERE e.ean IS NOT NULL) AS in_ean_master,
            count(*) FILTER (WHERE e.ean IS NULL) AS outside_ean_master
            FROM public.ziiply_off_catalogue_staging s
            LEFT JOIN public.ziiply_off_nutrition n ON n.ean=s.ean
            LEFT JOIN public.ziiply_ean_products e ON e.ean=s.ean
            WHERE n.ean IS NULL""")
        master_coverage = cur.fetchone()
        print("NUTRITION_MISSING_MASTER_COVERAGE", json.dumps(dict(zip(
            ["missing_off", "in_ean_master", "outside_ean_master"], master_coverage))), flush=True)
        # Count OFF fields that are still empty and have no valid staging replacement.
        cur.execute("""SELECT count(*) FROM public.ziiply_off_nutrition n
            JOIN public.ziiply_off_catalogue_staging s ON s.ean=n.ean
            WHERE n.source ILIKE '%open food facts%'
              AND (n.salt_100g IS NULL OR n.proteins_100g IS NULL)
              AND s.nutriments IS NOT NULL""")
        print("NUTRITION_REVIEW_CANDIDATES",cur.fetchone()[0],flush=True)
    conn.commit()
