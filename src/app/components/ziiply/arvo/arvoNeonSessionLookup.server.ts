import type {ArvoSqlExecutor} from "./arvoNeonMealWriter.server.ts";
import type {ArvoSessionLookup} from "./arvoSessionResolver.server.ts";
import type {ArvoServerAccess} from "./arvoServerAccess.ts";

/** Only the verified server cookie hash may be passed to this parameterized lookup. */
export function createArvoNeonSessionLookup(db:ArvoSqlExecutor):ArvoSessionLookup {
 return async tokenHash=>{
  if(!/^[0-9a-f]{64}$/i.test(tokenHash))return null;
  const result=await db.query(
   'SELECT s.user_id AS "sessionUserId", s.expires_at AS "sessionExpiresAt", s.revoked_at AS "sessionRevokedAt", u.disabled_at AS "userDisabledAt", c.granted_at AS "cloudMealGrantedAt", c.revoked_at AS "cloudMealRevokedAt" FROM public.ziiply_beta_sessions s JOIN public.ziiply_beta_users u ON u.id=s.user_id LEFT JOIN public.ziiply_arvo_meal_consents c ON c.user_id=u.id WHERE s.token_hash=$1 LIMIT 1',
   [tokenHash],
  );
  if(result.rows.length!==1)return null;
  const row=result.rows[0];
  const required=["sessionUserId","sessionExpiresAt","sessionRevokedAt","userDisabledAt","cloudMealGrantedAt","cloudMealRevokedAt"];
  if(!required.every(key=>Object.hasOwn(row,key)))return null;
  return row as unknown as ArvoServerAccess;
 };
}
