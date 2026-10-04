import { neon } from "@neondatabase/serverless";

/** Append-only diagnostic history. Never include tokens, headers or raw product payloads. */
export async function recordPublicationRun(input: {
  chain: string; source: string; ok: boolean; count: number;
  outcome: string; details?: unknown;
}): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  const sql = neon(process.env.DATABASE_URL);
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
  await sql`INSERT INTO ziiply_publication_run_log
    (chain, source, ok, offer_count, outcome, details)
    VALUES (${input.chain}, ${input.source}, ${input.ok},
      ${input.count}, ${input.outcome.slice(0, 200)},
      ${JSON.stringify(input.details ?? {})}::jsonb)`;
}

export async function recentPublicationRuns(chain: string, limit = 20) {
  if (!process.env.DATABASE_URL) return [];
  const sql = neon(process.env.DATABASE_URL);
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
  return sql`SELECT checked_at::text AS checked_at, source, ok, offer_count, outcome, details
    FROM ziiply_publication_run_log WHERE chain = ${chain}
    ORDER BY checked_at DESC, id DESC LIMIT ${Math.max(1, Math.min(limit, 30))}`;
}
