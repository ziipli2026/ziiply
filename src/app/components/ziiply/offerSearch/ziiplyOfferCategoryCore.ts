// ============================================================================
// ZIIPLY_OFFER_CATEGORY_CORE_V153_S_KAMPANJAT_FOOD_BASKET_SCOPE
// Revision: V153
// Date: 2026-06-06
//
// Fix:
// - Maps S-kanava categories to Ziiply categories using provider category metadata first.
// - Keeps Gösta scoped to food basket + everyday essentials, not the full S-kanava catalogue.
// - Widens seeds for Pakasteet, Valmisruoka, Juomat, Koti and other real offer groups.
// ============================================================================

export type ZiiplyGostaOfferLike = Record<string, unknown>;

function normalizeGostaText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " ja ")
    .replace(/[^a-z0-9åäö\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getFirstString(item: ZiiplyGostaOfferLike, keys: string[]) {
  for (const key of keys) {
    const value = item?.[key];
    if (Array.isArray(value)) {
      const joined = value
        .map((entry) => {
          if (typeof entry === "string" || typeof entry === "number") return String(entry);
          if (entry && typeof entry === "object") {
            const objectEntry = entry as Record<string, unknown>;
            return String(objectEntry.name || objectEntry.title || objectEntry.label || objectEntry.slug || "");
          }
          return "";
        })
        .filter(Boolean)
        .join(" ");
      if (joined.trim()) return joined.trim();
      continue;
    }

    if (value && typeof value === "object") {
      const objectValue = value as Record<string, unknown>;
      const picked = String(objectValue.name || objectValue.title || objectValue.label || objectValue.slug || "").trim();
      if (picked) return picked;
      continue;
    }

    const stringValue = String(value ?? "").trim();
    if (stringValue) return stringValue;
  }

  return "";
}

export function getOfferSearchTextV106(item: ZiiplyGostaOfferLike) {
  return [
    item?.title,
    item?.name,
    item?.productName,
    item?.brandName,
    item?.storeLabel,
    item?.storeName,
    item?.chain,
    item?.benefitText,
    item?.validityText,
    item?.category,
    item?.categoryPath,
    item?.breadcrumbs,
    item?.department,
    item?.productGroup,
    item?.mainCategory,
    item?.subCategory,
    item?.taxonomy,
    item?.hierarchy,
  ]
    .filter(Boolean)
    .map(String)
    .join(" ");
}

export function getOfferProductTitleV113(item: ZiiplyGostaOfferLike) {
  return String(
    item?.title ||
      item?.name ||
      item?.productName ||
      item?.productTitle ||
      item?.displayName ||
      "",
  ).trim();
}

function getOfferCategoryMetaText(item: ZiiplyGostaOfferLike) {
  return getFirstString(item, [
    "category",
    "categoryName",
    "categoryPath",
    "breadcrumbs",
    "breadcrumb",
    "department",
    "departmentName",
    "productGroup",
    "productGroupName",
    "mainCategory",
    "subCategory",
    "taxonomy",
    "hierarchy",
    "section",
  ]);
}

function classifyGostaCategoryFromText(rawText: string) {
  const text = normalizeGostaText(rawText);

  // V153: S-kanavan oikeat pääkategoriat ensin, mutta Gösta pidetään ruokakorivertailussa.
  // Mukana ruoka + arjen välttämättömät: kodinhoito, paperit, pesuaineet, vaipat ja lemmikit.
  if (/lemmikkien ruuat ja tarvikkeet|lemmikkien ruoat ja tarvikkeet|lemmikki|lemmik|koira|kissa|pedigree|whiskas|sheba|purina|friskies|perfect fit|best friend/.test(text)) return "Lemmikit";

  if (/kodinhoito ja taloustarvikkeet|kodinhoito|taloustarvikkeet|lastenruoat vaipat ja hoitotarvikkeet|lastenruoat|lastenruoka|vaippa|vaipat|hoitotarvikkeet|pampers|libero|baby|vauva|lastenhoito|pesu|pyykin|pyykinpesu|fairy|astianpesu|wc|siivous|talouspaperi|vessa|roskapussi|leivinpaperi|folio|kelmu|hygienia|shampoo|saippua|hammastahna|hammasharja/.test(text)) return "Koti";

  if (/liha ja kasviproteiinit|liha|jauheliha|kana|broiler|possu|porsas|nauta|sika|makkara|leikkele|kinkku|pekoni|filee|paisti|lihapulla|kasviproteiini|tofu|nyhtokaura|harkis|vege/.test(text)) return "Liha";
  if (/kala ja merenelavat|kala ja merenelävät|merenelav|mereneläv|kirjolohi|lohi|tonnikala|silakka|katkarapu|kuha|ahven|seiti|kalapuikko|silli|kala/.test(text)) return "Kala";
  if (/hedelmat ja vihannekset|hedelmät ja vihannekset|hedel|omena|banaani|appelsiini|mandariini|viiniryp|vihannes|tomaatti|kurkku|salaatti|peruna|sipuli|porkkana|kaali|avokado|marja/.test(text)) return "Hevi";
  if (/leivat keksit ja leivonnaiset|leivät keksit ja leivonnaiset|leipa|leipä|sampyl|sämpyl|pulla|croissant|karjalanpiir|pita|patonki|ruis|paahtoleipa|paahtoleipä|donitsi|keksi|leivonnainen/.test(text)) return "Leipomo";
  if (/maito munat ja rasvat|maito|kananmuna|munat|jugur|jogur|jogurt|rahka|raejuusto|juusto|voi|margariini|rasva|kerma|piima|viili|kefiiri|proteiinivanukas|vanukas/.test(text)) return "Maitotuotteet";
  if (/juustot tofut ja kasvipohjaiset|juusto|tofu|kasvipohjainen|kaurajuoma|soijajuoma|vegejuusto/.test(text)) return "Maitotuotteet";
  if (/kahvit teet ja mehut|kahvi|tee|espresso|suodatinjauh|kahvipapu|papukahvi|cappuccino|latte/.test(text)) return "Kahvi";
  if (/alkoholi ja virvoitusjuomat|alkoholi- ja virvoitusjuomat|virvoitus|limu|cola|mehu|energiajuoma|vesi|kivennaisvesi|kivenn|smoothie|olut|siideri|lonkero/.test(text)) return "Juomat";
  if (/pakasteet|pakaste|jaatel|jäätel|pizza|ranskalaiset|wokvihannes|pakastevihannes|pakastemarja/.test(text)) return "Pakasteet";
  if (/valmisruoka|valmisateria|keitto|keitot|salaattiateria|mikroateria|ateria|laatikko|pasta ateria/.test(text)) return "Valmisruoka";
  if (/karkit ja suklaat|snacksit|snacks|suklaa|karkki|makeinen|makeiset|lakritsi|salmiakki|pastilli|sipsi|nacho|popcorn/.test(text)) return "Makeiset";

  return "Muut";
}

export function getOfferCategoryV106(item: ZiiplyGostaOfferLike) {
  // V152: käytä ensin providerin oikeita S-kanava-kategorioita/breadcrumb-kenttiä, jos niitä löytyy.
  // Otsikkopohjainen päätelmä jää fallbackiksi vanhoille parserituloksille.
  const metaText = getOfferCategoryMetaText(item);
  const metaCategory = metaText ? classifyGostaCategoryFromText(metaText) : "Muut";
  if (metaCategory !== "Muut") return metaCategory;

  const titleText = getOfferProductTitleV113(item);
  return classifyGostaCategoryFromText(`${titleText} ${metaText}`.trim());
}

export function isKnownOfferCategoryFilterV113(filter: string) {
  return [
    "kahvi",
    "maitotuotteet",
    "liha",
    "kala",
    "leipomo",
    "hevi",
    "juomat",
    "lemmikit",
    "koti",
    "pakasteet",
    "valmisruoka",
    "makeiset",
    "muut",
  ].includes(normalizeGostaText(filter));
}

export const GOSTA_CATEGORY_LABELS_V136 = [
  "Kaikki",
  "Kahvi",
  "Maitotuotteet",
  "Liha",
  "Kala",
  "Leipomo",
  "Hevi",
  "Juomat",
  "Valmisruoka",
  "Makeiset",
  "Lemmikit",
  "Koti",
  "Pakasteet",
];

export function getGostaCategorySeedQueriesV136(categoryOrFilter: string) {
  const key = normalizeGostaText(categoryOrFilter);

  const seedsByCategory: Record<string, string[]> = {
    kahvi: ["kahvi", "tee", "espresso", "suodatinjauhettu kahvi", "kahvipapu", "juhla mokka", "presidentti", "mehu"],
    maitotuotteet: ["maito", "munat", "kananmuna", "juusto", "jogurtti", "rahka", "raejuusto", "voi", "margariini", "kerma", "viili", "kefiiri", "vanukas", "kaurajuoma"],
    liha: ["liha", "liha ja kasviproteiinit", "jauheliha", "kana", "broileri", "nauta", "possu", "porsas", "sika", "makkara", "grillimakkara", "leikkele", "kinkku", "pekoni", "filee", "lihapulla", "kasviproteiini", "tofu"],
    kala: ["kala", "kala ja merenelävät", "lohi", "kirjolohi", "tonnikala", "silakka", "katkarapu", "seiti", "kalapuikko", "silli"],
    leipomo: ["leipä", "leivät", "sämpylä", "pulla", "croissant", "karjalanpiirakka", "patonki", "ruisleipä", "paahtoleipä", "keksit", "leivonnaiset"],
    hevi: ["hedelmät", "vihannekset", "hedelmä", "omena", "banaani", "appelsiini", "vihannes", "tomaatti", "kurkku", "salaatti", "peruna", "sipuli", "porkkana", "marjat"],
    juomat: ["virvoitusjuomat", "mehu", "limu", "cola", "energiajuoma", "vesi", "kivennäisvesi", "smoothie", "kahvit teet ja mehut"],
    valmisruoka: ["valmisruoka", "valmisateria", "keitto", "salaattiateria", "mikroateria", "ateria", "laatikko", "pasta", "risotto"],
    makeiset: ["karkit", "suklaat", "suklaa", "karkki", "makeinen", "makeiset", "lakritsi", "salmiakki", "snacksit", "sipsi", "popcorn", "nachot"],
    lemmikit: ["lemmikkien ruoat", "lemmikkien ruuat", "lemmikkiruoka", "koiranruoka", "kissanruoka", "pedigree", "whiskas", "sheba", "purina", "friskies"],
    koti: ["kodinhoito", "taloustarvikkeet", "kodinhoito ja taloustarvikkeet", "lastenruoka", "lastenruoat", "vaipat", "hoitotarvikkeet", "hygienia", "koti", "pesuaine", "pyykinpesuaine", "astianpesuaine", "fairy", "wc-paperi", "talouspaperi", "siivous", "roskapussi", "leivinpaperi", "folio", "kelmu", "shampoo", "saippua", "hammastahna"],
    pakasteet: ["pakasteet", "pakaste", "jäätelö", "pizza", "ranskalaiset", "pakastevihannes", "pakastemarjat", "wokvihannes"],
    muut: ["tarjous", "tarjoukset", "kampanja", "kampanjat"],
  };

  if (!key || key === "kaikki" || key === "all") {
    return Array.from(new Set([
      ...seedsByCategory.kahvi,
      ...seedsByCategory.maitotuotteet,
      ...seedsByCategory.liha,
      ...seedsByCategory.kala,
      ...seedsByCategory.leipomo,
      ...seedsByCategory.hevi,
      ...seedsByCategory.juomat,
      ...seedsByCategory.valmisruoka,
      ...seedsByCategory.makeiset,
      ...seedsByCategory.lemmikit,
      ...seedsByCategory.koti,
      ...seedsByCategory.pakasteet,
    ]));
  }

  return seedsByCategory[key] ?? [];
}

export function getGostaCategoryLabelFromFilterV136(filter: string) {
  const normalized = normalizeGostaText(filter);
  return GOSTA_CATEGORY_LABELS_V136.find((label) => normalizeGostaText(label) === normalized) || filter;
}

export function isGostaCategorySelectionV136(value: string) {
  const normalized = normalizeGostaText(value);
  return normalized === "kaikki" || isKnownOfferCategoryFilterV113(normalized);
}

export function isBadOfferSearchResultV106(item: ZiiplyGostaOfferLike) {
  const title = String(item?.title || item?.name || item?.productName || "").trim();
  const priceText = String(item?.priceText || item?.offerPrice || item?.price || "").trim();

  if (!title || normalizeGostaText(title).length < 3) return true;
  void priceText;

  const normalizedTitle = normalizeGostaText(title);
  const hardJunkTitlePatterns = [
    /^(0\s*)?kappaletta(\s+ostoskorissa)?$/,
    /^ostoskori$/,
    /^kirjaudu$/,
    /^rekisteroidy$/,
    /^evaste$/,
    /^cookie$/,
    /^kampanja$/,
    /^tarjous$/,
    /^osta$/,
    /^avaa$/,
    /^lue lisaa$/,
  ];
  if (hardJunkTitlePatterns.some((pattern) => pattern.test(normalizedTitle))) return true;

  const letters = title.replace(/[^A-Za-zÅÄÖåäö]/g, "");
  return letters.length < 3;
}
