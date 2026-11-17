/** A catalog candidate is NOT proof of EAN identity.
 * This diagnostic rejects conflicting pack sizes and variants, and reports
 * category agreement separately from identity. Never writes product records.
 */
export type CandidateOffer = { title: string; brand?: string | null; quantity?: string | null };
export type CandidateProduct = { ean: string; name: string; brand?: string | null; quantity?: string | null; category?: string | null };
const norm = (v: string | null | undefined) => String(v ?? "").normalize("NFKC").toLocaleLowerCase("fi")
  .replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
const sizes = (v: string) => [...v.matchAll(/(?:^|\s)(\d+(?:[.,]\d+)?)\s*(kg|g|ml|l|kpl)(?=\s|$)/g)]
  .map(m => {
    const n = Number(m[1].replace(",", "."));
    const factor = m[2] === "kg" || m[2] === "l" ? 1000 : 1;
    const unit = m[2] === "kg" || m[2] === "g" ? "g" : m[2] === "kpl" ? "kpl" : "ml";
    return String(n * factor) + unit;
  });
export function assessCatalogCandidate(offer: CandidateOffer, product: CandidateProduct) {
  const title = norm(offer.title), name = norm(product.name);
  if (title.length < 10 || !name.includes(title)) return {eligible:false, reason:"name-not-contained"};
  // Require full word boundaries, not partial words.
  const start = name.indexOf(title);
  if ((start > 0 && name[start - 1] !== " ") || (start + title.length < name.length && name[start + title.length] !== " "))
    return {eligible:false, reason:"word-boundary"};
  const brand = norm(offer.brand);
  if (brand && norm(product.brand) !== brand) return {eligible:false, reason:"brand-conflict"};
  const offerSizes = [...sizes(title), ...sizes(norm(offer.quantity))];
  const productSizes = [...sizes(name), ...sizes(norm(product.quantity))];
  if (offerSizes.length && !offerSizes.every(size => productSizes.includes(size)))
    return {eligible:false, reason:"pack-conflict"};
  // An extra pack size is a missing attribute, NOT a verified SKU match.
  if (!offerSizes.length && productSizes.length) return {eligible:false, reason:"pack-unverified"};
  return {eligible:true, reason:"candidate-only"};
}
