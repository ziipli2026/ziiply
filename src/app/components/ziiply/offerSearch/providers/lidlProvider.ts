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
  if (/kahvi|espresso|cappuccino|tee\b/.test(s)) return "Kahvi & tee";
  if (/maito|jogur|jugur|rahka|juusto|kerma|voi\b|piima|viili/.test(s)) return "Maitotuotteet";
  if (/kana|broiler|nauta|sika|pors|jauheliha|makkara|nakki|pekoni|kinkku|liha|pulled pork/.test(s)) return "Liha & makkarat";
  if (/kala|lohi|silakka|tonnikala|kirjolohi|seiti|katkarapu/.test(s)) return "Kala";
  if (/leipa|sampyl|pull|croissant|paton|karjalanpiirakka|ruisleip|rieska/.test(s)) return "Leipomo";
  if (/limu|juoma|mehu|vesi|vichy|energiajuoma|cola/.test(s)) return "Juomat";
  if (/sitruuna|retiisi|granaattiomena|omena|banaani|tomaatti|kurkku|salaatti|paprika|peruna|sipuli|porkkana|bataatti|mandariini|appelsiini|mango|marja|hedelm|vihann|kasvis|kaali/.test(s)) return "Hevi";
  if (/pakaste|jaatel|pakastettu/.test(s)) return "Pakasteet";
  if (/valmis|ateria|pizza|keitto|salaattiateria|mikroateria|laatikko|lasagne|wokki|risotto/.test(s)) return "Valmisruoka";
  if (/pasta|riisi|jauho|hiutale|muro|mysli|sailyke|kastike|oljy|mauste|sokeri|suola|puuro|nuudeli|makaroni|spagetti|sushi-inkivaari|nori|merileva|wasabi|seesaminsiemen/.test(s)) return "Kuivatuotteet";
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

export async function fetchLidlOffers(storeKey: string, storeName = "Lidl") {
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

  return rows.map((row, index) => {
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
}
