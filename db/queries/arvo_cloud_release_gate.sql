-- Read-only deployment gate for Arvo cloud meal persistence.
-- Run against the intended Neon branch before enabling any meal API route.
-- All ready_* fields must be true; zero rows or false means NOT READY.
SELECT
 to_regclass('public.ziiply_beta_sessions') IS NOT NULL AS ready_beta_sessions,
 to_regclass('public.ziiply_beta_users') IS NOT NULL AS ready_beta_users,
 to_regclass('public.ziiply_beta_applications') IS NOT NULL AS ready_beta_applications,
 to_regclass('public.ziiply_arvo_meals') IS NOT NULL AS ready_meals,
 to_regclass('public.ziiply_arvo_meal_consents') IS NOT NULL AS ready_consents,
 to_regclass('public.ziiply_arvo_meal_deletions') IS NOT NULL AS ready_deletions,
 EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='ziiply_arvo_insert_meal'
   AND pg_get_function_result(p.oid)='boolean'
   AND NOT has_function_privilege('public',p.oid,'EXECUTE')
 ) AS ready_atomic_insert,
 EXISTS (
  SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname='ziiply_arvo_delete_meal_v2'
   AND pg_get_function_result(p.oid)='boolean'
   AND NOT has_function_privilege('public',p.oid,'EXECUTE')
 ) AS ready_atomic_delete_v2;
