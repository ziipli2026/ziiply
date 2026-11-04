-- Read-only preflight checks for Arvo meal cloud rollout.
-- Run in Ziiply Neon before applying migrations; no data is changed.
SELECT
 to_regclass('public.ziiply_beta_users') IS NOT NULL AS beta_users_exist,
 to_regclass('public.ziiply_beta_sessions') IS NOT NULL AS beta_sessions_exist,
 to_regclass('public.ziiply_arvo_meals') IS NOT NULL AS arvo_meals_exist,
 to_regclass('public.ziiply_arvo_meal_consents') IS NOT NULL AS arvo_consents_exist,
 to_regclass('public.ziiply_arvo_meal_deletions') IS NOT NULL AS arvo_deletions_exist;
-- Audit current function EXECUTE grants before deployment:
SELECT n.nspname AS schema_name,p.proname AS function_name,
       pg_get_function_identity_arguments(p.oid) AS arguments,
       r.rolname AS grantee
FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
JOIN pg_roles r ON has_function_privilege(r.oid,p.oid,'EXECUTE')
WHERE n.nspname='public' AND p.proname IN
 ('ziiply_arvo_insert_meal','ziiply_arvo_delete_meal')
ORDER BY p.proname,r.rolname;
-- Expected: only specifically approved backend roles should have EXECUTE.
-- This query is a diagnostic; it does not revoke any grants.
