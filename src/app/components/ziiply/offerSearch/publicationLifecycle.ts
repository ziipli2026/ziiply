/**
 * Shared publication lifecycle for pre-fetched grocery leaflets.
 * Discovery and parsing may happen before the publication becomes visible.
 * This module has no network calls or recurring polling.
 */
export type OfferPublication = {
  id: string;
  chain: string;
  validFrom: string; // Finnish local YYYY-MM-DD
  validUntil: string; // Finnish local YYYY-MM-DD, inclusive
  parsedAt: string;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function finnishPublicationDate(at: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

export function publicationState(
  publication: Pick<OfferPublication, "validFrom" | "validUntil">,
  date: string = finnishPublicationDate(),
): "upcoming" | "current" | "expired" | "invalid" {
  const { validFrom, validUntil } = publication;
  if (![date, validFrom, validUntil].every((value) => DATE.test(value)) || validFrom > validUntil) return "invalid";
  if (date < validFrom) return "upcoming";
  if (date > validUntil) return "expired";
  return "current";
}

/** Never select merely the newest parsed leaflet: select the valid one. */
export function activePublications<T extends OfferPublication>(publications: readonly T[], at: Date = new Date()): T[] {
  const date = finnishPublicationDate(at);
  return publications.filter((publication) => publicationState(publication, date) === "current");
}

/** Avoid re-parsing the same edition; publication ID must be stable per source. */
export function isNewPublication(publications: readonly Pick<OfferPublication, "chain" | "id">[], chain: string, id: string): boolean {
  return Boolean(chain && id) && !publications.some((publication) => publication.chain === chain && publication.id === id);
}
