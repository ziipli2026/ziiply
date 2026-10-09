import { createNeonAuth } from "@neondatabase/auth/next/server";
import { accountLabEnabled } from "./config";

let instance: ReturnType<typeof createNeonAuth> | undefined;
export function getAccountAuth() {
  if (!accountLabEnabled()) throw new Error("Account lab disabled");
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !secret || secret.length < 32) throw new Error("Development Auth configuration missing");
  return instance ??= createNeonAuth({ baseUrl, cookies: { secret } });
}
