import type {ArvoSqlExecutor} from "./arvoNeonMealWriter.server.ts";
import type {ArvoMeal} from "./arvoStatistics.ts";

/** Fetch only the authenticated user's active meals and durable deletion IDs. */
export function createArvoNeonMealReader(db:ArvoSqlExecutor){
 return async (userId:string):Promise<{meals:ArvoMeal[];deletedIds:string[]}>=>{
  const [active,deleted]=await Promise.all([
   db.query("SELECT meal_id,consumed_at,ean,product_name,grams,kcal,protein_g,carbs_g,fat_g FROM public.ziiply_arvo_meals WHERE user_id=$1::uuid AND deleted_at IS NULL ORDER BY consumed_at DESC LIMIT 5000",[userId]),
   db.query("SELECT meal_id FROM public.ziiply_arvo_meal_deletions WHERE user_id=$1::uuid ORDER BY deleted_at DESC LIMIT 5000",[userId]),
  ]);
  const meals=active.rows.map(row=>({
   id:String(row.meal_id),timestamp:new Date(String(row.consumed_at)).toISOString(),
   ean:String(row.ean),name:String(row.product_name),grams:Number(row.grams),
   nutrition:{kcal:row.kcal===null?null:Number(row.kcal),protein:row.protein_g===null?null:Number(row.protein_g),carbs:row.carbs_g===null?null:Number(row.carbs_g),fat:row.fat_g===null?null:Number(row.fat_g)}
  }));
  return {meals,deletedIds:deleted.rows.map(row=>String(row.meal_id))};
 };
}
