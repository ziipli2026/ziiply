import type {ArvoSqlExecutor} from "./arvoNeonMealWriter.server.ts";
import type {ArvoMeal} from "./arvoStatistics.ts";
import {validateArvoMealPayload} from "./arvoMealPayload.server.ts";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Fetch only the authenticated user's active meals and durable deletion IDs. */
export function createArvoNeonMealReader(db:ArvoSqlExecutor){
 return async (userId:string):Promise<{meals:ArvoMeal[];deletedIds:string[]}>=>{
  const [active,deleted]=await Promise.all([
   db.query("SELECT meal_id,consumed_at,ean,product_name,grams,kcal,protein_g,carbs_g,fat_g FROM public.ziiply_arvo_meals WHERE user_id=$1::uuid AND deleted_at IS NULL ORDER BY consumed_at DESC LIMIT 5001",[userId]),
   db.query("SELECT meal_id FROM public.ziiply_arvo_meal_deletions WHERE user_id=$1::uuid ORDER BY deleted_at DESC LIMIT 5001",[userId]),
  ]);
  if(active.rows.length>5000||deleted.rows.length>5000)throw Error("arvo-sync-result-limit-exceeded");
  const deletedIds=deleted.rows.map(row=>String(row.meal_id));
  if(deletedIds.some(id=>!uuid.test(id)))throw Error("arvo-invalid-cloud-tombstone");
  const deletedSet=new Set(deletedIds);
  const meals:ArvoMeal[]=active.rows.filter(row=>!deletedSet.has(String(row.meal_id))).map(row=>({
   id:String(row.meal_id),timestamp:String(row.consumed_at instanceof Date?row.consumed_at.toISOString():row.consumed_at),
   ean:String(row.ean),name:String(row.product_name),grams:Number(row.grams),
   nutrition:{kcal:row.kcal===null?null:Number(row.kcal),protein:row.protein_g===null?null:Number(row.protein_g),carbs:row.carbs_g===null?null:Number(row.carbs_g),fat:row.fat_g===null?null:Number(row.fat_g)}
  })).map(meal=>{
   const valid=validateArvoMealPayload(meal);
   if(!valid)throw Error("arvo-invalid-cloud-meal");
   return valid;
  });
  return {meals,deletedIds};
 };
}
