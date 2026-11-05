import {readArvoMeals,type ArvoMeal} from "./arvoStatistics.ts";
import {readArvoDeletedMealIds} from "./arvoMealTombstones.ts";
import {mergeArvoDeletedIds,reconcileArvoMeals} from "./arvoMealReconciliation.ts";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const arvoUserCloudCacheKey=(userId:string)=>{
 if(!uuid.test(userId))throw Error("arvo-invalid-cloud-user");
 return "ziiply-arvo-cloud-meals-v1:"+userId.toLowerCase();
};

/** Apply an authenticated cloud snapshot to a user-scoped cache.
 * The shared local meal diary is NEVER overwritten with account data.
 * Callers must verify that userId comes from the authenticated server session.
 */
export function applyArvoCloudSnapshot(
 storage:Pick<Storage,"getItem"|"setItem">,
 userId:string,
 remoteMeals:readonly ArvoMeal[],
 remoteDeletedIds:readonly string[],
):{meals:ArvoMeal[];conflicts:string[]} {
 const key=arvoUserCloudCacheKey(userId);
 const deleted=mergeArvoDeletedIds(readArvoDeletedMealIds(storage),remoteDeletedIds);
 const local=readArvoMeals(storage);
 const result=reconcileArvoMeals(local,remoteMeals,deleted);
 // Do not mutate shared local diary or its tombstones. Cloud data stays scoped
 // to this authenticated account and is not available through readArvoMeals.
 if(result.conflicts.length)return {meals:local,conflicts:result.conflicts};
 storage.setItem(key,JSON.stringify({meals:result.merged,deletedIds:deleted}));
 return {meals:result.merged,conflicts:[]};
}
