// ============================================================================
// ZIIPLY_OFFER_CATEGORY_CORE_V160_DRY_PRODUCTS_AND_MAKEISET_KEKSIT
// Revision: V160
// Date: 2026-07-04
//
// Muutokset:
// - Lisää Kuivatuotteet-kategorian: pasta, riisi, jauhot, sokeri, hiutaleet, murot, mysli, säilykkeet.
// - Ei erillistä Koiranruoka-kategoriaa: koiran/kissan ruoat kuuluvat Lemmikit-ryhmään.
// - Muuttaa näkyvän Makeiset-kategorian nimeksi Makeiset & keksit.
// - Lisää keksit Makeiset & keksit -ryhmään, mutta jäätelöt pysyvät Pakasteissa.
// - Säilyttää aiemmat Haribo/Hevi, Lumene/Maitotuotteet ja jäätelö/Makeiset-korjaukset.
// ============================================================================

// ============================================================================
// ZIIPLY_OFFER_CATEGORY_CORE_V159_MAKEISET_STRICT_NO_ICECREAM_SNACKS
// Revision: V159
// Date: 2026-07-04
//
// Muutokset:
// - Korjaa Makeiset-kategorian liian lavean rajauksen.
// - Jäätelöt, jäätelötuutit, Pingviini, Kingis, Magnum ja Ben & Jerry's
//   pakotetaan Pakasteet-kategoriaan ennen Makeiset-tarkistusta.
// - Poistaa snacksit/sipsit/popcornit/nachot Makeiset-siemenhauista.
// - S-kaupat-polun "snacksit" ei enää yksinään luokittele tuotetta Makeisiin.
// - TUC/suolakeksit/snacksit jäävät pois Makeisista, ellei niitä myöhemmin
//   lisätä omaksi Snacksit-ryhmäksi.
// - Ei muutoksia S/K-provideriin, kuviin, GPS:ään, skanneriin eikä äänihakuun.
// ============================================================================

// ============================================================================
// ZIIPLY_OFFER_CATEGORY_CORE_V158_BUILD_FIX_STRICT_OVERRIDE
// Revision: V158
// Date: 2026-07-04
//
// Muutokset:
// - Lisää tiukat etusijaluokat ennen laajaa tekstiluokittelua:
//   Haribo/karkit/hedelmäkarkit -> Makeiset, ei Hevi.
//   Lumene/kasvovoide/kosteusvoide/ihonhoito -> Koti, ei Maitotuotteet.
// - Muuttaa tekstiluokittelun järjestystä: Koti ja Makeiset tarkistetaan ennen
//   Heviä ja Maitotuotteita, jotta hakusanojen "maito"/"hedelmä" sivuosumat
//   eivät nosta vääriä tuotteita ruokaryhmiin.
// - Täydentää tuoteryhmäluettelon järjestyksen: Valmisruoka ja Pakasteet mukaan
//   näkyvään listaan, Lemmikit/Koti/Muut viimeisiksi.
// - Ei muutoksia S/K-provideriin, kuviin, GPS:ään, skanneriin eikä äänihakuun.
// ============================================================================

// ============================================================================
// ZIIPLY_OFFER_CATEGORY_CORE_V155_TAXONOMY_FIRST
// Revision: V155
// Date: 2026-07-04
//
// Fix:
// - Maps S-kanava categories to Ziiply categories using provider category metadata first.
// - Keeps Gösta scoped to food basket + everyday essentials, not the full S-kanava catalogue.
// - Widens seeds for Pakasteet, Valmisruoka, Juomat, Koti and other real offer groups.
// - V155: uses S-kaupat taxonomy/categoryPath/hierarchy before regex title guessing.
// - V157: strict overrides keep candy out of Hevi and cosmetics out of Maitotuotteet.
// - V158: build fix, adds the missing getStrictGostaCategoryOverrideV157() helper.
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


