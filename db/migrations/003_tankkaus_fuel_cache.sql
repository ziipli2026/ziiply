-- Tankkaus.com read-only source cache: physical stations and append-only fuel observations.
-- This migration defines storage only. It does not enable ingestion or modify production.
CREATE TABLE IF NOT EXISTS ziiply_fuel_stations (
  source TEXT NOT NULL DEFAULT 'tankkaus.com',
  source_station_id BIGINT NOT NULL CHECK (source_station_id > 0),
  name TEXT NOT NULL,
  chain TEXT,
  address TEXT,
  latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (source, source_station_id)
);
CREATE INDEX IF NOT EXISTS ziiply_fuel_stations_coordinates_idx
  ON ziiply_fuel_stations (latitude, longitude);

CREATE TABLE IF NOT EXISTS ziiply_fuel_price_observations (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'tankkaus.com',
  source_station_id BIGINT NOT NULL,
  fuel_type TEXT NOT NULL CHECK (fuel_type IN ('95', '98', 'diesel')),
  price_eur_per_litre NUMERIC(7,3) NOT NULL CHECK (price_eur_per_litre > 0 AND price_eur_per_litre <= 5),
  observed_at TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ziiply_fuel_observation_station_fk
    FOREIGN KEY (source, source_station_id)
    REFERENCES ziiply_fuel_stations (source, source_station_id)
    ON DELETE RESTRICT,
  CONSTRAINT ziiply_fuel_observation_dedupe
    UNIQUE (source, source_station_id, fuel_type, observed_at, price_eur_per_litre)
);
CREATE INDEX IF NOT EXISTS ziiply_fuel_observations_recent_idx
  ON ziiply_fuel_price_observations (source, fuel_type, observed_at DESC);
CREATE INDEX IF NOT EXISTS ziiply_fuel_observations_station_idx
  ON ziiply_fuel_price_observations (source, source_station_id, fuel_type, observed_at DESC);

COMMENT ON TABLE ziiply_fuel_stations IS
  'Station identity and GPS coordinates from a fuel data provider; not an authoritative station registry.';
COMMENT ON TABLE ziiply_fuel_price_observations IS
  'Deduplicated user-submitted pump price observations; observed_at is provider observation time, not ingestion time.';
