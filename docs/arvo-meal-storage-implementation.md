# Arvo meal persistence implementation contract

Status: design only; do not expose a write endpoint without verified server-side session identity.

## Existing foundation
- Scanner writes `ziiply-arvo-meals-v1` in localStorage on explicit **Aterialle** action.
- `arvoStatistics.ts` validates nutrition values and supports local calendar grouping.
- Ziiply beta database has `ziiply_beta_users(id)` and `ziiply_beta_sessions(user_id,token_hash,expires_at,revoked_at)`.
- Existing iPhone HealthKit implementation is on-device only; cloud sync requires separate consent.

## Required server contract
1. Read session token from HttpOnly Secure SameSite cookie (verify actual cookie name and login issuance path).
2. Hash token on the server using the same algorithm as beta login. Compare to `ziiply_beta_sessions.token_hash`; enforce `expires_at > now()`, `revoked_at IS NULL`, and `ziiply_beta_users.disabled_at IS NULL`.
3. Derive `user_id` exclusively from the verified session. Never accept a client-supplied user ID.
4. GET returns only this user's meals. POST validates an `ArvoMeal` and inserts idempotently on (user_id,meal_id). DELETE must filter by both user_id and meal_id.
5. Migrate localStorage data with explicit confirmation and deduplication; retain local records until server confirms each write. Never silently overwrite or delete existing records.
6. Avoid recording meal contents or health data in analytics, application logs or error trackers.
7. Do not send HealthKit readings to Neon without separate, revocable consent; do not conflate HealthKit read permission with cloud sync consent.

## Suggested table (apply only after session verification is implemented)
```sql
CREATE TABLE IF NOT EXISTS ziiply_arvo_meals (
  user_id uuid NOT NULL REFERENCES ziiply_beta_users(id) ON DELETE CASCADE,
  meal_id uuid NOT NULL,
  consumed_at timestamptz NOT NULL,
  ean text NOT NULL CHECK (ean ~ '^[0-9]{8,14}$'),
  product_name text NOT NULL,
  grams numeric(12,2) NOT NULL CHECK (grams > 0),
  kcal numeric(12,2),
  protein_g numeric(12,2),
  carbs_g numeric(12,2),
  fat_g numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, meal_id),
  CHECK (kcal IS NULL OR kcal >= 0),
  CHECK (protein_g IS NULL OR protein_g >= 0),
  CHECK (carbs_g IS NULL OR carbs_g >= 0),
  CHECK (fat_g IS NULL OR fat_g >= 0)
);
CREATE INDEX IF NOT EXISTS ziiply_arvo_meals_user_date_idx ON ziiply_arvo_meals(user_id,consumed_at DESC);
```

## Acceptance checks
- Two distinct users cannot read, edit or delete one another's meals.
- Missing, expired, revoked, or disabled-user sessions return 401.
- Repeated migration does not duplicate meals.
- Invalid quantities, timestamps, and negative nutrients are rejected.
- Missing nutrient stays NULL, not zero.
- Scanner remains functional without network and reports unsynced entries.
- All existing Arvo statistics tests remain green.
