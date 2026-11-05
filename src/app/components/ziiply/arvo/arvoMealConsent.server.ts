import {resolveArvoConsentSession} from "./arvoConsentSessionResolver.server.ts";
import type {ArvoSessionLookup} from "./arvoSessionResolver.server.ts";

export type ArvoConsentResult={ok:true}|{ok:false;reason:"unauthorized"|"invalid-action"|"storage-failed"};
export type ArvoConsentWriter=(userId:string,action:"grant"|"revoke")=>Promise<void>;

/** Server-only opt-in boundary. The user ID is always taken from the verified session.
 * This operation changes permission only; it must NEVER upload local meal history.
 */
export async function updateArvoCloudMealConsent(
 rawSessionToken:string|null,
 action:unknown,
 lookup:ArvoSessionLookup,
 hashSessionToken:(token:string)=>string,
 write:ArvoConsentWriter,
 now:Date=new Date(),
):Promise<ArvoConsentResult>{
 if(action!=="grant"&&action!=="revoke")return {ok:false,reason:"invalid-action"};
 const session=await resolveArvoConsentSession(rawSessionToken,lookup,hashSessionToken,now);
 if(!session)return {ok:false,reason:"unauthorized"};
 try{await write(session.userId,action);}catch{return {ok:false,reason:"storage-failed"};}
 return {ok:true};
}
