import type {ArvoServerAccess} from "./arvoServerAccess.ts";
import type {ArvoSessionLookup} from "./arvoSessionResolver.server.ts";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const time=(v:string|Date|null)=>v instanceof Date?v.getTime():typeof v==="string"?Date.parse(v):NaN;

/** Only for explicit cloud-consent management, NEVER for meal data access. */
export async function resolveArvoConsentSession(
 rawSessionToken:string|null,
 lookup:ArvoSessionLookup,
 hashSessionToken:(token:string)=>string,
 now:Date=new Date(),
):Promise<{userId:string}|null>{
 if(!rawSessionToken||rawSessionToken.length<32||rawSessionToken.length>4096||!Number.isFinite(now.getTime()))return null;
 let hash:string;
 try{hash=hashSessionToken(rawSessionToken);}catch{return null;}
 if(typeof hash!=="string"||!/^[0-9a-f]{64}$/i.test(hash))return null;
 let access:ArvoServerAccess|null;
 try{access=await lookup(hash);}catch{return null;}
 if(!access||!access.sessionUserId||!uuid.test(access.sessionUserId))return null;
 if(!access.sessionExpiresAt||!Number.isFinite(time(access.sessionExpiresAt))||time(access.sessionExpiresAt)<=now.getTime())return null;
 if(access.sessionRevokedAt!==null||access.userDisabledAt!==null)return null;
 // Consent is deliberately NOT required here: this is the first-grant boundary.
 return {userId:access.sessionUserId};
}
