import { neon } from "@neondatabase/serverless";

export type SKaupatProtocolConfig = {
  persistedQueryHash: string;
  clientVersion: string;
  apolloVersion: string;
  verifiedAt?: string;
};

export const SKAUPAT_PROTOCOL_FALLBACK: SKaupatProtocolConfig = {
  persistedQueryHash: "85a4eed2f0a1e3269ac49b94276ca952922568369d85ddd5dcee34481e4c0f91",
  clientVersion: "production-add4ac0e6ec7f03f2c5373a6ebfab2b63df73f68",
  apolloVersion: "4.3.1",
};

const CONFIG_KEY = "remote-filtered-products";
let memoryCache: { value: SKaupatProtocolConfig; expiresAt: number } | null = null;

const validHash = (value: unknown) =>
  typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);

const validClientVersion = (value: unknown) =>
  typeof value === "string" && /^production-[a-f0-9]{20,}$/i.test(value);

async function ensureTable(sql: ReturnType<typeof neon<false, false>>) {
  await sql`
    CREATE TABLE IF NOT EXISTS ziiply_skaupat_protocol (
      config_key TEXT PRIMARY KEY,
      persisted_query_hash TEXT NOT NULL,
      client_version TEXT NOT NULL,
      apollo_version TEXT NOT NULL,
      verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function getSKaupatProtocolConfig(): Promise<SKaupatProtocolConfig> {
  if (memoryCache && memoryCache.expiresAt > Date.now()) return memoryCache.value;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return SKAUPAT_PROTOCOL_FALLBACK;

  try {
    const sql = neon(databaseUrl);
    await ensureTable(sql);
    const rows = await sql`
      SELECT persisted_query_hash, client_version, apollo_version, verified_at
      FROM ziiply_skaupat_protocol
      WHERE config_key = ${CONFIG_KEY}
      LIMIT 1
    `;
    const row = rows[0];
    if (row && validHash(row.persisted_query_hash) && validClientVersion(row.client_version)) {
      const value: SKaupatProtocolConfig = {
        persistedQueryHash: String(row.persisted_query_hash),
        clientVersion: String(row.client_version),
        apolloVersion: String(row.apollo_version || "4.3.1"),
        verifiedAt: row.verified_at ? String(row.verified_at) : undefined,
      };
      memoryCache = { value, expiresAt: Date.now() + 5 * 60 * 1000 };
      return value;
    }
  } catch (error) {
    console.warn("[S-kaupat protocol] config read failed; using fallback", error);
  }

  return SKAUPAT_PROTOCOL_FALLBACK;
}
