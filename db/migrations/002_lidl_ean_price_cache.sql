-- Lidl store-specific EAN price cache.
-- Product identity remains in ziiply_ean_products; prices are intentionally separate.
-- Latest usable observation per EAN + physical Lidl store. Historical observations can
-- later be moved to an append-only history table without changing the lookup contract.

CREATE TABLE IF NOT EXISTS ziiply_lidl_ean_prices (
  ean TEXT NOT NULL,
  store_id TEXT NOT NULL,
  price_eur NUMERIC(10,2) NOT NULL CHECK (price_eur > 0),
  price_kind TEXT NOT NULL DEFAULT 'regular'
    CHECK (price_kind IN ('regular', 'offer', 'lidl_plus')),
  source TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  fresh_until TIMESTAMPTZ NOT NULL,
  evidence_reference TEXT,
  checkout_price_verified BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ean, store_id, price_kind),
  CHECK (ean ~ '^[0-9]{8,14}$'),
  CHECK (fresh_until >= observed_at)
);

CREATE INDEX IF NOT EXISTS ziiply_lidl_ean_prices_fresh_lookup_idx
  ON ziiply_lidl_ean_prices (ean, store_id, price_kind, fresh_until DESC);

COMMENT ON TABLE ziiply_lidl_ean_prices IS
  'Latest Lidl price observation by EAN and physical store. Normal search may reuse a regular price only while fresh_until is in the future.';
COMMENT ON COLUMN ziiply_lidl_ean_prices.fresh_until IS
  'Freshness boundary. A lookup after this instant must refresh instead of starting from zero on every request.';
