-- Arvo cloud meal consent state transitions.
-- Execute only after resolving the server-side beta session.
-- $1 is authenticated session user_id; never accept it from request JSON.

-- Grant consent. A fresh grant starts a new active consent period.
INSERT INTO public.ziiply_arvo_meal_consents
 (user_id,granted_at,revoked_at,updated_at)
VALUES ($1,now(),NULL,now())
ON CONFLICT (user_id) DO UPDATE
SET granted_at=EXCLUDED.granted_at,revoked_at=NULL,updated_at=now();

-- Revoke consent. This immediately blocks future reads/writes when the
-- authorization query checks revoked_at IS NULL.
UPDATE public.ziiply_arvo_meal_consents
SET revoked_at=COALESCE(revoked_at,now()),updated_at=now()
WHERE user_id=$1;

-- Consent revocation intentionally does not silently erase meal history.
-- Offer a separate authenticated erase-cloud-data action and confirm it.
-- The API must re-check active consent inside every meal operation's transaction.
