/**
 * Verified, dated paper-leaflet additions for Hyvinkää, week 40/2026.
 * Cross-checked against the user's photographed leaflet reference and Lidl's
 * published vegetable listing. Never turn a multi-buy total into a unit price.
 * This is a temporary week-scoped bridge, not a replacement for official feeds.
 */
import { mergeLidlStructuredAndLeaflet, type LidlLeafletEnrichment } from "./lidlProvider";
import reference from "../../../../../../data/lidl/hyvinkaa-paper-leaflet-w40-2026.fixture.json";

const independentlyVerifiedIds = new Set([
  "carrot", "apple", "potato", "chinese-cabbage", "brussels-sprouts",
  "banana", "pizza-ice-cream", "hk-burger", "solevita-orange",
  "kartanon-meatballs", "atria-chicken-strips", "arla-protein",
  "atria-mince", "chicken-nuggets",
]);

const verifiedLeafletImages: Record<string, string> = {
  "lidl-leaflet-pizza-ice-cream": "/products/lidl/week40-2026/pizza_gelatelli.webp",
  "lidl-leaflet-atria-mince": "/products/lidl/week40-2026/atria_jauheliha.webp",
  "lidl-leaflet-chicken-nuggets": "/products/lidl/week40-2026/kananuggetit.webp",
  "lidl-leaflet-carrot": "/products/lidl/week40-2026/porkkana.webp",
  "lidl-leaflet-apple": "/products/lidl/week40-2026/omena.webp",
  "lidl-leaflet-potato": "/products/lidl/week40-2026/peruna.webp",
  "lidl-leaflet-chinese-cabbage": "/products/lidl/week40-2026/kiinankaali.webp",
  "lidl-leaflet-brussels-sprouts": "/products/lidl/week40-2026/ruusukaali.webp",
  "lidl-leaflet-banana": "/products/lidl/week40-2026/banaani.webp",
};

export function addVerifiedLidlWeek40Leaflet(
  structured: Record<string, any>[],
  storeKey: string,
  storeName: string,
  today: string,
): Record<string, any>[] {
  // This leaflet was supplied for Hyvinkää; do not apply to other cities.
  if (storeKey !== "FI0218" || today < "2026-10-01" || today > "2026-10-07") return structured;
  const rows: LidlLeafletEnrichment[] = reference.records
    .filter(row => independentlyVerifiedIds.has(row.id) && typeof row.validThrough === "string")
    .map(row => ({
      id: row.id,
      name: row.name,
      price: row.printedPriceEur,
      priceBasis: (row.priceBasis === "kg" ? "per-kg" :
        row.priceBasis === "multi-buy" ? "multi-buy-total" :
        row.priceBasis === "bundle" ? "bundle" : "unit") as LidlLeafletEnrichment["priceBasis"],
      validFrom: row.validFrom,
      validUntil: row.validThrough as string,
      source: "verified-official-leaflet",
      eligibility: row.eligibility as LidlLeafletEnrichment["eligibility"],
      ...(row.requiredQuantity > 1 ? { multiBuyQuantity: row.requiredQuantity } : {}),
    }));
  // The official Lidl Plus feed wins. It uses the shorter names "Burgeri" and
  // "Tuorepuristettu appelsiinitäysmehu" for these photographed offers.
  const officialNames = structured.map(item => String(item.name || item.title || "").toLowerCase());
  const filtered = rows.filter(row =>
    !(row.id === "hk-burger" && officialNames.some(name => name.includes("burgeri"))) &&
    !(row.id === "solevita-orange" && officialNames.some(name => name.includes("appelsiinitäysmehu")))
  );
  // Reuse an official Lidl image only when the normalized product title is an exact match.
  // Never borrow a generic image from a different size, brand or product variant.
  const imageKey = (value: unknown) => String(value || "").toLocaleLowerCase("fi-FI")
    .normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const officialImages = new Map<string, string>();
  for (const offer of structured) {
    const url = String(offer.imageUrl || offer.image || offer.pictureUrl || "");
    const name = imageKey(offer.name || offer.title);
    if (name && /^https:\/\//.test(url) && !officialImages.has(name)) officialImages.set(name, url);
  }
  const merged = mergeLidlStructuredAndLeaflet(structured, filtered, today);
  // Preserve a machine-readable list of unmatched leaflet images for the offer DBG.
  // Exact leaflet IDs also have verified crops from the supplied paper leaflet.
  return merged.map(item =>
    String(item.id || "").startsWith("lidl-leaflet-")
      ? { ...item, storeKey, storeName, storeLabel: storeName, shopName: storeName,
          imageUrl: verifiedLeafletImages[String(item.id)] || item.imageUrl || officialImages.get(imageKey(item.name || item.title)) || "",
          image: verifiedLeafletImages[String(item.id)] || item.image || officialImages.get(imageKey(item.name || item.title)) || "",
          pictureUrl: verifiedLeafletImages[String(item.id)] || item.pictureUrl || officialImages.get(imageKey(item.name || item.title)) || "",
          imageMatchStatus: verifiedLeafletImages[String(item.id)] ? "verified-leaflet-crop" : (item.imageUrl || officialImages.get(imageKey(item.name || item.title))) ? "official-exact-title" : "missing-leaflet-image",
          category: item.id === "lidl-leaflet-carrot" ? "Hevi" :
            item.id === "lidl-leaflet-pizza-ice-cream" ? "Pakasteet" : item.category,
          categoryPath: item.id === "lidl-leaflet-pizza-ice-cream" ? "Pakasteet" : item.categoryPath || item.category,
          mainCategory: item.id === "lidl-leaflet-pizza-ice-cream" ? "Pakasteet" : item.mainCategory || item.category,
          benefitText: item.priceBasis === "multi-buy-total"
            ? `${item.multiBuyQuantity} kpl yhteensä ${item.priceText}`
            : item.priceBasis === "bundle"
              ? `Yhdistelmä yhteensä ${item.priceText}`
              : item.eligibility === "limited-batch" ? "Rajoitettu erä" :
                item.eligibility === "lidl-plus" ? "Lidl Plus -etu" : "Tarjouslehti",
          rawText: [item.name, item.category, item.priceText, storeName].filter(Boolean).join(" "),
        }
      : item
  );
}
