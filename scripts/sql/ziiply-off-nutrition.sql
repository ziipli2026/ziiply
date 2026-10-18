-- Open Food Facts-derived nutrition data is isolated from Ziiply's proprietary catalog.
-- Review ODbL attribution/share-alike obligations before publishing or merging.
CREATE TABLE IF NOT EXISTS public.ziiply_off_nutrition (
 ean text PRIMARY KEY,
 product_name text,
 kcal_100g numeric,
 kj_100g numeric,
 fat_100g numeric,
 saturated_fat_100g numeric,
 carbohydrates_100g numeric,
 sugars_100g numeric,
 fiber_100g numeric,
 proteins_100g numeric,
 salt_100g numeric,
 allergens text[] NOT NULL DEFAULT '{}',
 traces text[] NOT NULL DEFAULT '{}',
 labels text[] NOT NULL DEFAULT '{}',
 dietary jsonb NOT NULL DEFAULT '{}'::jsonb,
 source text NOT NULL DEFAULT 'Open Food Facts (ODbL)',
 source_url text,
 fetched_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ziiply_off_nutrition_dietary_idx ON public.ziiply_off_nutrition USING gin (dietary);
