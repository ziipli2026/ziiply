import {planArvoMealUpload,type ArvoMealUploadPlan} from "./arvoMealUploadPlan.ts";
import type {ArvoMeal} from "./arvoStatistics.ts";
import type {ArvoMealSyncPermission} from "./arvoMealSyncPermission.ts";

/** Cloud consent does not authorize bulk migration of historic local meals.
 * A separate, deliberate user action is required on every migration attempt.
 */
export function planExplicitArvoMealMigration(
 local:readonly ArvoMeal[],
 remote:readonly ArvoMeal[],
 permission:ArvoMealSyncPermission,
 explicitMigrationConfirmed:boolean,
 deletedIds:readonly string[]=[],
 remoteDeletedIds:readonly string[]=[],
):ArvoMealUploadPlan{
 if(explicitMigrationConfirmed!==true){
  return planArvoMealUpload(local,remote,{...permission,cloudMealConsent:false},deletedIds,remoteDeletedIds);
 }
 return planArvoMealUpload(local,remote,permission,deletedIds,remoteDeletedIds);
}
