CREATE TABLE IF NOT EXISTS ziiply_fuel_photo_learning (
 id uuid PRIMARY KEY, token_hash text NOT NULL, photo_hash text NOT NULL,
 photo_data_url text, initial_prices jsonb NOT NULL DEFAULT '{}',
 readings jsonb NOT NULL DEFAULT '[]', recovered_prices jsonb NOT NULL DEFAULT '{}',
 corrected_prices jsonb, metadata jsonb NOT NULL DEFAULT '{}',
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','recovered','discarded','corrected')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 next_attempt_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz, lease_token uuid,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
 last_error text, report_id uuid
);
CREATE INDEX IF NOT EXISTS ziiply_fuel_photo_learning_queue ON ziiply_fuel_photo_learning(status,next_attempt_at);
CREATE INDEX IF NOT EXISTS ziiply_fuel_photo_learning_created ON ziiply_fuel_photo_learning(created_at);
