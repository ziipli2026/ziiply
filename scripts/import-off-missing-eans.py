"""Targeted OFF lookup for Ziiply EANs absent from the imported OFF catalogue."""
import json, os, time, urllib.request, urllib.error
import psycopg, certifi
LIMIT = int(os.getenv("OFF_LOOKUP_LIMIT", "1000"))
DELAY = float(os.getenv("OFF_LOOKUP_DELAY", "5"))
MAX_RETRIES = int(os.getenv("OFF_LOOKUP_RETRIES", "4"))
with psycopg.connect(os.environ["DATABASE_URL"], sslmode="verify-full", sslrootcert=certifi.where()) as conn:
    with conn.cursor() as cur:
        cur.execute("""CREATE TABLE IF NOT EXISTS public.ziiply_off_ean_lookup_log (
          ean text PRIMARY KEY, status text NOT NULL, checked_at timestamptz NOT NULL DEFAULT now())""")
        cur.execute("""SELECT DISTINCT e.ean FROM public.ziiply_ean_products e
          LEFT JOIN public.ziiply_off_catalogue_staging s ON s.ean=e.ean
          LEFT JOIN public.ziiply_off_ean_lookup_log l ON l.ean=e.ean
          WHERE s.ean IS NULL AND l.ean IS NULL
          AND e.ean ~ '^[0-9]{8,14}$' ORDER BY e.ean LIMIT %s""", (LIMIT,))
        codes = [r[0] for r in cur.fetchall()]
    conn.commit()
    totals = {"found":0,"not_found":0,"errors":0}
    for i,ean in enumerate(codes,1):
        url = "https://world.openfoodfacts.org/api/v2/product/"+ean+".json?fields=code,product_name,brands,categories,nutriments"
        try:
            req=urllib.request.Request(url,headers={"User-Agent":"Ziiply/1.0 (https://ziiply.fi; contact via website)"})
            for attempt in range(MAX_RETRIES):
                try:
                    with urllib.request.urlopen(req,timeout=30) as res:
                        data=json.load(res)
                    break
                except urllib.error.HTTPError as exc:
                    if exc.code == 404:
                        data={"status":0}
                        break
                    if exc.code != 429 or attempt == MAX_RETRIES-1:
                        raise
                    retry_after=exc.headers.get("Retry-After")
                    try:
                        pause=max(15.0,min(180.0,float(retry_after))) if retry_after else min(180.0,20.0*(attempt+1))
                    except ValueError:
                        pause=min(180.0,20.0*(attempt+1))
                    print("OFF_RATE_LIMIT_RETRY",ean,attempt+1,pause,flush=True)
                    time.sleep(pause)
            product=data.get("product") or {}
            nutrients=product.get("nutriments") or {}
            wanted=("energy-kcal_100g","energy-kj_100g","fat_100g","saturated-fat_100g","carbohydrates_100g","sugars_100g","fiber_100g","proteins_100g","salt_100g")
            clean={}
            for key in wanted:
                try:
                    val=float(nutrients[key])
                    if val==val and abs(val)!=float("inf"): clean[key]=val
                except (KeyError,TypeError,ValueError,OverflowError): pass
            if data.get("status")==1 and product.get("product_name") and clean:
                with conn.cursor() as cur:
                    cur.execute("""INSERT INTO public.ziiply_off_catalogue_staging
                      (ean,product_name,brands,categories,nutriments,source_url)
                      VALUES (%s,%s,%s,%s,%s::jsonb,%s)
                      ON CONFLICT(ean) DO NOTHING""",
                      (ean,product["product_name"],product.get("brands"),product.get("categories"),json.dumps(clean),
                       "https://world.openfoodfacts.org/product/"+ean))
                status="found"
            else: status="not_found"
            with conn.cursor() as cur:
                cur.execute("""INSERT INTO public.ziiply_off_ean_lookup_log(ean,status)
                   VALUES (%s,%s) ON CONFLICT(ean) DO UPDATE SET status=excluded.status,checked_at=now()""",(ean,status))
            conn.commit()
            totals[status]+=1
        except (urllib.error.URLError,TimeoutError,ValueError,OSError) as exc:
            conn.rollback()
            totals["errors"]+=1
            print("OFF_LOOKUP_ERROR",ean,str(exc)[:160],flush=True)
        if i%100==0: print("OFF_LOOKUP_PROGRESS",i,totals,flush=True)
        time.sleep(DELAY)
    if totals["errors"]:
        raise RuntimeError("OFF lookup had %s transient failures; retry them on the next run" % totals["errors"])
    print("OFF_LOOKUP_REPORT",json.dumps({"attempted":len(codes),**totals}),flush=True)
