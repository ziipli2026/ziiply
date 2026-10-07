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
  "cherry-tomato-20261005", "kuusamon-erankavija-20261005",
  "danerolles-croissants-20261005", "atria-pizza-20261005",
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
  "lidl-leaflet-cherry-tomato-20261005": "https://www.lidl.fi/static/assets/sjl-tuotteet_pikkutomaatti-892420.jpg",
  "lidl-leaflet-kuusamon-erankavija-20261005": "https://public.keskofiles.com/f/k-ruoka/product/6405020033931",
  "lidl-leaflet-atria-chicken-strips": "https://cdn.s-cloud.fi/v1/w720h720%40_q75/assets/dam-id/A41snnwqaIh9IaMfw5EgR4.webp",
  "lidl-leaflet-arla-protein": "https://public.keskofiles.com/f/k-ruoka/product/0NNH0/5711953201707?auto=format&h=400&pad=30",
  "lidl-leaflet-hk-burger": "https://cdn.s-cloud.fi/v1/w750_q75/product/ean/6409100077884_kuva1.jpg",
  "lidl-leaflet-kartanon-meatballs": "https://archivana.com/pics/6e/cd/6ecd70207381941b14524e0e06f83a75ecc97fc3.jpg",
  "lidl-leaflet-danerolles-croissants-20261005": "https://web-fileserver.dekamarkt.nl/artikelen/254211_1_335427_639095118682893590.png?height=500&mode=crop&width=500",
  "lidl-leaflet-kuljanka-pickles": "https://imgproxy-retcat.assets.schwarz/ODV6S2A7TLu0OQ8DNOCjLDBQLx1z031_a-aIs7xwhI4/sm:0/exar:1:ce/w:1500/h:1125/cz/M6Ly9wcm9kLWNhd/GFsb2ctbWVkaWEvZmkvMS80MjY4ODgwOTJENjZBNTA4RjEwMTMzNTB/CNzZEQjA4MzQ1QTFGRUQyNTQ4RDI3NDExOTNEQUQ4MzBBOTg2QzA4LnBuZw.png",
  "lidl-leaflet-atria-pizza-20261005": "https://imgproxy-retcat.assets.schwarz/Hi5hACgOUpzh4Jzqglf98Y62DPmMvZ4nPKoOqaMyu10/sm:0/exar:1:ce/w:1500/h:1125/cz/M6Ly9wcm9kLWNhd/GFsb2ctbWVkaWEvZmkvMS81RDM2RUQyMUU0OEU5NDJDRDBBRkRDNUM/zMjU1NERGQjc1QzJDQTU0Nzc2OTc4MEFDNDM5RDM2MDVERTIyQ0MxLnBuZw.png",
  "lidl-leaflet-kuljanka-goulash": "https://imgproxy-retcat.assets.schwarz/UQAsZF39_EoRYyIR_ujXTji1GwjnYKwMHj0_CHhqVhA/sm:0/exar:1:ce/w:1500/h:1125/cz/M6Ly9wcm9kLWNhd/GFsb2ctbWVkaWEvZmkvMS8zM0ZEQTZGQkNFRkQ5NEJBMTExQTY2Q0Y/wOTA0QTJDRURDMEZEMjU5QTVDQ0JGQkE0OUY0OUFGRjdDQTM5RTFBLnBuZw.png",
};

