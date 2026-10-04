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
  return mergeLidlStructuredAndLeaflet(structured, filtered, today).map(item =>
    String(item.id || "").startsWith("lidl-leaflet-")
      ? { ...item, storeKey, storeName, storeLabel: storeName, shopName: storeName,
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
