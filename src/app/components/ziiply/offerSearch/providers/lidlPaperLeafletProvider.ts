/** Selected photographed Lidl week-40 leaflet pages, as a dated fallback only.
 * Official Lidl Plus offers take precedence. This is NOT a full Lidl catalog.
 * No unconfirmed end dates, EANs, images or checkout prices are inferred.
 */
import fixture from "../../../../../../data/lidl/hyvinkaa-paper-leaflet-w40-2026.fixture.json";
type OfficialOffer = Record<string, any>;
const normalize = (s: unknown) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const officialAliases: Record<string,string[]> = {
  "hk-burger": ["burgeri"],
  "solevita-orange": ["tuorepuristettu appelsiinitaysmehu", "appelsiinitaysmehu"],
};
function category(name: string) {
  const s = normalize(name);
  if (/porkkana|omena|peruna|kiinankaali|ruusukaali|banaani/.test(s)) return "Hevi";
  if (/jogurtti/.test(s)) return "Maitotuotteet";
  if (/pizza|jaatelo/.test(s)) return "Pakasteet";
  if (/mehu/.test(s)) return "Juomat";
  if (/lihapulla|fileesuikale|jauheliha|nugget|burger/.test(s)) return "Liha & makkarat";
  return "Kuivatuotteet";
}
export function enrichLidlOffersWithPhotographedLeaflet(official: OfficialOffer[], today: string, storeKey: string, storeName: string): OfficialOffer[] {
  const output = [...official];
  const officialNames = official.map(x => normalize([x.brandName, x.name || x.title].filter(Boolean).join(" ")));
  const known = new Set(official.map(x => normalize(x.name || x.title)));
  for (const row of fixture.records) {
    // Null end dates are intentionally not interpreted as indefinite validity.
    if (!row.validThrough || today < row.validFrom || today > row.validThrough) continue;
    const aliases = [normalize(row.name), ...(officialAliases[row.id] || [])];
    if (aliases.some(alias => officialNames.some(name => name === alias || (alias.length >= 8 && name.includes(alias))))) continue;
    const key = normalize(row.name);
    if (known.has(key)) continue;
    known.add(key);
    const multi = row.priceBasis === "multi-buy" || row.priceBasis === "bundle";
    const weighted = row.priceBasis === "kg";
    const printed = row.printedPriceEur.toFixed(2).replace(".", ",") + " €";
    const terms = multi ? row.priceBasis === "bundle"
      ? `Yhdistelmäetu: ${row.requiredQuantity} tuotetta yhteensä ${printed}`
      : `${row.requiredQuantity} kpl yhteensä ${printed}`
      : weighted ? `${printed}/kg` : printed;
    const c = category(row.name);
    output.push({
      id: `lidl-paper-w40-${row.id}`, source: "lidl-paper-leaflet-photo",
      chain: "Lidl", storeKey, storeName, storeLabel: storeName, shopName: storeName,
      title: row.name, name: row.name, productName: row.name, brandName: "",
      // A photographed printed offer is not a verified checkout unit price.
      price: multi ? null : row.printedPriceEur,
      offerPrice: multi ? null : row.printedPriceEur,
      priceText: terms, benefitText: terms, discountText: terms,
      priceBasis: weighted ? "per-kg" : multi ? row.priceBasis === "bundle" ? "bundle" : "multi-buy-total" : "unit",
      isWeightedProduct: weighted, hasConcretePrice: !multi,
      ...(multi ? {multiBuyTotalPrice: row.printedPriceEur, multiBuyQuantity: row.requiredQuantity} : {}),
      validFrom: row.validFrom, validUntil: row.validThrough,
      validityText: `Voimassa ${row.validFrom}–${row.validThrough}`,
      eligibility: row.eligibility, requiresLidlPlus: row.eligibility === "lidl-plus",
      category: c, categoryPath: c, mainCategory: c,
      imageUrl: "", image: "", pictureUrl: "", ean: "",
      rawText: [row.name, terms, row.eligibility, c].join(" "),
      printedLeafletPrice: row.printedPriceEur, checkoutPriceVerified: false,
    });
  }
  return output;
}