function classifyGostaCategoryFromSPathV155(rawText: string) {
  const text = normalizeGostaText(rawText);
  if (!text) return "Muut";

  // Use S-kaupat's own top-level category path first. This avoids false
  // positives from product names, brands or benefit text.
  if (/^liha-ja-kasviproteiinit\b|\/ liha ja kasviproteiinit\b|\bliha ja kasviproteiinit\b/.test(text)) return "Liha";
  if (/^kala-ja-merenelavat\b|^kala-ja-merenelävät\b|\/ kala ja merenelavat\b|\/ kala ja merenelävät\b|\bkala ja merenelavat\b|\bkala ja merenelävät\b/.test(text)) return "Kala";
  if (/^hedelmat-ja-vihannekset\b|^hedelmät-ja-vihannekset\b|\/ hedelmat ja vihannekset\b|\/ hedelmät ja vihannekset\b|\bhedelmat ja vihannekset\b|\bhedelmät ja vihannekset\b/.test(text)) return "Hevi";
  if (/^leivat-keksit-ja-leivonnaiset\b|^leivät-keksit-ja-leivonnaiset\b|\/ leivat keksit ja leivonnaiset\b|\/ leivät keksit ja leivonnaiset\b|\bleivat keksit ja leivonnaiset\b|\bleivät keksit ja leivonnaiset\b/.test(text)) return "Leipomo";
  if (/^maito-munat-ja-rasvat\b|\/ maito munat ja rasvat\b|\bmaito munat ja rasvat\b/.test(text)) return "Maitotuotteet";
  if (/^juustot-tofut-ja-kasvipohjaiset\b|\/ juustot tofut ja kasvipohjaiset\b|\bjuustot tofut ja kasvipohjaiset\b/.test(text)) return "Maitotuotteet";
  if (/^kahvit-teet-ja-mehut\b|\/ kahvit teet ja mehut\b|\bkahvit teet ja mehut\b/.test(text)) return "Kahvi";
  if (/^alkoholi-ja-virvoitusjuomat\b|\/ alkoholi ja virvoitusjuomat\b|\balkoholi ja virvoitusjuomat\b|^virvoitusjuomat\b/.test(text)) return "Juomat";
  if (/^pakasteet\b|\/ pakasteet\b|\bpakasteet\b/.test(text)) return "Pakasteet";
  if (/^valmisruoka\b|\/ valmisruoka\b|\bvalmisruoka\b/.test(text)) return "Valmisruoka";
  if (/^kuivatuotteet\b|\/ kuivatuotteet\b|\bkuivatuotteet\b|^pasta-riisi-ja-aterian-lisukkeet\b|\b pasta riisi ja aterian lisukkeet\b|^sailykkeet\b|^säilykkeet\b|^jauhot-ja-leivonta\b|\bjauhot ja leivonta\b|^murot-myslit-ja-hiutaleet\b|\bmurot myslit ja hiutaleet\b/.test(text)) return "Kuivatuotteet";
  if (/^karkit-ja-suklaat\b|\/ karkit ja suklaat\b|\bkarkit ja suklaat\b/.test(text)) return "Makeiset & keksit";
  if (/^lemmikit\b|^lemmikkien-ruoat-ja-tarvikkeet\b|^lemmikkien-ruuat-ja-tarvikkeet\b|\/ lemmikit\b|\blemmikit\b|\blemmikkien ruoat ja tarvikkeet\b|\blemmikkien ruuat ja tarvikkeet\b/.test(text)) return "Lemmikit";

  // Baby food is food; diapers/care products are Koti.
  if (/^lapset\/lastenruoat\b|\/ lastenruoat\b|\blastenruoat\b|\blastenruoka\b|\bvauvanruoka\b|\bvauvanruoat\b/.test(text)) return "Valmisruoka";

  if (/^kodinhoito-ja-taloustarvikkeet\b|\/ kodinhoito ja taloustarvikkeet\b|\bkodinhoito ja taloustarvikkeet\b|^taloustarvikkeet\b|^hygienia\b/.test(text)) return "Koti";

  return "Muut";
}

