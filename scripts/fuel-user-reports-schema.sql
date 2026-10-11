-- Applied only to Neon test branch br-weathered-meadow-b1bwpzst.
-- No canonical station price is changed by a pending user report.
CREATE TABLE IF NOT EXISTS ziiply_user_fuel_reports (
  id uuid PRIMARY KEY,
  source_station_id bigint NOT NULL,
  observed_at timestamptz NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  prices jsonb NOT NULL,
  photo_data_url text NOT NULL,
  gps_latitude double precision,
  gps_longitude double precision,
  gps_accuracy_m double precision,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending_review'
    CHECK(status IN ('pending_review','accepted','rejected'))
);
