"""Refresh missing OFF nutrition from the live API, then let the safe backfill fill gaps."""
import json, os, time, urllib.request, urllib.error
import psycopg, certifi

LIMIT = int(os.getenv("OFF_NUTRITION_REFRESH_LIMIT", "180"))
FIELDS = ("energy-kcal_100g", "energy-kj_100g", "fat_100g",
          "saturated-fat_100g", "carbohydrates_100g", "sugars_100g",
          "fiber_100g", "proteins_100g", "salt_100g")
HEADERS = {"User-Agent": "Ziiply/1.0 (https://ziiply.fi; nutrition data maintenance)"}
with psycopg.connect(os.environ["DATABASE_URL"], sslmode="verify-full",
                     sslrootcert=certifi.where()) as conn:
    with conn.cursor() as cur:
        cur.execute("""CREATE TABLE IF NOT EXISTS public.ziiply_off_nutrition_refresh_log
            (ean text PRIMARY KEY, checked_at timestamptz NOT NULL DEFAULT now(),
             status text NOT NULL)""")
        conn.commit()
        cur.execute("""SELECT s.ean FROM public.ziiply_off_catalogue_staging s
            LEFT JOIN public.ziiply_off_nutrition n ON n.ean=s.ean
            LEFT JOIN public.ziiply_off_nutrition_refresh_log l ON l.ean=s.ean
            WHERE (n.ean IS NULL OR
                   (n.source ILIKE '%%open food facts%%' AND
                    n.dietary->>'import_review_status' IS DISTINCT FROM 'approved'
                    AND (n.kcal_100g IS NULL OR n.proteins_100g IS NULL
                         OR n.salt_100g IS NULL)))
              AND (l.checked_at IS NULL OR l.checked_at < now() - interval '30 days')
            ORDER BY (n.ean IS NOT NULL), s.ean LIMIT %s""", (LIMIT,))
        eans = [r[0] for r in cur.fetchall()]
    stats = {"attempted": 0, "refreshed": 0, "not_found": 0, "no_usable_values": 0, "errors": 0}
    for ean in eans:
        try:
            url = "https://world.openfoodfacts.org/api/v2/product/" + ean + ".json?fields=code,nutriments"
            request = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(request, timeout=25) as response:
                payload = json.load(response)
            product = payload.get("product") or {}
            nutrients = product.get("nutriments") or {}
            usable = {}
            for key in FIELDS:
                value = nutrients.get(key)
                try:
                    num = float(value)
                    maximum = 4000 if key == "energy-kj_100g" else (1000 if key == "energy-kcal_100g" else 100)
                    if num == num and 0 <= num <= maximum:
                        usable[key] = num
                except (TypeError, ValueError, OverflowError):
                    pass
            status = ("not_found" if payload.get("status") != 1 else
                      "refreshed" if usable else "no_usable_values")
            with conn.cursor() as cur:
                if usable:
                    cur.execute("""UPDATE public.ziiply_off_catalogue_staging
                        SET nutriments = COALESCE(nutriments,'{}'::jsonb) || %s::jsonb,
                            fetched_at = now()
                        WHERE ean=%s AND EXISTS
                            (SELECT 1 FROM public.ziiply_off_catalogue_staging WHERE ean=%s)
                        """, (json.dumps(usable), ean, ean))
                cur.execute("""INSERT INTO public.ziiply_off_nutrition_refresh_log
                    (ean, checked_at, status) VALUES (%s, now(), %s)
                    ON CONFLICT (ean) DO UPDATE SET checked_at=now(), status=EXCLUDED.status""",
                    (ean, status))
            conn.commit()
            stats[status] += 1
        except (urllib.error.URLError, TimeoutError, ValueError, OSError) as exc:
            conn.rollback()
            stats["errors"] += 1
            print("OFF_NUTRITION_REFRESH_ERROR", ean, str(exc)[:150], flush=True)
        stats["attempted"] += 1
        time.sleep(4.2)
    print("OFF_NUTRITION_REFRESH_REPORT", json.dumps(stats), flush=True)
