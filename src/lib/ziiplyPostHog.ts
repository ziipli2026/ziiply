import { neon } from "@neondatabase/serverless";
import { hashBetaToken } from "./ziiplyBetaAuthTokens.mjs";

const KEY = "phc_yUGdeyjeZABknZazoazcsLfBhDwuZ8NBTDxXUxN2EweJ";

export async function captureZiiplyEvent(
  event: string,
  distinctId: string,
  properties: Record<string, unknown>,
) {
  const response = await fetch("https://eu.i.posthog.com/capture/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: KEY, event, distinct_id: distinctId, properties }),
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  const body = await response.text();
  return { status: response.status, accepted: response.ok && !/["']status["']\s*:\s*0/.test(body) };
}

export async function getVerifiedBetaUserId(token: string | undefined) {
  if (!token || !process.env.DATABASE_URL) return null;
  let hash: string;
  try { hash = hashBetaToken(token); } catch { return null; }
  const sql = neon(process.env.DATABASE_URL);
  const [row] = await sql`
    SELECT u.id FROM public.ziiply_beta_sessions s
    JOIN public.ziiply_beta_users u ON u.id = s.user_id
    JOIN public.ziiply_beta_applications a ON a.id = u.application_id
    WHERE s.token_hash = ${hash} AND s.revoked_at IS NULL
      AND s.expires_at > now() AND u.disabled_at IS NULL
      AND a.status IN ('invited','active') LIMIT 1`;
  return typeof row?.id === "string" ? row.id : null;
}

export function betaPostHogIdentity(userId: string) {
  return {
    distinctId: "ziiply-beta-user-" + userId,
    properties: {
      ziiply_beta_tester: true,
      $process_person_profile: true,
      $set: { ziiply_beta_tester: true },
    },
  };
}
