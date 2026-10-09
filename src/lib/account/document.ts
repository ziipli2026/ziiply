import { validateGuestSnapshot } from "./guest";
import type { GuestSnapshot } from "./guest";
export const DOCUMENT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type AccountDocument = { id: string; revision: number; snapshot: GuestSnapshot; updatedAt: string };
export type DocumentWrite = { id: string; mutationId: string; expectedRevision: number; snapshot: GuestSnapshot };
export function validateDocumentWrite(value: unknown): DocumentWrite {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid document");
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some(key => !["id", "mutationId", "expectedRevision", "snapshot"].includes(key))) throw new Error("Unexpected field");
  if (typeof v.id !== "string" || !DOCUMENT_ID_PATTERN.test(v.id) || typeof v.mutationId !== "string" || !DOCUMENT_ID_PATTERN.test(v.mutationId)) throw new Error("Invalid identifier");
  if (typeof v.expectedRevision !== "number" || !Number.isSafeInteger(v.expectedRevision) || v.expectedRevision < 0 || v.expectedRevision > 1_000_000_000) throw new Error("Invalid revision");
  return { id: v.id.toLowerCase(), mutationId: v.mutationId.toLowerCase(), expectedRevision: v.expectedRevision, snapshot: validateGuestSnapshot(v.snapshot) };
}
