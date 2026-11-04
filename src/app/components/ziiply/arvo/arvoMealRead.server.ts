import {resolveArvoCloudSession,type ArvoSessionLookup} from "./arvoSessionResolver.server.ts";
import type {ArvoMeal} from "./arvoStatistics.ts";

export type ArvoMealReadResult={ok:true;meals:ArvoMeal[];deletedIds:string[]}|{ok:false;reason:"unauthorized"|"storage-failed"};
export async function readArvoCloudMeals(
 rawSessionToken:string|null,
 lookup:ArvoSessionLookup,
 hashSessionToken:(token:string)=>string,
 read:(userId:string)=>Promise<{meals:ArvoMeal[];deletedIds:string[]}>,
 now:Date=new Date(),
):Promise<ArvoMealReadResult>{
 const session=await resolveArvoCloudSession(rawSessionToken,lookup,hashSessionToken,now);
 if(!session)return {ok:false,reason:"unauthorized"};
 try {
  const result=await read(session.userId);
  return {ok:true,meals:result.meals,deletedIds:result.deletedIds};
 }catch{return {ok:false,reason:"storage-failed"};}
}
