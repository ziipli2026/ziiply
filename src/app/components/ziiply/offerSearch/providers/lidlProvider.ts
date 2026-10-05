import { observeEanProductsBestEffort } from "@/lib/eanBank";
import { finnishPublicationDate, publicationState } from "../publicationLifecycle";

type LidlRaw = Record<string, any>;

const LIDL_OFFERS_BASE = "https://offers.lidlplus.com/app/api/v4/FI";
const LIDL_HEADERS = {
  accept: "application/json",
  "accept-language": "fi-FI,fi;q=0.9",
  "user-agent": "LidlPlus/17.0.5 Android okhttp/4.12.0",
  "x-client-version": "17.0.5",
  "x-client-platform": "android",
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9åäö\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyLidlOffer(name: string, brand = "") {
  const s = normalizeText(`${name} ${brand}`);
  // Non-food first: prevent lihashuoltovasara and öljypumppu matching grocery substrings.
  if (/vaatte|asuste|esmara|tyokalu|tyokal|akkukayttoinen|imuri|puhallin|pumppu|ruuvinvaannin|raikka|vasara|urheiluhame|pesuri|magneettiastia|auton puhdistusliina/.test(s)) return "Koti & vapaa-aika";
  if (/talouspaperi|wc[ -]?paperi|paperipyyhe|huuhteluaine|pesuaine|pyykin|astianpesu|puhdistuskivi|puhdistusaine/.test(s)) return "Kodinhoito";
  if (/varsiselleri|selleri|punajuuri/.test(s)) return "Hevi";
  if (/korvapuusti|ruispala|blini|kreikkalainen juustotanko/.test(s)) return "Leipomo";
  if (/pahkina/.test(s)) return "Kuivatuotteet";
  if (/kahvi|espresso|cappuccino|tee\b/.test(s)) return "Kahvi & tee";
  if (/maito|jogur|jugur|rahka|juusto|kerma|voi\b|piima|viili/.test(s)) return "Maitotuotteet";
  if (/burger|kana|broiler|nauta|sika|pors|jauheliha|makkara|nakki|pekoni|kinkku|lihapulla|\bliha\b|pulled pork/.test(s)) return "Liha & makkarat";
  if (/kala|lohi|silakka|tonnikala|kirjolohi|seiti|katkarapu/.test(s)) return "Kala";
  if (/leipa|sampyl|pull|croissant|paton|karjalanpiirakka|ruisleip|rieska/.test(s)) return "Leipomo";
  if (/limu|juoma|mehu|vesi|vichy|energiajuoma|cola/.test(s)) return "Juomat";
  if (/sitruuna|retiisi|granaattiomena|omena|banaani|tomaatti|kurkku|salaatti|paprika|peruna|sipuli|porkkana|bataatti|mandariini|appelsiini|mango|marja|hedelm|vihann|kasvis|kaali/.test(s)) return "Hevi";
  if (/pakaste|jaatel|pakastettu/.test(s)) return "Pakasteet";
  if (/pikanuudeli|nuudelikeitto/.test(s)) return "Kuivatuotteet";
  if (/valmis|ateria|pizza|keitto|salaattiateria|mikroateria|laatikko|lasagne|wokki|risotto/.test(s)) return "Valmisruoka";
  if (/pasta|riisi|jauho|hiutale|muro|mysli|sailyke|kastike|\boljy\b|mauste|sokeri|suola|puuro|nuudeli|makaroni|spagetti|sushi-inkivaari|nori|merileva|wasabi|seesaminsiemen/.test(s)) return "Kuivatuotteet";
  if (/kark|makeis|suklaa|keksi|lakrit|salmiak|purukumi|patukka|sips|chips/.test(s)) return "Makeiset & keksit";
  if (/lastenruo|vauva|aidinmaidonkorvike/.test(s)) return "Lastenruoat";
  if (/vitami|ravinne|magnesium|sinkki/.test(s)) return "Vitamiinit & ravinteet";
  if (/koira|kissa|lemmik/.test(s)) return "Lemmikit";
  if (/hammastahna|hammasharja|shampoo|saippua|deodorant|kosmeti|ihonhoito/.test(s)) return "Hygienia & kosmetiikka";
  if (/pesuaine|pyykin|astianpesu|puhdistus/.test(s)) return "Kodinhoito";
  if (/vaate|asuste|esmara|tyokalu|kodin|vapaa-aika|ilmanpuhdistin|rakennussarja|turvalaita|nukanpoistaja|pyykkikori|pyykkipoika/.test(s)) return "Koti & vapaa-aika";
  return "Muut";
}

function formatPrice(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${value.toFixed(2).replace(".", ",")} €`
    : "";
}

function validityText(from: unknown, until: unknown) {
  const a = String(from || "").slice(0, 10);
  const b = String(until || "").slice(0, 10);
  if (a && b) return `Voimassa ${a}–${b}`;
  if (b) return `Voimassa ${b} asti`;
  return "";
}

// Store-scoped structured JSON snapshot. Never wait for leaflet parsing in the
// foreground request. In-flight calls are shared across concurrent warmup/search.
// The structured feed is authoritative. Optional verified leaflet enrichment is
// supplied separately; it must never overwrite an official offer or block it.
export type LidlLeafletEnrichment = {
  id: string;
  name: string;
  price: number;
  priceBasis: "unit" | "per-kg" | "multi-buy-total" | "bundle";
  validFrom: string;
  validUntil: string;
  source: "verified-official-leaflet";
  eligibility: "open" | "lidl-plus" | "limited-batch" | "combination";
  multiBuyQuantity?: number;
};

export function mergeLidlStructuredAndLeaflet(
  structured: Record<string, any>[],
  leaflet: LidlLeafletEnrichment[],
  today: string,
): Record<string, any>[] {
  const output = [...structured];
  const normalized = (name: string) => normalizeText(name).replace(/\b\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l)\b/g, "").replace(/\s+/g, " ").trim();
  const existing = new Set(structured.map((item) => normalized(String(item.name || item.title || ""))));
  for (const row of leaflet) {
    if (row.source !== "verified-official-leaflet" || !row.id || !row.name ||
        !Number.isFinite(row.price) || row.price <= 0 ||
        !/^\d{4}-\d{2}-\d{2}$/.test(row.validFrom) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(row.validUntil) ||
        today < row.validFrom || today > row.validUntil) continue;
    if ((row.priceBasis === "multi-buy-total" || row.priceBasis === "bundle") &&
        (!Number.isInteger(row.multiBuyQuantity) || (row.multiBuyQuantity || 0) < 2)) continue;
    const nameKey = normalized(row.name);
    if (!nameKey || existing.has(nameKey)) continue;
    existing.add(nameKey);
    output.push({
      id: `lidl-leaflet-${row.id}`,
      source: row.source,
      chain: "Lidl",
      title: row.name,
      name: row.name,
      price: row.price,
      offerPrice: row.price,
      priceText: formatPrice(row.price),
      priceBasis: row.priceBasis,
      isWeightedProduct: row.priceBasis === "per-kg",
      hasConcretePrice: true,
      validFrom: row.validFrom,
      validUntil: row.validUntil,
      validityText: validityText(row.validFrom, row.validUntil),
      eligibility: row.eligibility,
      requiresLidlPlus: row.eligibility === "lidl-plus",
      ...(row.multiBuyQuantity ? { multiBuyQuantity: row.multiBuyQuantity, multiBuyTotalPrice: row.price } : {}),
      category: classifyLidlOffer(row.name),
      rawText: row.name,
      // No inferred barcode, stock or checkout verification.
      ean: "",
    });
  }
  return output;
}

const LIDL_STRUCTURED_TTL_MS = 5 * 60 * 1000;
const lidlStructuredCache = new Map<string, { expiresAt: number; promise: Promise<any[]> }>();

async function fetchLidlStructuredUncached(storeKey: string, storeName: string) {
  const key = String(storeKey || "").trim();
  if (!key) return [];

  const response = await fetch(`${LIDL_OFFERS_BASE}/${encodeURIComponent(key)}/offers`, {
    headers: LIDL_HEADERS,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Lidl offers failed: ${response.status}`);

  const raw = JSON.parse(new TextDecoder("utf-8").decode(await response.arrayBuffer()));
  const rows: LidlRaw[] = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.offers)
      ? raw.offers
      : Array.isArray(raw?.items)
        ? raw.items
        : [];

  const offers = rows.map((row, index) => {
    const box = row?.priceBox || {};
    const directNumericPrice = typeof box.largePartNumeric === "number" ? box.largePartNumeric : null;
    const totalMatch =
      directNumericPrice == null && String(box?.discountMessage || "").trim().toLowerCase() === "yhteensä"
        ? String(box?.largePartString || "").match(/(\d+(?:[.,]\d+)?)\s*€\s*\/\s*(\d+)\s*kpl/i)
        : null;
    const totalPrice = totalMatch ? Number(totalMatch[1].replace(",", ".")) : null;
    const totalQuantity = totalMatch ? Number(totalMatch[2]) : null;
    const numericPrice = totalPrice ?? directNumericPrice;
    const normalPrice = typeof box.smallPartNumeric === "number" ? box.smallPartNumeric : null;
    const title = String(row?.title || "Lidl tarjous").trim();
    const brandName = String(row?.brand || "").trim();
    const discountText = String(box?.discountMessage || box?.largePartString || "").trim();
    const category = classifyLidlOffer(title, brandName);
    const priceText = formatPrice(numericPrice);
    const unitPriceText = String(row?.pricePerUnit || "").trim();
    const lidlPricingText = [
      row?.pricePerUnit,
      row?.unit,
      row?.unitText,
      row?.basePrice,
      row?.basePriceText,
      row?.quantityText,
      row?.subtitle,
      row?.description,
      box?.largePartString,
      box?.smallPartString,
      box?.priceSymbol,
      box?.discountMessage,
    ]
      .filter((value) => value != null)
      .map((value) => String(value))
      .join(" ");
    const hasPackWeightInTitle = /\b\d+(?:[.,]\d+)?\s*(?:g|kg)\b/i.test(title);
    const isWeightedProduct =
      !hasPackWeightInTitle &&
      (
        /(?:€|eur)\s*\/\s*kg\b/i.test(lidlPricingText) ||
        /\b(?:hinta\s*\/\s*kg|kilohinta|per\s*kg)\b/i.test(lidlPricingText) ||
        /\bkg\b/i.test(String(box?.priceSymbol || ""))
      );

    return {
      id: `lidl-${key}-${String(row?.id || index)}`,
      source: "lidl-plus",
      chain: "Lidl",
      storeKey: key,
      storeLabel: storeName,
      storeName,
      shopName: storeName,
      title,
      name: title,
      productName: title,
      brandName,
      price: numericPrice,
      priceText,
      offerPrice: numericPrice,
      originalPrice: normalPrice,
      normalPrice,
      unitPriceText,
      comparisonPriceText: unitPriceText,
      isWeightedProduct,
      weightProductLabel: isWeightedProduct ? "Vaakatuote" : "",
      priceBasis: isWeightedProduct ? "per-kg" : totalPrice != null ? "multi-buy-total" : "unit",
      discountText,
      benefitText: discountText || "Lidl tarjous",
      validityText: validityText(row?.startValidityDate, row?.endValidityDate),
      validFrom: row?.startValidityDate || "",
      validUntil: row?.endValidityDate || "",
      imageUrl: row?.imageUrl || "",
      image: row?.imageUrl || "",
      pictureUrl: row?.imageUrl || "",
      category,
      categoryPath: category,
      mainCategory: category,
      productIds: Array.isArray(row?.productIds) ? row.productIds : [],
      lidlProductIds: Array.isArray(row?.productIds)
        ? row.productIds.map((value: unknown) => String(value || "").trim()).filter(Boolean)
        : [],
      lidlProductId: Array.isArray(row?.productIds)
        ? String(row.productIds.find((value: unknown) => String(value || "").trim()) || "")
        : "",
      offerType: row?.offerType || "",
      redemptionChannel: row?.redemptionChannel || "",
      hasConcretePrice: numericPrice != null,
      ...(totalPrice != null && totalQuantity != null
        ? {
            multiBuyTotalPrice: totalPrice,
            multiBuyQuantity: totalQuantity,
            multiBuyUnitPrice: totalPrice / totalQuantity,
          }
        : {}),
      // Keep Lidl's complete price box available for DBG inspection when the
      // API represents a multi-buy/special offer without largePartNumeric.
      // Do not derive a cart price from these fields until their semantics are verified.
      ...(numericPrice == null
        ? {
            debugPriceBox: box,
            debugOfferPricing: {
              discountMessage: box?.discountMessage ?? null,
              largePartString: box?.largePartString ?? null,
              largePartNumeric: box?.largePartNumeric ?? null,
              smallPartString: box?.smallPartString ?? null,
              smallPartNumeric: box?.smallPartNumeric ?? null,
              priceSymbol: box?.priceSymbol ?? null,
              pricePerUnit: row?.pricePerUnit ?? null,
              weightedPricingText: lidlPricingText || null,
              detectedWeightedProduct: isWeightedProduct,
            },
            debugRawPriceFields: Object.fromEntries(
              Object.entries(row).filter(([field]) =>
                /price|amount|value|discount|saving|regular|original|before|unit/i.test(field),
              ),
            ),
            debugRawKeys: Object.keys(row),
          }
        : {}),
      // Lidl productIds are internal identifiers unless the source explicitly
      // publishes a barcode field. Never present an internal Lidl id as an EAN.
      ean: [row?.ean, row?.gtin, row?.barcode]
        .map((value) => String(value || "").trim())
        .find((value) => /^\d{8,14}$/.test(value)) || "",
      rawText: [title, brandName, priceText, discountText, unitPriceText, category, storeName].filter(Boolean).join(" "),
    };
  });

  // Gösta is a grocery offer search, not the Lidl general-merchandise catalogue.
  // Match the S/K daily-grocery scope; do not reclassify non-food as "Muut".
  const groceryOffers = offers.filter((offer) => offer.category !== "Koti & vapaa-aika");

  await observeEanProductsBestEffort(
    groceryOffers.map((offer) => ({
      ean: offer.ean,
      name: offer.name,
      brand: offer.brandName,
      imageUrl: offer.imageUrl,
      category: offer.category,
      source: "lidl-plus-offers",
    })),
  );

  return groceryOffers;
}

