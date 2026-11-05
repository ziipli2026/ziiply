import {normalizeArvoMeal,type ArvoMeal} from "./arvoStatistics.ts";
import {mergeArvoDeletedIds} from "./arvoMealReconciliation.ts";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const arvoUserCloudCacheKey=(userId:string)=>{
 if(!uuid.test(userId))throw Error("arvo-invalid-cloud-user");
 return "ziiply-arvo-cloud-meals-v1:"+userId.toLowerCase();
};

/** Store only the authenticated user's cloud response in an isolated cache.
 * Never copy the shared local diary to an account cache. A separate explicit
 * migration action is required before local meals may reach the server.
 */
export function applyArvoCloudSnapshot(
 storage:Pick<Storage,"getItem"|"setItem">,
 userId:string,
 remoteMeals:readonly ArvoMeal[],
 remoteDeletedIds:readonly string[],
):{meals:ArvoMeal[];conflicts:string[]} {
 const key=arvoUserCloudCacheKey(userId);
 const deleted=mergeArvoDeletedIds([],remoteDeletedIds);
 const tombstones=new Set(deleted);
 const byId=new Map<string,ArvoMeal>();
 const conflicts:string[]=[];
 for(const raw of remoteMeals){
  const meal=normalizeArvoMeal(raw);
  if(!meal||!uuid.test(meal.id))throw Error("arvo-invalid-cloud-meal");
  if(tombstones.has(meal.id))continue;
  const existing=byId.get(meal.id);
  if(existing&&JSON.stringify(existing)!==JSON.stringify(meal)){conflicts.push(meal.id);continue;}
  byId.set(meal.id,meal);
 }
 if(conflicts.length)return {meals:[],conflicts};
 const meals=[...byId.values()].sort((a,b)=>b.timestamp.localeCompare(a.timestamp));
 storage.setItem(key,JSON.stringify({meals,deletedIds:deleted}));
 return {meals,conflicts:[]};
}
