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

  const nonFoodText = /vaippa|vaipat|pampers|libero|baby|vauva|lastenhoito|pesu|pyykin|fairy|astianpesu|wc|siivous|talouspaperi|vessa|shampoo|saippua|koira|kissa|lemmik|pedigree|whiskas|sheba|purina/;
  const petText = /koira|kissa|lemmik|pedigree|whiskas|sheba|purina/;
  const homeText = /vaippa|vaipat|pampers|libero|baby|vauva|lastenhoito|pesu|pyykin|fairy|astianpesu|wc|siivous|talouspaperi|vessa|shampoo|saippua/;

  if (petText.test(text)) return "Lemmikit";
  if (homeText.test(text)) return "Koti";

  if (!nonFoodText.test(text)) {
    if (/kahvi|espresso|suodatinjauh|kahvipapu|papukahvi|cappuccino|latte/.test(text)) return "Kahvi";
    if (/maito|jugur|jogur|jogurt|rahka|raejuusto|juusto|voi|kerma|piima|viili|kefiiri|proteiinivanukas|vanukas/.test(text)) return "Maitotuotteet";
    if (/jauheliha|kana|broiler|possu|porsas|nauta|sika|makkara|leikkele|kinkku|pekoni|filee|paisti|lihapulla|liha/.test(text)) return "Liha";
    if (/kirjolohi|lohi|tonnikala|silakka|katkarapu|kuha|ahven|seiti|kalapuikko|silli|kala/.test(text)) return "Kala";
    if (/leipa|sampyl|pulla|croissant|karjalanpiir|pita|patonki|ruis|paahtoleipa|donitsi/.test(text)) return "Leipomo";
    if (/hedel|omena|banaani|appelsiini|mandariini|viiniryp|vihannes|tomaatti|kurkku|salaatti|peruna|sipuli|porkkana|kaali|avokado/.test(text)) return "Hevi";
    if (/limu|cola|mehu|energiajuoma|vesi|kivennaisvesi|kivenn|virvoitus|smoothie/.test(text)) return "Juomat";
    if (/pakaste|jaatel|pizza|ranskalaiset|wokvihannes/.test(text)) return "Pakasteet";
    if (/valmisateria|valmisruoka|keitto|keitot|salaattiateria|mikroateria|ateria/.test(text)) return "Valmisruoka";
    if (/suklaa|karkki|makeinen|makeiset|lakritsi|salmiakki|pastilli/.test(text)) return "Makeiset";
  }

  return "Muut";
}

export function getOfferCategoryV106(item: ZiiplyGostaOfferLike) {
  // V145: käytä ensin providerin oikeita kategoria-/breadcrumb-kenttiä, jos niitä löytyy.
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

  if (!key || key === "kaikki" || key === "all") {
    return [
      "kahvi",
      "maito",
      "juusto",
      "jogurtti",
      "rahka",
      "voi",
      "kerma",
      "kananmuna",
      "jauheliha",
      "kana",
      "broileri",
      "makkara",
      "leikkele",
      "lohi",
      "kala",
      "leipä",
      "pulla",
      "hedelmä",
      "vihannes",
      "peruna",
      "mehu",
      "limu",
      "valmisateria",
      "keitto",
      "suklaa",
      "karkki",
      "pakaste",
      "jäätelö",
      "pizza",
      "pesuaine",
      "talouspaperi",
      "wc-paperi",
      "koiranruoka",
      "kissanruoka",
    ];
  }

  const seedsByCategory: Record<string, string[]> = {
    kahvi: ["kahvi", "espresso", "suodatinjauhettu kahvi", "kahvipapu"],
    maitotuotteet: ["maito", "juusto", "jogurtti", "rahka", "raejuusto", "voi", "kerma", "viili", "kefiiri", "vanukas"],
    liha: ["jauheliha", "kana", "broileri", "nauta", "possu", "porsas", "makkara", "leikkele", "kinkku", "pekoni", "lihapulla"],
    kala: ["lohi", "kirjolohi", "kala", "tonnikala", "silakka", "katkarapu", "seiti", "kalapuikko", "silli"],
    leipomo: ["leipä", "sämpylä", "pulla", "croissant", "karjalanpiirakka", "patonki", "ruisleipä", "paahtoleipä"],
    hevi: ["hedelmä", "omena", "banaani", "appelsiini", "vihannes", "tomaatti", "kurkku", "salaatti", "peruna", "sipuli", "porkkana"],
    juomat: ["mehu", "limu", "cola", "energiajuoma", "vesi", "kivennäisvesi", "virvoitusjuoma", "smoothie"],
    valmisruoka: ["valmisateria", "valmisruoka", "keitto", "salaattiateria", "mikroateria", "ateria"],
    makeiset: ["suklaa", "karkki", "makeinen", "makeiset", "lakritsi", "salmiakki"],
    lemmikit: ["koiranruoka", "kissanruoka", "lemmikkiruoka", "pedigree", "whiskas", "sheba", "purina"],
    koti: ["pesuaine", "pyykinpesuaine", "astianpesuaine", "fairy", "wc-paperi", "talouspaperi", "siivous"],
    pakasteet: ["pakaste", "jäätelö", "pizza", "ranskalaiset", "pakastevihannes"],
    muut: ["tarjous"],
  };

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
