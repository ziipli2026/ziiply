import type {ArvoSqlExecutor} from "./arvoNeonMealWriter.server.ts";
import type {ArvoConsentWriter} from "./arvoMealConsent.server.ts";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Parameterized consent persistence. Caller must provide a server-verified beta user ID. */
export function createArvoNeonConsentWriter(db:ArvoSqlExecutor):ArvoConsentWriter {
 return async(userId,action)=>{
  if(!uuid.test(userId))throw Error("arvo-invalid-consent-user");
  if(action==="grant"){
   const result=await db.query(
    "INSERT INTO public.ziiply_arvo_meal_consents (user_id,granted_at,revoked_at,updated_at) VALUES ($1::uuid,now(),NULL,now()) ON CONFLICT (user_id) DO UPDATE SET granted_at=EXCLUDED.granted_at,revoked_at=NULL,updated_at=now() RETURNING user_id",
    [userId],
   );
   if(result.rows.length!==1||String(result.rows[0]?.user_id).toLowerCase()!==userId.toLowerCase())throw Error("arvo-consent-grant-unconfirmed");
  }else if(action==="revoke"){
   // A missing consent row is already revoked; never create a grant here.
   const result=await db.query(
    "UPDATE public.ziiply_arvo_meal_consents SET revoked_at=COALESCE(revoked_at,now()),updated_at=now() WHERE user_id=$1::uuid RETURNING user_id",
    [userId],
   );
   if(result.rows.length>1||(result.rows.length===1&&String(result.rows[0]?.user_id).toLowerCase()!==userId.toLowerCase()))throw Error("arvo-consent-revoke-unconfirmed");
  }else throw Error("arvo-invalid-consent-action");
 };
}
