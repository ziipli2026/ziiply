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

const DATE = /^(\\d{4})-(\\d{2})-(\\d{2})$/;
function isCalendarDate(value: string): boolean {
  const match = DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}

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
  if (![date, validFrom, validUntil].every(isCalendarDate) || validFrom > validUntil) return "invalid";
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

/**
 * Build an immutable staging snapshot. A failed discovery must not replace the
 * last working edition; unchanged edition IDs are not re-parsed.
 */
export type StagedPublication<T> = OfferPublication & { offers: readonly T[] };
export function stagePublication<T>(
  existing: readonly StagedPublication<T>[],
  candidate: StagedPublication<T> | null | undefined,
): StagedPublication<T>[] {
  if (!candidate || !candidate.chain || !candidate.id ||
      publicationState(candidate, candidate.validFrom) === "invalid" ||
      !Array.isArray(candidate.offers) || candidate.offers.length === 0 ||
      !isNewPublication(existing, candidate.chain, candidate.id)) return [...existing];
  return [...existing, candidate];
}

/** Choose a stored edition only when its actual validity includes the Finnish date. */
export function visibleStagedOffers<T>(
  staged: readonly StagedPublication<T>[],
  chain: string,
  at: Date = new Date(),
): T[] {
  const current = activePublications(staged.filter((entry) => entry.chain === chain), at);
  return current.flatMap((entry) => [...entry.offers]);
}
