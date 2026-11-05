import type {ArvoSqlExecutor} from "./arvoNeonMealWriter.server.ts";
import type {ArvoMeal} from "./arvoStatistics.ts";
import {validateArvoMealPayload} from "./arvoMealPayload.server.ts";
const asNumeric=(value:unknown):number|null=>{
 if(value===null)return null;
 if(typeof value!=="number"&&typeof value!=="string")throw Error("arvo-invalid-cloud-numeric");
 if(typeof value==="string"&&!/^\d+(?:\.\d+)?$/.test(value))throw Error("arvo-invalid-cloud-numeric");
 const parsed=Number(value);
 if(!Number.isFinite(parsed))throw Error("arvo-invalid-cloud-numeric");
 return parsed;
};
const asTimestamp=(value:unknown):string=>{
 const date=value instanceof Date?value:new Date(String(value));
 if(!Number.isFinite(date.getTime()))throw Error("arvo-invalid-cloud-timestamp");
 return date.toISOString();
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Fetch only the authenticated user's active meals and durable deletion IDs. */
export function createArvoNeonMealReader(db:ArvoSqlExecutor){
 return async (userId:string):Promise<{meals:ArvoMeal[];deletedIds:string[]}>=>{
  const [active,deleted]=await Promise.all([
   db.query("SELECT meal_id,consumed_at,ean,product_name,grams,kcal,protein_g,carbs_g,fat_g FROM public.ziiply_arvo_meals WHERE user_id=$1::uuid AND deleted_at IS NULL AND EXISTS (SELECT 1 FROM public.ziiply_arvo_meal_consents c WHERE c.user_id=$1::uuid AND c.granted_at IS NOT NULL AND c.revoked_at IS NULL) ORDER BY consumed_at DESC LIMIT 5001",[userId]),
   db.query("SELECT meal_id FROM public.ziiply_arvo_meal_deletions WHERE user_id=$1::uuid AND EXISTS (SELECT 1 FROM public.ziiply_arvo_meal_consents c WHERE c.user_id=$1::uuid AND c.granted_at IS NOT NULL AND c.revoked_at IS NULL) ORDER BY deleted_at DESC LIMIT 5001",[userId]),
  ]);
  // A consent revoked during the two reads must never look like a successful empty sync.
  const consent=await db.query("SELECT 1 AS active FROM public.ziiply_arvo_meal_consents WHERE user_id=$1::uuid AND granted_at IS NOT NULL AND revoked_at IS NULL",[userId]);
  if(consent.rows.length!==1)throw Error("arvo-cloud-consent-revoked");
  if(active.rows.length>5000||deleted.rows.length>5000)throw Error("arvo-sync-result-limit-exceeded");
  const deletedIds=deleted.rows.map(row=>String(row.meal_id));
  if(deletedIds.some(id=>!uuid.test(id)))throw Error("arvo-invalid-cloud-tombstone");
  const deletedSet=new Set(deletedIds);
  const meals:ArvoMeal[]=active.rows.filter(row=>!deletedSet.has(String(row.meal_id))).map(row=>({
   id:String(row.meal_id),timestamp:asTimestamp(row.consumed_at),
   ean:String(row.ean),name:String(row.product_name),grams:asNumeric(row.grams) ?? NaN,
   nutrition:{kcal:asNumeric(row.kcal),protein:asNumeric(row.protein_g),carbs:asNumeric(row.carbs_g),fat:asNumeric(row.fat_g)}
  })).map(meal=>{
   const valid=validateArvoMealPayload(meal);
   if(!valid)throw Error("arvo-invalid-cloud-meal");
   return valid;
  });
  return {meals,deletedIds};
 };
}
