import {normalizeArvoMeal, type ArvoMeal} from "./arvoStatistics.ts";
import {canSyncArvoMeals, type ArvoMealSyncPermission} from "./arvoMealSyncPermission.ts";
import {reconcileArvoMeals} from "./arvoMealReconciliation.ts";

export type ArvoMealUploadPlan = {
  allowed: boolean;
  upload: ArvoMeal[];
  localOnly: ArvoMeal[];
  conflicts: string[];
  deleteRemoteIds: string[];
};

/**
 * Prepare a side-effect-free upload plan. No caller may send meals when allowed
 * is false. Consent must be verified again by the server at write time.
 */
export function planArvoMealUpload(
  local: readonly ArvoMeal[],
  remote: readonly ArvoMeal[],
  permission: ArvoMealSyncPermission,
  deletedIds: readonly string[] = [],
): ArvoMealUploadPlan {
  if (!canSyncArvoMeals(permission)) {
    return {allowed:false,upload:[],localOnly:local.map(normalizeArvoMeal).filter((m):m is ArvoMeal=>m!==null&&!deletedIds.includes(m.id)),conflicts:[],deleteRemoteIds:[]};
  }
  const {upload,localOnly,conflicts}=reconcileArvoMeals(local,remote,deletedIds);
  const remoteIds = new Set(remote.map(meal=>meal.id));
  const deleteRemoteIds = [...new Set(deletedIds)].filter(id=>remoteIds.has(id));
  return {allowed:true,upload,localOnly,conflicts,deleteRemoteIds};
}
