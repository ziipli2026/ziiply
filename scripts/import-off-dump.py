"""Stream the official Open Food Facts CSV.gz export without saving it to runner disk.
ODbL data remains isolated in ziiply_off_catalogue_staging.
"""
import csv
import gzip
import io
import json
import os
import sys
import time
import urllib.request
import psycopg

URL = "https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz"
BATCH_SIZE = 250
MAX_MATCHES = int(os.environ.get("OFF_MAX_MATCHES", "0"))
csv.field_size_limit(sys.maxsize if sys.maxsize < 2**31 else 2**31 - 1)
conninfo = os.environ["DATABASE_URL"].replace("sslmode=require", "sslmode=verify-full")
inserted = 0
scanned = 0
matched = 0
batch = []

def flush(conn):
    global inserted
    if not batch:
        return
    with conn.cursor() as cur:
        cur.executemany("""INSERT INTO public.ziiply_off_catalogue_staging
          (ean,product_name,brands,categories,nutriments,source_url)
          VALUES (%s,%s,%s,%s,%s::jsonb,%s)
          ON CONFLICT(ean) DO UPDATE SET
            product_name=EXCLUDED.product_name, brands=EXCLUDED.brands,
            categories=EXCLUDED.categories, nutriments=EXCLUDED.nutriments,
            fetched_at=now()""", batch)
    conn.commit()
    inserted += len(batch)
    print("OFF_DUMP_PROGRESS", json.dumps({"scanned":scanned,"saved_or_updated":inserted,"matched":matched}), flush=True)
    batch.clear()

with psycopg.connect(conninfo, connect_timeout=20) as conn:
    with conn.cursor() as cur:
        cur.execute("""CREATE TABLE IF NOT EXISTS public.ziiply_off_catalogue_staging (
            ean text PRIMARY KEY, product_name text, brands text, categories text,
            nutriments jsonb, source_url text NOT NULL,
            source_license text NOT NULL DEFAULT 'ODbL / Open Food Facts',
            fetched_at timestamptz NOT NULL DEFAULT now())""")
    conn.commit()
    request = urllib.request.Request(URL, headers={"User-Agent":"Ziiply/1.0 (https://ziiply.fi; contact via website)"})
    with urllib.request.urlopen(request, timeout=120) as response:
        with gzip.GzipFile(fileobj=response) as compressed:
            with io.TextIOWrapper(compressed, encoding="utf-8", errors="replace", newline="") as stream:
                reader = csv.DictReader(stream, delimiter="\\t")
                if not reader.fieldnames or "code" not in reader.fieldnames:
                    raise RuntimeError("OFF dump format changed: missing code column")
                nutrition = ["energy-kcal_100g","fat_100g","saturated-fat_100g","carbohydrates_100g","sugars_100g","fiber_100g","proteins_100g","salt_100g","sodium_100g"]
                for row in reader:
                    scanned += 1
                    country = (row.get("countries_tags") or "").lower()
                    if "en:finland" not in country.split(","):
                        continue
                    code = (row.get("code") or "").strip()
                    name = (row.get("product_name") or "").strip()
                    if not (code.isdigit() and 8 <= len(code) <= 14 and name):
                        continue
                    nutrients = {}
                    for key in nutrition:
                        val = (row.get(key) or "").strip()
                        if val:
                            try:
                                nutrients[key] = float(val)
                            except ValueError:
                                pass
                    if not nutrients:
                        continue
                    matched += 1
                    batch.append((code,name,row.get("brands") or None,row.get("categories") or None,json.dumps(nutrients),
                                  "https://world.openfoodfacts.org/product/"+code))
                    if len(batch) >= BATCH_SIZE:
                        flush(conn)
                    if MAX_MATCHES and matched >= MAX_MATCHES:
                        break
    flush(conn)
print("OFF_DUMP_REPORT",json.dumps({"scanned":scanned,"matched":matched,"saved_or_updated":inserted,"source":URL}),flush=True)
