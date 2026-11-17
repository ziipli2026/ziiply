/** Conservative catalog identity matching for offer records without EANs.
 * A candidate must have a unique normalized full name and, when provided,
 * matching brand and package quantity. No substring, token or fuzzy matching.
 * A category-only match is not evidence of product identity.
 */
export type CatalogIdentity = {
  ean: string;
  name: string;
  brand?: string | null;
  quantity?: string | null;
  category?: string | null;
};
export type OfferIdentity = {
  title?: string | null;
  name?: string | null;
  brand?: string | null;
  quantity?: string | null;
  packageSize?: string | null;
};

const normalize = (value: string | null | undefined) =>
  String(value ?? "").normalize("NFKC").toLocaleLowerCase("fi")
    .replace(/[^\\p{L}\\p{N}]+/gu, " ").replace(/\\s+/g, " ").trim();

export function resolveUniqueCatalogIdentity(
  offer: OfferIdentity,
  candidates: readonly CatalogIdentity[],
): CatalogIdentity | null {
  const name = normalize(offer.title || offer.name);
  if (name.length < 6) return null;
  const brand = normalize(offer.brand);
  const quantity = normalize(offer.quantity || offer.packageSize);
  const matches = candidates.filter(candidate => {
    if (!/^\\d{8,14}$/.test(candidate.ean) || normalize(candidate.name) !== name) return false;
    if (brand && normalize(candidate.brand) !== brand) return false;
    if (quantity && normalize(candidate.quantity) !== quantity) return false;
    return true;
  });
  // Multiple catalog identities with the same title are not interchangeable.
  // Even if their category happens to agree, never manufacture an EAN match.
  return matches.length === 1 ? matches[0] : null;
}
