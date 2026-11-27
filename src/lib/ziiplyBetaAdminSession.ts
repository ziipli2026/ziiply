import { neon } from "@neondatabase/serverless";
import { hashBetaToken } from "./ziiplyBetaAuthTokens.mjs";

export async function isBetaAdminSession(token: string | undefined) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!token || !databaseUrl || !process.env.ZIIPLY_BETA_ADMIN_EMAIL) return false;

  let hash: string;
  try {
    hash = hashBetaToken(token);
  } catch {
    return false;
  }

  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT 1 FROM public.ziiply_beta_admin_tokens
    WHERE token_hash = ${hash} AND purpose = 'session'
      AND revoked_at IS NULL AND expires_at > now()
    LIMIT 1
  `;
  return rows.length > 0;
}
