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

type NeonSql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;

const validHash = (value: unknown) =>
  typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);

const validClientVersion = (value: unknown) =>
  typeof value === "string" && /^production-[a-f0-9]{20,}$/i.test(value);

async function ensureTable(sql: NeonSql) {
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
    const row = rows[0] as Record<string, unknown> | undefined;
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

async function fetchProtocolText(url: string): Promise<string> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      accept: "text/html,application/javascript,*/*",
      "accept-language": "fi",
      "user-agent": "Mozilla/5.0 (compatible; Ziiply/1.0; +https://ziiply.fi)",
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return response.text();
}

function extractScriptUrls(html: string): string[] {
  const urls: string[] = [];
  const pattern = /<script[^>]+src=["']([^"']+\.js(?:\?[^"']*)?)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    try {
      urls.push(new URL(match[1], "https://www.s-kaupat.fi").toString());
    } catch {
      // Ignore malformed script URLs.
    }
  }
  return Array.from(new Set(urls));
}

function extractProtocolCandidates(js: string): Array<{ hash: string; clientVersion: string }> {
  const clients = Array.from(js.matchAll(/production-[a-f0-9]{20,}/gi), (match) => match[0]);
  if (clients.length === 0) return [];

  const candidates: Array<{ hash: string; clientVersion: string }> = [];
  for (const operation of js.matchAll(/RemoteFilteredProducts/g)) {
    const index = operation.index ?? 0;
    const nearby = js.slice(Math.max(0, index - 16000), Math.min(js.length, index + 16000));
    const hashes = Array.from(nearby.matchAll(/[a-f0-9]{64}/gi), (match) => match[0]);
    for (const hash of hashes) {
      for (const clientVersion of clients.slice(0, 8)) candidates.push({ hash, clientVersion });
    }
  }
  return candidates;
}

function buildProtocolProbeUrl(config: SKaupatProtocolConfig): string {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const variables = {
    availabilityDate: date,
    facets: [{ key: "brandName", order: "asc" }, { key: "category" }, { key: "labels" }],
    generatedSessionId: "ziiply-protocol-probe",
    fetchSponsoredContent: false,
    limit: 1,
    queryString: "maito",
    sortForAvailabilityLabelDate: date,
    storeId: "603217266",
    useRandomId: false,
    marketingId: "ziiply-protocol-probe",
  };
  const extensions = {
    clientLibrary: { name: "@apollo/client", version: config.apolloVersion },
    persistedQuery: { version: 1, sha256Hash: config.persistedQueryHash },
  };
  const url = new URL("https://api.s-kaupat.fi/");
  url.searchParams.set("operationName", "RemoteFilteredProducts");
  url.searchParams.set("variables", JSON.stringify(variables));
  url.searchParams.set("extensions", JSON.stringify(extensions));
  return url.toString();
}

async function verifyProtocolConfig(config: SKaupatProtocolConfig): Promise<boolean> {
  try {
    const response = await fetch(buildProtocolProbeUrl(config), {
      cache: "no-store",
      headers: {
        accept: "application/graphql-response+json,application/json;q=0.9",
        "content-type": "application/json",
        "accept-language": "fi",
        origin: "https://www.s-kaupat.fi",
        referer: "https://www.s-kaupat.fi/",
        "x-client-name": "skaupat-web",
        "x-client-version": config.clientVersion,
      },
    });
    if (!response.ok) return false;
    const payload = await response.json().catch(() => null);
    return !!payload?.data?.store?.products && Array.isArray(payload.data.store.products.productListItems);
  } catch {
    return false;
  }
}

async function persistProtocolConfig(config: SKaupatProtocolConfig): Promise<boolean> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return false;
  const sql = neon(databaseUrl);
  await ensureTable(sql);
  await sql`
    INSERT INTO ziiply_skaupat_protocol (
      config_key, persisted_query_hash, client_version, apollo_version, verified_at, updated_at
    )
    VALUES (
      ${CONFIG_KEY}, ${config.persistedQueryHash}, ${config.clientVersion}, ${config.apolloVersion}, NOW(), NOW()
    )
    ON CONFLICT(config_key) DO UPDATE SET
      persisted_query_hash = EXCLUDED.persisted_query_hash,
      client_version = EXCLUDED.client_version,
      apollo_version = EXCLUDED.apollo_version,
      verified_at = NOW(),
      updated_at = NOW()
  `;
  const value = { ...config, verifiedAt: new Date().toISOString() };
  memoryCache = { value, expiresAt: Date.now() + 5 * 60 * 1000 };
  return true;
}

export async function refreshSKaupatProtocolConfig() {
  const current = await getSKaupatProtocolConfig();
  if (await verifyProtocolConfig(current)) {
    const persisted = await persistProtocolConfig(current).catch(() => false);
    return { ok: true, changed: false, persisted, candidate: current, source: "current" };
  }

  const html = await fetchProtocolText("https://www.s-kaupat.fi/");
  const scriptUrls = extractScriptUrls(html);
  const seen = new Set<string>();
  let candidatesFound = 0;

  for (const scriptUrl of scriptUrls) {
    let js: string;
    try {
      js = await fetchProtocolText(scriptUrl);
    } catch {
      continue;
    }

    for (const candidate of extractProtocolCandidates(js)) {
      const id = `${candidate.hash}|${candidate.clientVersion}`;
      if (seen.has(id) || !validHash(candidate.hash) || !validClientVersion(candidate.clientVersion)) continue;
      seen.add(id);
      candidatesFound += 1;

      const config: SKaupatProtocolConfig = {
        persistedQueryHash: candidate.hash,
        clientVersion: candidate.clientVersion,
        apolloVersion: "4.3.1",
      };
      if (!(await verifyProtocolConfig(config))) continue;

      const persisted = await persistProtocolConfig(config).catch(() => false);
      return {
        ok: true,
        changed:
          config.persistedQueryHash !== current.persistedQueryHash ||
          config.clientVersion !== current.clientVersion,
        persisted,
        candidate: config,
        source: "discovered",
        scriptsChecked: scriptUrls.length,
        candidatesFound,
      };
    }
  }

  return {
    ok: false,
    changed: false,
    persisted: false,
    source: "discovery",
    scriptsChecked: scriptUrls.length,
    candidatesFound,
    error: "No discovered S-kaupat protocol candidate passed verification",
  };
}

