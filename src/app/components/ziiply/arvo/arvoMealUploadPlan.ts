import {normalizeArvoMeal, type ArvoMeal} from "./arvoStatistics.ts";
import {canSyncArvoMeals, type ArvoMealSyncPermission} from "./arvoMealSyncPermission.ts";
import {reconcileArvoMeals} from "./arvoMealReconciliation.ts";

export type ArvoMealUploadPlan = {
  allowed: boolean;
  upload: ArvoMeal[];
  localOnly: ArvoMeal[];
  conflicts: string[];
};

/**
 * Prepare a side-effect-free upload plan. No caller may send meals when allowed
 * is false. Consent must be verified again by the server at write time.
 */
export function planArvoMealUpload(
  local: readonly ArvoMeal[],
  remote: readonly ArvoMeal[],
  permission: ArvoMealSyncPermission,
): ArvoMealUploadPlan {
  if (!canSyncArvoMeals(permission)) {
    return {allowed:false,upload:[],localOnly:local.map(normalizeArvoMeal).filter((m):m is ArvoMeal=>m!==null),conflicts:[]};
  }
  const {upload,localOnly,conflicts}=reconcileArvoMeals(local,remote);
  return {allowed:true,upload,localOnly,conflicts};
}
