-- Apply only to br-weathered-meadow-b1bwpzst, never production automatically.
-- Archive valid source events even when they lack usable station coordinates
-- or use fuels not yet exposed by Ziiply's desktop.
CREATE TABLE IF NOT EXISTS ziiply_tankkaus_feed_observations (
  source_observation_id bigint PRIMARY KEY CHECK(source_observation_id > 0),
  source_station_id bigint NOT NULL CHECK(source_station_id > 0),
  fuel_type_id bigint NOT NULL CHECK(fuel_type_id > 0),
  price_eur_per_litre numeric NOT NULL CHECK(price_eur_per_litre > 0),
  observed_at timestamptz NOT NULL,
  ingested_at timestamptz NOT NULL DEFAULT NOW(),
  payload jsonb NOT NULL,
  UNIQUE(source_station_id,fuel_type_id,observed_at,price_eur_per_litre)
);
