import {resolveArvoCloudSession,type ArvoSessionLookup} from "./arvoSessionResolver.server.ts";

export type ArvoMealDeleteResult={ok:true}|{ok:false;reason:"unauthorized"|"invalid-meal-id"|"storage-failed"};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Server-only delete boundary; userId is derived solely from verified session. */
export async function deleteArvoCloudMeal(
 rawSessionToken:string|null,
 mealId:unknown,
 lookup:ArvoSessionLookup,
 hashSessionToken:(token:string)=>string,
 remove:(userId:string,mealId:string)=>Promise<void>,
 now:Date=new Date(),
):Promise<ArvoMealDeleteResult>{
 const session=await resolveArvoCloudSession(rawSessionToken,lookup,hashSessionToken,now);
 if(!session)return {ok:false,reason:"unauthorized"};
 if(typeof mealId!=="string"||!uuid.test(mealId))return {ok:false,reason:"invalid-meal-id"};
 try{await remove(session.userId,mealId);}
 catch{return {ok:false,reason:"storage-failed"};}
 return {ok:true};
}
