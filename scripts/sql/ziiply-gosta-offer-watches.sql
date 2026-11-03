-- Gösta offer watches: user-owned search terms and last confirmed offer matches.
-- Apply to the Ziiply database only after verifying the application session middleware.
CREATE TABLE IF NOT EXISTS ziiply_gosta_offer_watches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES ziiply_beta_users(id) ON DELETE CASCADE,
 query text NOT NULL CHECK (char_length(btrim(query)) BETWEEN 2 AND 120),
 store_scope jsonb NOT NULL DEFAULT '[]'::jsonb,
 enabled boolean NOT NULL DEFAULT true,
 last_checked_at timestamptz,
 last_error text,
 matches jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(matches)='array'),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ziiply_gosta_offer_watches_user_idx ON ziiply_gosta_offer_watches(user_id,enabled);
CREATE INDEX IF NOT EXISTS ziiply_gosta_offer_watches_due_idx ON ziiply_gosta_offer_watches(last_checked_at) WHERE enabled;
-- Cron schedule: 05:00, 11:00, 17:00 UTC (07:00, 13:00, 19:00 Finnish winter time).
-- Production schedule must account for daylight saving time using Europe/Helsinki.
