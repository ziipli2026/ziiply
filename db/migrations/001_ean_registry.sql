-- Ziiply global EAN/GTIN registry.
-- Product identity only: current store prices and availability do not belong here.

CREATE TABLE IF NOT EXISTS ean_products (
  ean text PRIMARY KEY,
  status text NOT NULL DEFAULT 'unresolved'
    CHECK (status IN ('unresolved', 'resolved')),
  name text,
  brand text,
  package_size text,
  source_product_id text,
  source_chain text,
  resolved_source text,
  scan_count integer NOT NULL DEFAULT 1 CHECK (scan_count >= 0),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz,
  next_attempt_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    status <> 'resolved'
    OR (name IS NOT NULL AND resolved_source IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS ean_products_unresolved_retry_idx
  ON ean_products (next_attempt_at)
  WHERE status = 'unresolved';

CREATE INDEX IF NOT EXISTS ean_products_unresolved_priority_idx
  ON ean_products (scan_count DESC, first_seen_at ASC)
  WHERE status = 'unresolved';

CREATE TABLE IF NOT EXISTS ean_product_source_attempts (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ean text NOT NULL REFERENCES ean_products(ean) ON DELETE CASCADE,
  source text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  outcome text NOT NULL
    CHECK (outcome IN ('found', 'not_found', 'error')),
  detail text
);

CREATE INDEX IF NOT EXISTS ean_product_source_attempts_ean_idx
  ON ean_product_source_attempts (ean, attempted_at DESC);

COMMENT ON TABLE ean_products IS
  'Global Ziiply EAN registry. Unresolved rows are retried for a limited time and deleted if reliable identity cannot be found.';
COMMENT ON COLUMN ean_products.resolved_source IS
  'Source that supplied the reliable product identity; store price is intentionally not stored here.';
