-- MANUAL ONLY. Apply solely to the isolated development database after verifying target.
-- No application startup code runs this migration. No existing product tables are altered.
BEGIN;
CREATE SCHEMA IF NOT EXISTS ziiply_accounts;
CREATE TABLE ziiply_accounts.guest_imports (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id text NOT NULL,
  snapshot jsonb NOT NULL,
  snapshot_hash text GENERATED ALWAYS AS (md5(snapshot::text)) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (snapshot->>'version' = '1'),
  CHECK (octet_length(snapshot::text) <= 256000),
  UNIQUE (user_id, snapshot_hash)
);
-- Browser has no SQL access. All reads/writes must derive user_id from verified Auth session.
ALTER TABLE ziiply_accounts.guest_imports ENABLE ROW LEVEL SECURITY;
COMMIT;
