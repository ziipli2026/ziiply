import "server-only";
import { cookies } from "next/headers";
import { neon } from "@neondatabase/serverless";
import { BETA_COOKIE_NAME } from "./ziiplyBetaSessionSecurity.mjs";
import { hashBetaToken } from "./ziiplyBetaAuthTokens.mjs";

/**
 * Server-side beta access check. Denies access on missing configuration,
 * malformed tokens, revoked sessions, disabled users, and database failures.
 */
export async function hasBetaAccess(): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return false;
  const token = (await cookies()).get(BETA_COOKIE_NAME)?.value;
  if (!token) return false;
  let hash: string;
  try { hash = hashBetaToken(token); } catch { return false; }
  try {
    const sql = neon(databaseUrl);
    const rows = await sql`
      SELECT 1 FROM public.ziiply_beta_sessions s
      JOIN public.ziiply_beta_users u ON u.id = s.user_id
      JOIN public.ziiply_beta_applications a ON a.id = u.application_id
      WHERE s.token_hash = ${hash}
        AND s.revoked_at IS NULL
        AND s.expires_at > now()
        AND u.disabled_at IS NULL
        AND a.status IN ('invited','active')
      LIMIT 1`;
    return rows.length === 1;
  } catch {
    return false;
  }
}
