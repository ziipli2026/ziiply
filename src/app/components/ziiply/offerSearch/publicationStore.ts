import { neon } from "@neondatabase/serverless";
import {
  activePublications, isNewPublication, publicationState,
  type OfferPublication, type StagedPublication,
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
    PRIMARY KEY (chain, publication_id),
    CONSTRAINT ziiply_publication_dates CHECK (valid_from <= valid_until)
  )`;
  return sql;
}

export async function storeParsedPublication<T>(candidate: StagedPublication<T>): Promise<"stored" | "unchanged"> {
  if (!candidate.chain || !candidate.id || !Array.isArray(candidate.offers) ||
      candidate.offers.length === 0 ||
      publicationState(candidate, candidate.validFrom) === "invalid") {
    throw new Error("Invalid or empty publication: existing data preserved");
  }
  const sql = await database();
  const result = await sql`INSERT INTO ziiply_offer_publications
    (chain, publication_id, valid_from, valid_until, parsed_at, offers)
    VALUES (${candidate.chain}, ${candidate.id}, ${candidate.validFrom}::date,
      ${candidate.validUntil}::date, ${candidate.parsedAt}::timestamptz,
      ${JSON.stringify(candidate.offers)}::jsonb)
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
  const rows = await sql`SELECT offers FROM ziiply_offer_publications
    WHERE chain = ${chain} AND valid_from <= ${date}::date
      AND valid_until >= ${date}::date
    ORDER BY valid_from DESC, parsed_at DESC`;
  return rows.flatMap((row) => Array.isArray(row.offers) ? row.offers as T[] : []);
}
