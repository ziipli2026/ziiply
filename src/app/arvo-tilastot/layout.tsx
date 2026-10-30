import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { neon } from "@neondatabase/serverless";
import { hashBetaToken } from "../../lib/ziiplyBetaAuthTokens.mjs";
import { BETA_COOKIE_NAME } from "../../lib/ziiplyBetaSessionSecurity.mjs";

export const dynamic = "force-dynamic";

export default async function ArvoStatisticsLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get(BETA_COOKIE_NAME)?.value;
  if (!token || !process.env.DATABASE_URL) redirect("/beta/kirjaudu");
  let hash: string;
  try { hash = hashBetaToken(token); } catch { redirect("/beta/kirjaudu"); }
  const sql = neon(process.env.DATABASE_URL);
  const sessions = await sql`
    SELECT s.id FROM public.ziiply_beta_sessions s
    JOIN public.ziiply_beta_users u ON u.id = s.user_id
    JOIN public.ziiply_beta_applications a ON a.id = u.application_id
    WHERE s.token_hash = ${hash} AND s.revoked_at IS NULL
      AND s.expires_at > now() AND u.disabled_at IS NULL
      AND a.status IN ('invited','active') LIMIT 1`;
  if (!sessions.length) redirect("/beta/kirjaudu");
  return <>{children}</>;
}
