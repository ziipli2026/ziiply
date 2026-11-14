import { neon } from "@neondatabase/serverless";

/** Refuse to create Ziiply tables or log runs in another application's database. */
async function assertZiiplyDatabase(sql: ReturnType<typeof neon>) {
  const rows = await sql`SELECT current_database() AS database_name`;
  if (!Array.isArray(rows) || (rows[0] as { database_name?: string } | undefined)?.database_name !== "neondb") {
    throw new Error("Ziiply publication logging blocked: unexpected database");
  }
}

/** Append-only diagnostic history. Never include tokens, headers or raw product payloads. */
export async function recordPublicationRun(input: {
  chain: string; source: string; ok: boolean; count: number;
  outcome: string; details?: unknown;
}, databaseUrl = process.env.DATABASE_URL): Promise<void> {
  if (!databaseUrl) return;
  const sql = neon(databaseUrl);
  await assertZiiplyDatabase(sql);
  await sql`CREATE TABLE IF NOT EXISTS ziiply_publication_run_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    chain TEXT NOT NULL,
    source TEXT NOT NULL,
    ok BOOLEAN NOT NULL,
    offer_count INTEGER NOT NULL,
    outcome TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb
  )`;
  await sql`CREATE INDEX IF NOT EXISTS ziiply_publication_run_log_chain_checked_idx
    ON ziiply_publication_run_log (chain, checked_at DESC, id DESC)`;
  await sql`INSERT INTO ziiply_publication_run_log
    (chain, source, ok, offer_count, outcome, details)
    VALUES (${input.chain}, ${input.source}, ${input.ok},
      ${input.count}, ${input.outcome.slice(0, 200)},
      ${JSON.stringify(input.details ?? {})}::jsonb)`;
  // Operational history only: prevent an unbounded diagnostics table.
  await sql`DELETE FROM ziiply_publication_run_log
    WHERE checked_at < NOW() - INTERVAL '45 days'`;
}

export async function recentPublicationRuns(chain: string, limit = 20) {
  if (!process.env.DATABASE_URL) return [];
  const sql = neon(process.env.DATABASE_URL);
  await assertZiiplyDatabase(sql);
  await sql`CREATE TABLE IF NOT EXISTS ziiply_publication_run_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    chain TEXT NOT NULL,
    source TEXT NOT NULL,
    ok BOOLEAN NOT NULL,
    offer_count INTEGER NOT NULL,
    outcome TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb
  )`;
  await sql`CREATE INDEX IF NOT EXISTS ziiply_publication_run_log_chain_checked_idx
    ON ziiply_publication_run_log (chain, checked_at DESC, id DESC)`;
  return sql`SELECT checked_at::text AS checked_at, source, ok, offer_count, outcome, details
    FROM ziiply_publication_run_log WHERE chain = ${chain}
    ORDER BY checked_at DESC, id DESC LIMIT ${Math.max(1, Math.min(limit, 30))}`;
}
