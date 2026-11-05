-- Isolated Neon TEST BRANCH only. Do not run on production.
-- Synthetic beta account + consent + meal. Nested exception subtransaction
-- intentionally rolls back ALL fixture writes after assertions succeed.
DO $outer$
DECLARE
 uid uuid := '00000000-0000-4000-8000-000000009991';
 mid uuid := '00000000-0000-4000-8000-000000009994';
 appid bigint; inserted boolean; deleted boolean; sentinel boolean := false;
BEGIN
 IF EXISTS(SELECT 1 FROM public.ziiply_beta_users WHERE id=uid)
 THEN RAISE EXCEPTION 'Fixture collision'; END IF;
 BEGIN
  INSERT INTO public.ziiply_beta_applications(email,municipality,profile_key,privacy_consent_at,status)
  VALUES('arvo-synthetic-991991@example.invalid','Test','nutrition',now(),'active') RETURNING id INTO appid;
  INSERT INTO public.ziiply_beta_users(id,application_id,email_verified_at) VALUES(uid,appid,now());
  INSERT INTO public.ziiply_arvo_meal_consents(user_id,granted_at) VALUES(uid,now());
  SELECT public.ziiply_arvo_insert_meal(uid,mid,now(),'6410405082651','Arvo synthetic test',100,100,1,2,3) INTO inserted;
  IF inserted IS DISTINCT FROM true THEN RAISE EXCEPTION 'Insert failed'; END IF;
  IF (SELECT count(*) FROM public.ziiply_arvo_meals WHERE user_id=uid AND meal_id=mid AND deleted_at IS NULL)<>1
  THEN RAISE EXCEPTION 'Read failed'; END IF;
  SELECT public.ziiply_arvo_delete_meal_v2(uid,mid) INTO deleted;
  IF deleted IS DISTINCT FROM true THEN RAISE EXCEPTION 'Delete failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.ziiply_arvo_meal_deletions WHERE user_id=uid AND meal_id=mid)
  THEN RAISE EXCEPTION 'Tombstone missing'; END IF;
  IF EXISTS(SELECT 1 FROM public.ziiply_arvo_meals WHERE user_id=uid AND meal_id=mid AND deleted_at IS NULL)
  THEN RAISE EXCEPTION 'Deleted meal active'; END IF;
  SELECT public.ziiply_arvo_insert_meal(uid,mid,now(),'6410405082651','Arvo synthetic test',100,100,1,2,3) INTO inserted;
  IF inserted IS DISTINCT FROM false THEN RAISE EXCEPTION 'Resurrection not blocked'; END IF;
  RAISE EXCEPTION 'ARVO_TEST_ROLLBACK_SENTINEL';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='ARVO_TEST_ROLLBACK_SENTINEL' THEN sentinel:=true; ELSE RAISE; END IF;
 END;
 IF NOT sentinel THEN RAISE EXCEPTION 'No rollback'; END IF;
 IF EXISTS(SELECT 1 FROM public.ziiply_beta_users WHERE id=uid)
 OR EXISTS(SELECT 1 FROM public.ziiply_beta_applications WHERE email='arvo-synthetic-991991@example.invalid')
 THEN RAISE EXCEPTION 'Fixture persisted'; END IF;
END $outer$;
