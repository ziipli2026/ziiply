export function isolatedAccountDatabase(env: Record<string, string | undefined>): string {
  const url = env.ZIIPLY_ACCOUNT_DATABASE_URL;
  const expectedHost = env.ZIIPLY_ACCOUNT_DATABASE_HOST;
  if (!url || !expectedHost) throw new Error("Isolated account database required");
  const target = new URL(url);
  const host = (value: string) => value.toLowerCase().replace("-pooler.", ".");
  if (!/^postgres(?:ql)?:$/.test(target.protocol) || host(target.hostname) !== host(expectedHost)) throw new Error("Account database target mismatch");
  if (env.DATABASE_URL && host(new URL(env.DATABASE_URL).hostname) === host(target.hostname)) throw new Error("Product endpoint forbidden");
  return url;
}