function classifyGostaCategoryFromText(rawText: string) {
  const text = normalizeGostaText(rawText);

  // V157: strict non-produce/non-dairy buckets first. These must win before
  // Hevi/Maitotuotteet because S-kaupat/search metadata can contain words like
  // hedelmä, marja, milk or cream inside candy/cosmetic products.
  if (/lemmikkien ruuat ja tarvikkeet|lemmikkien ruoat ja tarvikkeet|lemmikki|lemmik|koira|kissa|pedigree|whiskas|sheba|purina|friskies|perfect fit|best friend/.test(text)) return "Lemmikit";

  if (/kodinhoito ja taloustarvikkeet|kodinhoito|taloustarvikkeet|vaippa|vaipat|hoitotarvikkeet|pampers|libero|lastenhoito|pesu|pyykin|pyykinpesu|fairy|astianpesu|wc|siivous|talouspaperi|vessa|roskapussi|leivinpaperi|folio|kelmu|hygienia|shampoo|saippua|hammastahna|hammasharja|lumene|nivea|dove|kasvovoide|kosteusvoide|paivavoide|päivävoide|yovoide|yövoide|ihonhoito|kosmetiikka|meikki|seerumi|deodorantti/.test(text)) return "Koti";

  // V159: Pakasteet must win before Makeiset. Ice creams often contain
  // words such as suklaa/lakritsi in the product name, but the real bucket is Pakasteet.
  if (/pakasteet|pakaste|jaatel|jäätel|ice cream|pingviini|kingis|magnum|ben jerry|ben and jerry|pizza|ranskalaiset|wokvihannes|pakastevihannes|pakastemarja/.test(text)) return "Pakasteet";

  if (/karkit ja suklaat|suklaa|karkki|karkit|hedelmakarkki|hedelmäkarkki|makeinen|makeiset|lakritsi|salmiakki|pastilli|purukumi|ksylitoli|haribo|click mix|marianne|fazer|pandy/.test(text)) return "Makeiset & keksit";

  // V154: baby food is food, not Koti. Diapers/care products still stay in Koti.
  if (/lastenruoka|lastenruoat|vauvanruoka|vauvanruoat|baby food|piltti|bonan|semper/.test(text)) return "Valmisruoka";
  if (/valmisruoka|valmisateria|keitto|keitot|salaattiateria|mikroateria|ateria|laatikko|pasta ateria/.test(text)) return "Valmisruoka";

  if (/kuivatuotteet|pasta|riisi|nuudeli|makaroni|spagetti|jauho|jauhot|sokeri|hiutale|hiutaleet|kaurahiutale|muro|murot|mysli|granola|sailyke|säilyke|tonnikalasailyke|tonnikalasäilyke|papu|pavut|linssi|linssit|kastikejauhe|mauste|mausteet|leivonta/.test(text)) return "Kuivatuotteet";

  if (/liha ja kasviproteiinit|liha|jauheliha|kana|broiler|possu|porsas|nauta|sika|makkara|leikkele|kinkku|pekoni|filee|paisti|lihapulla|kasviproteiini|tofu|nyhtokaura|harkis|vege/.test(text)) return "Liha";
  if (/kala ja merenelavat|kala ja merenelävät|merenelav|mereneläv|kirjolohi|lohi|tonnikala|silakka|katkarapu|kuha|ahven|seiti|kalapuikko|silli|kala/.test(text)) return "Kala";
  if (/leivat keksit ja leivonnaiset|leivät keksit ja leivonnaiset|leipa|leipä|sampyl|sämpyl|pulla|croissant|karjalanpiir|pita|patonki|ruis|paahtoleipa|paahtoleipä|donitsi|keksi|leivonnainen/.test(text)) return "Leipomo";
  if (/maito munat ja rasvat|maito|kananmuna|munat|jugur|jogur|jogurt|rahka|raejuusto|juusto|voi|margariini|rasva|kerma|piima|viili|kefiiri|proteiinivanukas|vanukas/.test(text)) return "Maitotuotteet";
  if (/juustot tofut ja kasvipohjaiset|juusto|tofu|kasvipohjainen|kaurajuoma|soijajuoma|vegejuusto/.test(text)) return "Maitotuotteet";
  if (/kahvit teet ja mehut|kahvi|tee|espresso|suodatinjauh|kahvipapu|papukahvi|cappuccino|latte/.test(text)) return "Kahvi";
  if (/alkoholi ja virvoitusjuomat|alkoholi- ja virvoitusjuomat|virvoitus|limu|cola|mehu|energiajuoma|vesi|kivennaisvesi|kivenn|smoothie|olut|siideri|lonkero/.test(text)) return "Juomat";

  // Hevi last among common food buckets so hedelmäkarkki/marjakarkki cannot win.
  if (/hedelmat ja vihannekset|hedelmät ja vihannekset|hedel|omena|banaani|appelsiini|mandariini|viiniryp|vihannes|tomaatti|kurkku|salaatti|peruna|sipuli|porkkana|kaali|avokado|marja/.test(text)) return "Hevi";

  return "Muut";
}


