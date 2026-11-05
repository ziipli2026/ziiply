-- Run ONLY on isolated Neon Arvo test branch.
-- Verify revoking cloud consent blocks BOTH insert and delete, even if
-- a previously granted user still has an existing meal.
-- The nested exception block rolls back every synthetic fixture.
DO $outer$
DECLARE
 uid uuid := '00000000-0000-4000-8000-000000009995';
 target_meal_id uuid := '00000000-0000-4000-8000-000000009996';
 next_id uuid := '00000000-0000-4000-8000-000000009997';
 appid bigint; denied boolean; sentinel boolean := false;
BEGIN
 IF EXISTS (SELECT 1 FROM public.ziiply_beta_users WHERE id=uid)
 THEN RAISE EXCEPTION 'Fixture collision'; END IF;
 BEGIN
  INSERT INTO public.ziiply_beta_applications(email,municipality,profile_key,privacy_consent_at,status)
  VALUES('arvo-synthetic-revocation-991995@example.invalid','Test','nutrition',now(),'active')
  RETURNING id INTO appid;
  INSERT INTO public.ziiply_beta_users(id,application_id,email_verified_at)
  VALUES(uid,appid,now());
  INSERT INTO public.ziiply_arvo_meal_consents(user_id,granted_at)
  VALUES(uid,now());
  IF public.ziiply_arvo_insert_meal(uid,target_meal_id,now(),'6410405082651','Synthetic meal',100,100,1,2,3) IS DISTINCT FROM true
  THEN RAISE EXCEPTION 'Fixture meal insertion failed'; END IF;
  UPDATE public.ziiply_arvo_meal_consents SET revoked_at=now(),updated_at=now() WHERE user_id=uid;
  denied:=false;
  BEGIN
   PERFORM public.ziiply_arvo_insert_meal(uid,next_id,now(),'6410405082651','Blocked meal',100,100,1,2,3);
  EXCEPTION WHEN SQLSTATE '42501' THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Insert after revocation was permitted'; END IF;
  denied:=false;
  BEGIN
   PERFORM public.ziiply_arvo_delete_meal_v2(uid,target_meal_id);
  EXCEPTION WHEN SQLSTATE '42501' THEN denied:=true;
  END;
  IF NOT denied THEN RAISE EXCEPTION 'Delete after revocation was permitted'; END IF;
  IF EXISTS (SELECT 1 FROM public.ziiply_arvo_meals WHERE user_id=uid AND meal_id=next_id)
  OR EXISTS (SELECT 1 FROM public.ziiply_arvo_meal_deletions WHERE user_id=uid AND meal_id=target_meal_id)
  THEN RAISE EXCEPTION 'Revoked operation changed data'; END IF;
  RAISE EXCEPTION 'ARVO_TEST_ROLLBACK_SENTINEL';
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM='ARVO_TEST_ROLLBACK_SENTINEL' THEN sentinel:=true; ELSE RAISE; END IF;
 END;
 IF NOT sentinel THEN RAISE EXCEPTION 'No rollback'; END IF;
 IF EXISTS(SELECT 1 FROM public.ziiply_beta_users WHERE id=uid)
 OR EXISTS(SELECT 1 FROM public.ziiply_beta_applications WHERE email='arvo-synthetic-revocation-991995@example.invalid')
 THEN RAISE EXCEPTION 'Fixture persisted'; END IF;
END $outer$;
