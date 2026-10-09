// Disabled by default, and unconditionally disabled in production deployments.
export function accountLabEnabled() {
  return process.env.ZIIPLY_ACCOUNT_LAB === "true" && process.env.VERCEL_ENV !== "production";
}
