-- Atomic Arvo meal writes. NOT APPLIED to Neon.
-- The API must authorize the session and explicit meal-cloud consent first.
-- p_user_id MUST come from the validated server session, never from request JSON.
CREATE OR REPLACE FUNCTION public.ziiply_arvo_insert_meal(
 p_user_id uuid,p_meal_id uuid,p_consumed_at timestamptz,p_ean text,
 p_product_name text,p_grams numeric,p_kcal numeric,p_protein_g numeric,
 p_carbs_g numeric,p_fat_g numeric
) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE inserted_count integer;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_meal_id::text,0));
 IF EXISTS(SELECT 1 FROM public.ziiply_arvo_meal_deletions
           WHERE user_id=p_user_id AND meal_id=p_meal_id) THEN
  RETURN false;
 END IF;
 INSERT INTO public.ziiply_arvo_meals
 (user_id,meal_id,consumed_at,ean,product_name,grams,kcal,protein_g,carbs_g,fat_g)
 VALUES(p_user_id,p_meal_id,p_consumed_at,p_ean,p_product_name,p_grams,p_kcal,p_protein_g,p_carbs_g,p_fat_g)
 ON CONFLICT(user_id,meal_id) DO NOTHING;
 GET DIAGNOSTICS inserted_count=ROW_COUNT;
 RETURN inserted_count=1;
END;
$$;

CREATE OR REPLACE FUNCTION public.ziiply_arvo_delete_meal(
 p_user_id uuid,p_meal_id uuid
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text || ':' || p_meal_id::text,0));
 INSERT INTO public.ziiply_arvo_meal_deletions(user_id,meal_id)
 VALUES(p_user_id,p_meal_id) ON CONFLICT(user_id,meal_id) DO NOTHING;
 UPDATE public.ziiply_arvo_meals
 SET deleted_at=COALESCE(deleted_at,now()),updated_at=now()
 WHERE user_id=p_user_id AND meal_id=p_meal_id AND deleted_at IS NULL;
END;
$$;

-- These functions must be callable ONLY by the trusted server database role.
-- Explicit grants and role separation must be reviewed before deployment.
REVOKE ALL ON FUNCTION public.ziiply_arvo_insert_meal(uuid,uuid,timestamptz,text,text,numeric,numeric,numeric,numeric,numeric) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ziiply_arvo_delete_meal(uuid,uuid) FROM PUBLIC;
