import type {ArvoMeal} from "./arvoStatistics.ts";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ean=/^[0-9]{8,14}$/;
const nutrient=(value:unknown):value is number|null=>value===null||(typeof value==="number"&&Number.isFinite(value)&&value>=0&&value<=1000000);

/** Strict server-side validation. Never infer authorization from this payload. */
export function validateArvoMealPayload(input:unknown):ArvoMeal|null {
 if(!input||typeof input!=="object"||Array.isArray(input))return null;
 const m=input as Record<string,unknown>;
 if(typeof m.id!=="string"||!uuid.test(m.id))return null;
 if(typeof m.ean!=="string"||!ean.test(m.ean))return null;
 if(typeof m.name!=="string"||!m.name.trim()||m.name.length>500)return null;
 if(typeof m.grams!=="number"||!Number.isFinite(m.grams)||m.grams<=0||m.grams>1000000)return null;
 if(typeof m.timestamp!=="string"||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(m.timestamp)||!Number.isFinite(Date.parse(m.timestamp)))return null;
 if(!m.nutrition||typeof m.nutrition!=="object"||Array.isArray(m.nutrition))return null;
 const n=m.nutrition as Record<string,unknown>;
 if(!["kcal","protein","carbs","fat"].every(key=>Object.hasOwn(n,key)&&nutrient(n[key])))return null;
 return {id:m.id,timestamp:new Date(m.timestamp).toISOString(),ean:m.ean,name:m.name.trim(),grams:m.grams,
 nutrition:{kcal:n.kcal as number|null,protein:n.protein as number|null,carbs:n.carbs as number|null,fat:n.fat as number|null}};
}