// Pre-parsed offers become visible only during their Finnish validity dates.
export function onlyCurrentlyValidLidlOffers<T extends { validFrom?: unknown; validUntil?: unknown }>(
  offers: T[],
  today: string = finnishPublicationDate(),
): T[] {
  return offers.filter((offer) => publicationState({
    validFrom: String(offer.validFrom || "").slice(0, 10),
    validUntil: String(offer.validUntil || "").slice(0, 10),
  }, today) === "current");
}

/** Fetch raw dated Lidl source rows for advance staging, including future offers. */
export async function fetchLidlDatedOffersForStaging(storeKey: string, storeName = "Lidl") {
  const key = String(storeKey || "").trim();
  return key ? fetchLidlStructuredUncached(key, storeName) : [];
}

export async function fetchLidlOffers(storeKey: string, storeName = "Lidl") {
  const key = String(storeKey || "").trim();
  if (!key) return [];
  const cacheKey = key + ":" + storeName;
  const now = Date.now();
  const cached = lidlStructuredCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.promise.then((offers) => onlyCurrentlyValidLidlOffers(offers));
  const promise = fetchLidlStructuredUncached(key, storeName).catch((error) => {
    // Do not retain a failed structured feed; the next request can retry.
    lidlStructuredCache.delete(cacheKey);
    throw error;
  });
  lidlStructuredCache.set(cacheKey, { expiresAt: now + LIDL_STRUCTURED_TTL_MS, promise });
  return promise.then((offers) => onlyCurrentlyValidLidlOffers(offers));
}
