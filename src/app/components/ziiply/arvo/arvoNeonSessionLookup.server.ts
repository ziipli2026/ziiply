import type {ArvoSqlExecutor} from "./arvoNeonMealWriter.server.ts";
import type {ArvoSessionLookup} from "./arvoSessionResolver.server.ts";
import type {ArvoServerAccess} from "./arvoServerAccess.ts";

/** Only the verified server cookie hash may be passed to this parameterized lookup. */
export function createArvoNeonSessionLookup(db:ArvoSqlExecutor):ArvoSessionLookup {
 return async tokenHash=>{
  if(!/^[0-9a-f]{64}$/i.test(tokenHash))return null;
  const result=await db.query(
   `SELECT s.user_id AS "sessionUserId", s.expires_at AS "sessionExpiresAt", s.revoked_at AS "sessionRevokedAt", u.disabled_at AS "userDisabledAt", c.granted_at AS "cloudMealGrantedAt", c.revoked_at AS "cloudMealRevokedAt" FROM public.ziiply_beta_sessions s JOIN public.ziiply_beta_users u ON u.id=s.user_id JOIN public.ziiply_beta_applications a ON a.id=u.application_id LEFT JOIN public.ziiply_arvo_meal_consents c ON c.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now() AND s.revoked_at IS NULL AND u.disabled_at IS NULL AND a.status IN ('invited','active') AND c.granted_at IS NOT NULL AND c.granted_at<=now() AND c.revoked_at IS NULL LIMIT 1`,
   [tokenHash],
  );
  if(result.rows.length!==1)return null;
  const row=result.rows[0];
  if(!row||typeof row!=="object"||Array.isArray(row))return null;
  const required=["sessionUserId","sessionExpiresAt","sessionRevokedAt","userDisabledAt","cloudMealGrantedAt","cloudMealRevokedAt"];
  if(!required.every(key=>Object.hasOwn(row,key)))return null;
  const nullableDate=(value:unknown):value is string|Date|null=>value===null||typeof value==="string"||value instanceof Date;
  if(typeof row.sessionUserId!=="string")return null;
  if(!nullableDate(row.sessionExpiresAt)||row.sessionExpiresAt===null)return null;
  if(!nullableDate(row.sessionRevokedAt)||!nullableDate(row.userDisabledAt))return null;
  if(!nullableDate(row.cloudMealGrantedAt)||!nullableDate(row.cloudMealRevokedAt))return null;
  const access:ArvoServerAccess={
   sessionUserId:row.sessionUserId,
   sessionExpiresAt:row.sessionExpiresAt,
   sessionRevokedAt:row.sessionRevokedAt,
   userDisabledAt:row.userDisabledAt,
   cloudMealGrantedAt:row.cloudMealGrantedAt,
   cloudMealRevokedAt:row.cloudMealRevokedAt,
  };
  return access;
 };
}