function getStrictGostaCategoryOverrideV157(item: ZiiplyGostaOfferLike): string {
  const strictText = normalizeGostaText(
    [
      item?.title,
      item?.name,
      item?.productName,
      item?.brandName,
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
      .join(" "),
  );

  if (!strictText) return "";

  // These hard overrides must win before broad words such as hedelmä, marja,
  // maito or cream can place the offer in Hevi/Maitotuotteet.
  // V159: ice cream is Pakasteet even when the title contains suklaa/lakritsi.
  if (/\b(jaatelo|jäätelö|jaatelotu|jäätelötu|ice cream|pingviini|kingis|magnum|ben jerry|ben and jerry)\b/.test(strictText)) {
    return "Pakasteet";
  }

  if (/\b(haribo|click mix|karkki|karkit|hedelmakarkki|hedelmäkarkki|makeinen|makeiset|suklaa|lakritsi|salmiakki|pastilli|purukumi|ksylitoli|marianne|fazer|pandy|keksi|keksit|cookie|cookies)\b/.test(strictText)) {
    return "Makeiset & keksit";
  }

  if (/\b(lumene|nivea|dove|garnier|loreal|l oreal|kasvovoide|kosteusvoide|paivavoide|päivävoide|yovoide|yövoide|ihonhoito|kosmetiikka|meikki|seerumi|deodorantti|shampoo|hoitoaine|suihkusaippua)\b/.test(strictText)) {
    return "Koti";
  }

  if (/\b(pedigree|whiskas|sheba|purina|friskies|perfect fit|best friend|koiranruoka|kissanruoka|lemmikkiruoka|lemmikit|lemmikki)\b/.test(strictText)) {
    return "Lemmikit";
  }

  return "";
}

export function getOfferCategoryV106(item: ZiiplyGostaOfferLike) {
  const strictOverrideV157 = getStrictGostaCategoryOverrideV157(item);
  if (strictOverrideV157) return strictOverrideV157;

  // V155:
  // First use S-kaupat's own category path fields from the provider. Only if
  // those do not map to a Ziiply bucket, fall back to the broader regex rules.
  const pathText = getFirstString(item, [
    "taxonomy",
    "categoryPath",
    "breadcrumbs",
    "hierarchy",
    "mainCategory",
    "department",
    "productGroup",
    "subCategory",
    "category",
  ]);

  const pathCategory = classifyGostaCategoryFromSPathV155(pathText);
  if (pathCategory !== "Muut") return pathCategory;

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
    "pakasteet",
    "valmisruoka",
    "kuivatuotteet",
    "makeiset",
    "makeisetkeksit",
    "makeiset ja keksit",
    "lemmikit",
    "koti",
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
  "Pakasteet",
  "Valmisruoka",
  "Kuivatuotteet",
  "Makeiset & keksit",
  "Lemmikit",
  "Koti",
  "Muut",
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
    valmisruoka: ["valmisruoka", "valmisateria", "keitto", "salaattiateria", "mikroateria", "ateria", "laatikko", "pasta", "risotto", "lastenruoka", "lastenruoat", "vauvanruoka", "piltti", "semper"],
    kuivatuotteet: ["kuivatuotteet", "pasta", "riisi", "makaroni", "spagetti", "nuudeli", "jauhot", "sokeri", "hiutaleet", "kaurahiutale", "murot", "mysli", "granola", "säilykkeet", "pavut", "linssit", "mausteet"],
    makeiset: ["karkit", "karkki", "makeinen", "makeiset", "suklaa", "suklaat", "lakritsi", "salmiakki", "pastillit", "pastilli", "purukumi", "ksylitoli", "keksi", "keksit", "keksipaketti", "haribo", "marianne", "fazer", "pandy"],
    makeisetkeksit: ["karkit", "karkki", "makeinen", "makeiset", "suklaa", "suklaat", "lakritsi", "salmiakki", "pastillit", "pastilli", "purukumi", "ksylitoli", "keksi", "keksit", "keksipaketti", "haribo", "marianne", "fazer", "pandy"],
    "makeiset ja keksit": ["karkit", "karkki", "makeinen", "makeiset", "suklaa", "suklaat", "lakritsi", "salmiakki", "pastillit", "pastilli", "purukumi", "ksylitoli", "keksi", "keksit", "keksipaketti", "haribo", "marianne", "fazer", "pandy"],
    lemmikit: ["lemmikkien ruoat", "lemmikkien ruuat", "lemmikkiruoka", "koiranruoka", "kissanruoka", "pedigree", "whiskas", "sheba", "purina", "friskies"],
    koti: ["kodinhoito", "taloustarvikkeet", "kodinhoito ja taloustarvikkeet", "vaipat", "hoitotarvikkeet", "hygienia", "koti", "pesuaine", "pyykinpesuaine", "astianpesuaine", "fairy", "wc-paperi", "talouspaperi", "siivous", "roskapussi", "leivinpaperi", "folio", "kelmu", "shampoo", "saippua", "hammastahna"],
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
      ...seedsByCategory.pakasteet,
      ...seedsByCategory.kuivatuotteet,
      ...seedsByCategory.makeiset,
      ...seedsByCategory.lemmikit,
      ...seedsByCategory.koti,
      ...seedsByCategory.muut,
    ]));
  }

  return seedsByCategory[key] ?? [];
}

export function getGostaCategoryLabelFromFilterV136(filter: string) {
  const normalized = normalizeGostaText(filter);
  if (normalized === "makeiset") return "Makeiset & keksit";
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
