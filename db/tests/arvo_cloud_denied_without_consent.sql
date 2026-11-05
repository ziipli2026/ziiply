-- Run ONLY against the isolated Arvo Neon test branch.
-- Negative authorization tests: no fixtures or persistent writes.
-- A failure raises an exception and aborts execution.
DO $$
DECLARE
 uid uuid := '00000000-0000-4000-8000-000000009991';
 delete_id uuid := '00000000-0000-4000-8000-000000009992';
 insert_id uuid := '00000000-0000-4000-8000-000000009993';
 denied boolean;
BEGIN
 IF EXISTS (SELECT 1 FROM public.ziiply_beta_users WHERE id=uid)
 OR EXISTS (SELECT 1 FROM public.ziiply_arvo_meal_consents WHERE user_id=uid)
 THEN RAISE EXCEPTION 'Synthetic test user already exists'; END IF;
 denied:=false;
 BEGIN
  PERFORM public.ziiply_arvo_delete_meal_v2(uid,delete_id);
 EXCEPTION WHEN SQLSTATE '42501' THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Delete without consent must be denied'; END IF;
 IF EXISTS (SELECT 1 FROM public.ziiply_arvo_meal_deletions WHERE user_id=uid AND meal_id=delete_id)
 THEN RAISE EXCEPTION 'Unauthorized delete wrote a tombstone'; END IF;
 denied:=false;
 BEGIN
  PERFORM public.ziiply_arvo_insert_meal(uid,insert_id,now(),'6410405082651','Arvo synthetic test',100,100,1,2,3);
 EXCEPTION WHEN SQLSTATE '42501' THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Insert without consent must be denied'; END IF;
 IF EXISTS (SELECT 1 FROM public.ziiply_arvo_meals WHERE user_id=uid AND meal_id=insert_id)
 THEN RAISE EXCEPTION 'Unauthorized insert wrote a meal'; END IF;
END $$;
