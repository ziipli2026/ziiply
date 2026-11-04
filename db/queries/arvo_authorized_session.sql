-- Read-only query template for a server-side, verified session token hash.
-- $1 is the hash of the secure session cookie, never a client-provided user ID.
-- Use a parameterized driver; never interpolate raw tokens into SQL.
SELECT
  s.user_id AS "sessionUserId",
  s.expires_at AS "sessionExpiresAt",
  s.revoked_at AS "sessionRevokedAt",
  u.disabled_at AS "userDisabledAt",
  c.granted_at AS "cloudMealGrantedAt",
  c.revoked_at AS "cloudMealRevokedAt"
FROM public.ziiply_beta_sessions AS s
JOIN public.ziiply_beta_users AS u ON u.id = s.user_id
LEFT JOIN public.ziiply_arvo_meal_consents AS c ON c.user_id = u.id
WHERE s.token_hash = $1
LIMIT 1;
