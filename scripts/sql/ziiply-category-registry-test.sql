-- Ziiply category taxonomy, test branch only. Existing product rows untouched.
CREATE TABLE IF NOT EXISTS ziiply_product_categories (
 id text PRIMARY KEY,
 label_fi text NOT NULL,
 parent_id text REFERENCES ziiply_product_categories(id),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','active')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ziiply_source_category_mappings (
 source text NOT NULL,
 source_category text NOT NULL,
 ziiply_category_id text REFERENCES ziiply_product_categories(id),
 review_status text NOT NULL DEFAULT 'unmapped' CHECK (review_status IN ('unmapped','candidate','reviewed')),
 sample_product_count integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(source,source_category)
);
CREATE TABLE IF NOT EXISTS ziiply_search_synonyms (
 category_id text NOT NULL REFERENCES ziiply_product_categories(id),
 term text NOT NULL,
 term_normalized text NOT NULL,
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','reviewed','active')),
 PRIMARY KEY(category_id,term_normalized)
);
INSERT INTO ziiply_source_category_mappings(source,source_category,sample_product_count)
SELECT source,category,COUNT(*)::integer FROM ziiply_ean_products
WHERE source IS NOT NULL AND category IS NOT NULL AND btrim(category)<>''
GROUP BY source,category
ON CONFLICT (source,source_category) DO UPDATE SET sample_product_count=EXCLUDED.sample_product_count;
