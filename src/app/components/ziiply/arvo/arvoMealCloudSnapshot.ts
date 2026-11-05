import {ARVO_MEALS_KEY,readArvoMeals,type ArvoMeal} from "./arvoStatistics.ts";
import {readArvoDeletedMealIds,persistArvoRemoteDeletedIds} from "./arvoMealTombstones.ts";
import {mergeArvoDeletedIds,reconcileArvoMeals} from "./arvoMealReconciliation.ts";

/** Apply an already authenticated cloud snapshot to local storage.
 * Never uploads local meals. Persist tombstones first so a later storage
 * failure cannot resurrect deleted meals.
 */
export function applyArvoCloudSnapshot(
 storage:Pick<Storage,"getItem"|"setItem">,
 remoteMeals:readonly ArvoMeal[],
 remoteDeletedIds:readonly string[],
):{meals:ArvoMeal[];conflicts:string[]} {
 const deleted=mergeArvoDeletedIds(readArvoDeletedMealIds(storage),remoteDeletedIds);
 const local=readArvoMeals(storage);
 const result=reconcileArvoMeals(local,remoteMeals,deleted);
 persistArvoRemoteDeletedIds(storage,remoteDeletedIds);
 // Refuse to replace the existing meal cache when there are conflicting IDs.
 // A conflict must be resolved explicitly rather than silently overwritten.
 if(result.conflicts.length)return {meals:readArvoMeals(storage),conflicts:result.conflicts};
 storage.setItem(ARVO_MEALS_KEY,JSON.stringify(result.merged));
 return {meals:readArvoMeals(storage),conflicts:[]};
}
