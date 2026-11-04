import {validateArvoMealPayload} from "./arvoMealPayload.server.ts";
import {resolveArvoCloudSession,type ArvoSessionLookup} from "./arvoSessionResolver.server.ts";

export type ArvoMealWriteResult={ok:true;mealId:string}|{ok:false;reason:"unauthorized"|"invalid-meal"|"storage-failed"};
export type ArvoMealWrite = (userId:string,meal:NonNullable<ReturnType<typeof validateArvoMealPayload>>)=>Promise<void>;

/**
 * Server-only write boundary. The client cannot supply a user ID.
 * Consent is checked from the database-backed session lookup on each request.
 * The database write MUST additionally use the atomic consent-checking SQL function.
 */
export async function writeArvoCloudMeal(
 rawSessionToken:string|null,
 payload:unknown,
 lookup:ArvoSessionLookup,
 hashSessionToken:(token:string)=>string,
 write:ArvoMealWrite,
 now:Date=new Date(),
):Promise<ArvoMealWriteResult>{
 const session=await resolveArvoCloudSession(rawSessionToken,lookup,hashSessionToken,now);
 if(!session)return {ok:false,reason:"unauthorized"};
 const meal=validateArvoMealPayload(payload);
 if(!meal)return {ok:false,reason:"invalid-meal"};
 try {await write(session.userId,meal);}
 catch {return {ok:false,reason:"storage-failed"};}
 return {ok:true,mealId:meal.id};
}
