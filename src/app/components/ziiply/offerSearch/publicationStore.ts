import { neon } from "@neondatabase/serverless";
import {
  publicationState, type StagedPublication,
} from "./publicationLifecycle";

/** Persistent staged leaflet editions; no request may publish an upcoming edition. */
async function database() {
  if (!process.env.DATABASE_URL) throw new Error("Leaflet staging requires DATABASE_URL");
  const sql = neon(process.env.DATABASE_URL);
  await sql`CREATE TABLE IF NOT EXISTS ziiply_offer_publications (
    chain TEXT NOT NULL,
    publication_id TEXT NOT NULL,
    valid_from DATE NOT NULL,
    valid_until DATE NOT NULL,
    parsed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    offers JSONB NOT NULL,
    approval_state TEXT NOT NULL DEFAULT 'approved',
    PRIMARY KEY (chain, publication_id),
    CONSTRAINT ziiply_publication_dates CHECK (valid_from <= valid_until)
  )`;
  await sql`ALTER TABLE ziiply_offer_publications ADD COLUMN IF NOT EXISTS approval_state TEXT NOT NULL DEFAULT 'approved'`;
  await sql`CREATE INDEX IF NOT EXISTS ziiply_offer_publications_chain_period_idx
    ON ziiply_offer_publications (chain, valid_from, valid_until, parsed_at DESC)`;
  return sql;
}

export async function storeParsedPublication<T>(candidate: StagedPublication<T>, options: { approvalState?: "candidate" | "approved" } = {}): Promise<"stored" | "unchanged"> {
  if (!candidate.chain || !candidate.id || !Array.isArray(candidate.offers) ||
      candidate.offers.length === 0 ||
      publicationState(candidate, candidate.validFrom) === "invalid") {
    throw new Error("Invalid or empty publication: existing data preserved");
  }
  const sql = await database();
  const approvalState = options.approvalState || "approved";
  const result = await sql`INSERT INTO ziiply_offer_publications
    (chain, publication_id, valid_from, valid_until, parsed_at, offers, approval_state)
    VALUES (${candidate.chain}, ${candidate.id}, ${candidate.validFrom}::date,
      ${candidate.validUntil}::date, ${candidate.parsedAt}::timestamptz,
      ${JSON.stringify(candidate.offers)}::jsonb, ${approvalState})
    ON CONFLICT (chain, publication_id) DO NOTHING
    RETURNING publication_id`;
  return result.length ? "stored" : "unchanged";
}

export async function readActivePublicationOffers<T>(chain: string, at: Date = new Date()): Promise<T[]> {
  if (!chain) return [];
  const sql = await database();
  const date = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(at);
  // Multiple corrected snapshots can share a validity period. Use only the latest
  // snapshot per period, never concatenate obsolete and corrected offers.
  const rows = await sql`SELECT DISTINCT ON (valid_from, valid_until) offers
    FROM ziiply_offer_publications
    WHERE chain = ${chain} AND approval_state = 'approved' AND valid_from <= ${date}::date
      AND valid_until >= ${date}::date
    ORDER BY valid_from, valid_until, parsed_at DESC, publication_id DESC`;
  return rows.flatMap((row) => Array.isArray(row.offers) ? row.offers as T[] : []);
}

export async function readPublicationCandidate<T>(chain: string, publicationId: string) {
  if (!chain || !publicationId) return null;
  const sql = await database();
  const rows = await sql`SELECT publication_id, valid_from::text AS valid_from,
    valid_until::text AS valid_until, parsed_at::text AS parsed_at, approval_state, offers
    FROM ziiply_offer_publications
    WHERE chain = ${chain} AND publication_id = ${publicationId} AND approval_state = 'candidate'
    LIMIT 1`;
  if (!rows.length) return null;
  const row = rows[0];
  return {
    publicationId: String(row.publication_id),
    validFrom: String(row.valid_from).slice(0, 10),
    validUntil: String(row.valid_until).slice(0, 10),
    parsedAt: String(row.parsed_at),
    offers: (Array.isArray(row.offers) ? row.offers : []) as T[],
  };
}

export async function approvePublication(chain: string, publicationId: string): Promise<boolean> {
  if (!chain || !publicationId) return false;
  const sql = await database();
  const rows = await sql`UPDATE ziiply_offer_publications SET approval_state = 'approved'
    WHERE chain = ${chain} AND publication_id = ${publicationId} AND approval_state = 'candidate'
    RETURNING publication_id`;
  return rows.length > 0;
}

export async function publicationDiagnosticSnapshots(chain: string, limit = 12) {
  const sql = await database();
  const rows = await sql`SELECT publication_id, valid_from::text AS valid_from,
    valid_until::text AS valid_until, parsed_at::text AS parsed_at, approval_state, offers
    FROM ziiply_offer_publications WHERE chain = ${chain}
    ORDER BY parsed_at DESC LIMIT ${Math.max(1, Math.min(limit, 30))}`;
  return rows;
}