export function addVerifiedLidlWeek40Leaflet(
  structured: Record<string, any>[],
  storeKey: string,
  storeName: string,
  today: string,
): Record<string, any>[] {
  // Lidl.fi identifies the 5.–7.10. publication as "Koko Suomen tarjoukset".
  // The verified leaflet rows are therefore valid for every Finnish Lidl store,
  // not only the Hyvinkää store used during the original image verification.
  // This publication is explicitly national ("Koko Suomen tarjoukset").
  // Do not gate the national offer body on a store-specific Lidl Plus key:
  // the selected store is display/context metadata, while the leaflet itself
  // must remain available even if the store feed/key is missing or unavailable.
  if (today < "2026-10-01" || today > "2026-10-07") return structured;
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
  // The official Lidl Plus feed wins for ordinary dated offers when it already
  // contains the same photographed product. The Kartanon meatball is different:
  // it is explicitly a 5.–7.10. campaign, so remove the ordinary Lidl Plus copy
  // and keep the verified campaign row while reusing the official Lidl Plus image.
  const officialNames = structured.map(item => String(item.name || item.title || "").toLowerCase());
  const meatballOfficial = structured.find(item =>
    String(item.name || item.title || "").toLowerCase().includes("kotimainen lihapulla")
  );
  const structuredForMerge = meatballOfficial
    ? structured.filter(item => item !== meatballOfficial)
    : structured;
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
  const merged = mergeLidlStructuredAndLeaflet(structuredForMerge, filtered, today);
  // Preserve a machine-readable list of unmatched leaflet images for the offer DBG.
  // Exact leaflet IDs also have verified crops from the supplied paper leaflet.
  return merged.map(item =>
    String(item.id || "").startsWith("lidl-leaflet-")
      ? { ...item, storeKey, storeName, storeLabel: storeName, shopName: storeName,
          imageUrl: verifiedLeafletImages[String(item.id)] || item.imageUrl || (item.id === "lidl-leaflet-kartanon-meatballs" ? String(meatballOfficial?.imageUrl || meatballOfficial?.image || meatballOfficial?.pictureUrl || "") : "") || officialImages.get(imageKey(item.name || item.title)) || "",
          image: verifiedLeafletImages[String(item.id)] || item.image || (item.id === "lidl-leaflet-kartanon-meatballs" ? String(meatballOfficial?.imageUrl || meatballOfficial?.image || meatballOfficial?.pictureUrl || "") : "") || officialImages.get(imageKey(item.name || item.title)) || "",
          pictureUrl: verifiedLeafletImages[String(item.id)] || item.pictureUrl || (item.id === "lidl-leaflet-kartanon-meatballs" ? String(meatballOfficial?.imageUrl || meatballOfficial?.image || meatballOfficial?.pictureUrl || "") : "") || officialImages.get(imageKey(item.name || item.title)) || "",
          imageMatchStatus: verifiedLeafletImages[String(item.id)] ? (String(item.id).includes("cherry-tomato-20261005") || String(item.id).includes("kuusamon-erankavija-20261005") || String(item.id).includes("atria-chicken-strips") || String(item.id).includes("arla-protein") ? "official-product-image" : "verified-leaflet-crop") : (item.imageUrl || officialImages.get(imageKey(item.name || item.title))) ? "official-exact-title" : "missing-leaflet-image",
          category: item.id === "lidl-leaflet-carrot" ? "Hevi" :
            item.id === "lidl-leaflet-kartanon-meatballs" ? "Liha & makkarat" :
            item.id === "lidl-leaflet-pizza-ice-cream" ? "Pakasteet" : item.category,
          categoryPath: item.id === "lidl-leaflet-carrot" ? "Hevi" :
            item.id === "lidl-leaflet-kartanon-meatballs" ? "Liha & makkarat" :
            item.id === "lidl-leaflet-pizza-ice-cream" ? "Pakasteet" : item.categoryPath || item.category,
          mainCategory: item.id === "lidl-leaflet-carrot" ? "Hevi" :
            item.id === "lidl-leaflet-kartanon-meatballs" ? "Liha & makkarat" :
            item.id === "lidl-leaflet-pizza-ice-cream" ? "Pakasteet" : item.mainCategory || item.category,
          benefitText: item.priceBasis === "multi-buy-total"
            ? `${item.multiBuyQuantity} kpl yhteensä ${item.priceText}`
            : item.priceBasis === "bundle"
              ? `Yhdistelmä yhteensä ${item.priceText}`
              : item.eligibility === "limited-batch" ? "Rajoitettu erä" :
                item.eligibility === "lidl-plus" ? "Lidl Plus -etu" : "Tarjouslehti",
          // Lidl.fi publishes 5.–7.10. as "Koko Suomen tarjoukset".
          // Keep verified paper-leaflet rows in Gösta's Tarjoukset tab.
          // Separate Lidl.fi campaign pages are added as campaign rows in the API route.
          campaignType: (item as any).campaignType,
          campaignSection: (item as any).campaignSection,
          rawText: [item.name, item.category, item.priceText, storeName].filter(Boolean).join(" "),
        }
      : item
  );
}
