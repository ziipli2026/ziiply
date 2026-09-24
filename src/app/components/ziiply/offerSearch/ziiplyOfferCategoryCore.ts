// ============================================================================
// ZIIPLY_OFFER_CATEGORY_CORE_V168_CHILD_TAXONOMY_FIX
// Revision: V168
// Date: 2026-09-19
//
// V168:
// - Korjaa "Kahvit, teet ja mehut" -yläkategorian vuodon: luokitus tehdään
//   productGroup/subCategory/category-tasolta. Kahvi + tee -> Kahvi & tee,
//   mehut/smoothiet/jääteet -> Juomat.
// - Korjaa Liha ja kasviproteiinit -luokituksen: pääkategorian sana
//   "kasviproteiinit" ei enää siirrä jauhelihaa Valmisruokaan.
// - Jauheliha, makkarat, nakit, leikkeleet, kinkut, meetvurstit, pekoni ym.
//   -> Liha & makkarat.
// - Rasvahappovalmisteet/Omega-3 sekä kauneuden hyvinvointivalmisteiden
//   kollageenituotteet -> Vitamiinit & ravinteet.
// - Ei muutoksia OfferSearchCardiin, provideriin, store-ID:hen tai debugiin.
// ============================================================================

// ============================================================================
// ZIIPLY_OFFER_CATEGORY_CORE_V167_COFFEE_MEAT_NUTRIENTS
// Revision: V167
// Date: 2026-09-19
//
// V167:
// - Kahvi + tee -> "Kahvi & tee"; S-kaupat child taxonomy wins over the broad
//   "Kahvit, teet ja mehut" parent, so juice/smoothie/iced tea stay in Juomat.
// - Liha -> "Liha & makkarat"; meat, minced meat, sausages, cold cuts, ham,
//   mettwurst and bacon are grouped here from S-kaupat taxonomy.
// - Melatonin, omega-3 and collagen are included in "Vitamiinit & ravinteet".
// - Legacy "Koti" results are normalized to "Koti & vapaa-aika".
// - Keeps V166 Lastenruoat, Hygienia & kosmetiikka, Kodinhoito and Muut logic.
// ============================================================================

// ============================================================================
// ZIIPLY_OFFER_CATEGORY_CORE_V166_EXPANDED_USER_CATEGORIES
// Revision: V166
// Date: 2026-09-19
//
// V166:
// - Lisää Lastenruoat sekä Vitamiinit & ravinteet omiksi ryhmikseen.
// - Jakaa Koti-ryhmän: Hygienia & kosmetiikka, Kodinhoito, Koti & vapaa-aika.
// - Säilyttää Muut-ryhmän aidosti sekalaisille Prisma-tarjouksille.
// - Korjaa S-kaupat-kahvit Kahvi & tee -ryhmään; mehut/smoothiet/jääteet pysyvät Juomissa.
// - Kategoriat näkyvät edelleen vain, jos aktiivisia tarjouksia löytyy.
//
// V165:
// - Palauttaa V155:n alkuperäisen periaatteen viralliselle S-kaupat/Prisma-datalle:
//   providerin categoryPath/taxonomy ratkaisee ennen title/brand-regexejä.
// - Korjaa Kahvit, teet ja mehut -hierarkian: mehut/smoothiet/jääteet -> Juomat,
//   varsinainen kahvi ja tee -> Kahvi.
// - Korjaa Pastat, riisit ja nuudelit sekä Öljyt, maustaminen ja kastikkeet
//   -> Kuivatuotteet.
// - Korjaa Kukat ja koti / Keittiö ja kattaus / Vapaa-aika -> Koti.
// - Estää Urheiluravinteet, terveys ja itsehoito -tuotteiden joutumisen
//   sattumalta Kahvi/Maito/Hevi/Kala-kategorioihin.
// - Säilyttää V157-V164:n aiemmat erityiskorjaukset fallbackeina.
// - Ei muutoksia provider-, search core-, page-, store-, GPS- tai K-koodiin.
// ============================================================================

// ============================================================================
// ZIIPLY_OFFER_CATEGORY_CORE_V164_BREAD_PRODUCT_OVERRIDES
// Revision: V164
// Date: 2026-07-14
//
// V164:
// - Pakottaa Vaasan Pehmeät kaurapalat ja muut kaurapala-tuotteet Leipomoon.
// - Pakottaa Pullava-, pitko-, täytepitko- ja voisilmäpitko-tuotteet Leipomoon.
// - Leipätuotteet voittavat ennen Makeiset & keksit -sääntöä.
//
// Muutokset:
// - Lisää Kuivatuotteet-kategorian: pasta, riisi, jauhot, sokeri, hiutaleet, murot, mysli, säilykkeet.
// - Ei erillistä Koiranruoka-kategoriaa: koiran/kissan ruoat kuuluvat Lemmikit-ryhmään.
// - Muuttaa näkyvän Makeiset-kategorian nimeksi Makeiset & keksit.
// - Lisää keksit Makeiset & keksit -ryhmään, mutta jäätelöt pysyvät Pakasteissa.
// - Säilyttää aiemmat Haribo/Hevi, Lumene/Maitotuotteet ja jäätelö/Makeiset-korjaukset.

// V161 korjaus:
// - Estää S-kaupat non-food -tuotteiden päätymisen ruokakategorioihin pelkkien yleissanojen takia.
// - SmartStore/säilytyslaatikko/muovilaatikko/paistinpannu/kattila/astia -> Koti.
// - Poistaa liian lavean "laatikko"-sanan Valmisruoasta.
// - Tiukentaa ruoka-avainsanoja sananrajoilla, jotta esim. fileeveitsi/grillitarvike ei mene Lihaan.
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


function isOfficialSKaupatOfferV165(item: ZiiplyGostaOfferLike): boolean {
  const sourceUrl = String(item?.sourceUrl ?? "").toLowerCase();
  return sourceUrl.includes("s-kaupat.fi");
}

function getOfficialSKaupatCategoryV165(item: ZiiplyGostaOfferLike): string {
  if (!isOfficialSKaupatOfferV165(item)) return "";

  const categoryText = normalizeGostaText(
    [
      item?.categoryPath,
      item?.breadcrumbs,
      item?.hierarchy,
      item?.taxonomy,
      item?.mainCategory,
      item?.department,
      item?.productGroup,
      item?.subCategory,
      item?.category,
    ]
      .filter(Boolean)
      .map(String)
      .join(" "),
  );

  const mainCategory = normalizeGostaText(item?.mainCategory || item?.department || "");
  // V169: child taxonomy must contain only actual child fields.
  // Official S-kaupat flat data repeats the top-level parent in item.category
  // (e.g. "Liha ja kasviproteiinit"). Including it here made every meat item
  // look like plant protein because the parent itself contains "kasviproteiinit".
  const childCategoryText = normalizeGostaText(
    [
      item?.productGroup,
      item?.subCategory,
    ]
      .filter(Boolean)
      .map(String)
      .join(" "),
  );
  if (!categoryText && !mainCategory) return "";

  // "Kahvit, teet ja mehut" is only the S-kaupat parent.
  // IMPORTANT: classify from child fields only, otherwise the parent word
  // "kahvit" makes every juice/smoothie/iced tea look like coffee.
  if (/\b(jaatee|jäätee|jaateet|jääteet|mehu|mehut|mehutiiviste|smoothie|smoothiet|mehushot|mehushotit|valipalajuoma|välipalajuoma|valipalajuomat|välipalajuomat|marjakeitto)\b/.test(childCategoryText)) return "Juomat";
  if (/\b(kahvit ja suodatinpaperit|kahvi|kahvit|kahvipapu|kahvipavut|suodatinjauh|suodatinjauhatuskahvi|espresso|kahvikapseli|kahvikapselit|pikakahvi|pikakahvit|kaakao|kaakaojauhe)\b/.test(childCategoryText)) return "Kahvi & tee";
  if (/\b(tee|teet|pussitee|yrttitee|hauduke|haudukkeet|teejuomajauhe|teejuomajauheet)\b/.test(childCategoryText)) return "Kahvi & tee";

  if (/\bliha ja kasviproteiinit\b/.test(mainCategory)) {
    // Only child taxonomy may identify a plant-protein product. The parent itself
    // always contains "kasviproteiinit", so using categoryText here misclassified meat.
    if (/\b(tofu|harkis|härkis|nyhtokaura|nyhtökaura|kasviproteiini|kasviproteiinit|vege|vegaan)\b/.test(childCategoryText)) return "Valmisruoka";
    return "Liha & makkarat";
  }
  if (/\bkala ja merenelavat\b|\bkala ja merenelävät\b/.test(mainCategory)) return "Kala";
  if (/\bhedelmat ja vihannekset\b|\bhedelmät ja vihannekset\b/.test(mainCategory)) return "Hevi";
  if (/\bleivat ja leivonnaiset\b|\bleivät ja leivonnaiset\b|\bleivat keksit ja leivonnaiset\b|\bleivät keksit ja leivonnaiset\b/.test(mainCategory)) return "Leipomo";
  if (/\bmaito munat ja rasvat\b|\bjuustot tofut ja kasvipohjaiset\b/.test(mainCategory)) return "Maitotuotteet";
  if (/\balkoholi ja virvoitusjuomat\b|\bvirvoitusjuomat\b/.test(mainCategory)) return "Juomat";
  if (/\bpakasteet\b/.test(mainCategory)) return "Pakasteet";
  if (/\bvalmisruoka\b|\bruokatori\b/.test(mainCategory)) return "Valmisruoka";

  if (/\bpastat riisit ja nuudelit\b|\boljyt maustaminen ja kastikkeet\b|\böljyt maustaminen ja kastikkeet\b|\btexmex ja maailman makuja\b|\bsnacksit\b/.test(mainCategory)) return "Kuivatuotteet";
  if (/\bkarkit suklaat ja keksit\b|\bkarkit ja suklaat\b/.test(mainCategory)) return "Makeiset & keksit";
  if (/\blemmikit\b/.test(mainCategory)) return "Lemmikit";

  if (/\bkosmetiikka ja hygienia\b/.test(mainCategory)) return "Hygienia & kosmetiikka";
  if (/\bkodinhoito ja taloustarvikkeet\b/.test(mainCategory)) return "Kodinhoito";
  if (/\bkukat ja koti\b|\bkeittio ja kattaus\b|\bkeittiö ja kattaus\b|\bvapaa aika\b/.test(mainCategory)) return "Koti & vapaa-aika";

  if (/\blapset\b/.test(mainCategory)) {
    if (/\blastenruo|\bvauvanruo|\blasten puuro|\bpuuro|\bvelli|\bvalipala|\bvälipala|\bnaksut|\bpatukat|\bsose|\blastentuote/.test(categoryText)) return "Lastenruoat";
    if (/\bvaippa|\bhoitotarvik|\blastentarvik/.test(categoryText)) return "Hygienia & kosmetiikka";
    return "Muut";
  }

  if (/\burheiluravinteet terveys ja itsehoito\b/.test(mainCategory)) {
    const healthText = normalizeGostaText(
      [
        childCategoryText,
        item?.title,
        item?.name,
        item?.productName,
        item?.brandName,
      ]
        .filter(Boolean)
        .map(String)
        .join(" "),
    );

    if (/\bvitami|\bmineraali|\bkivennais|\bmagnesium|\bsinkki|\brauta|\bravintolisa|\bravintolisä|\bproteiini|\benergia.?patukka|\bproteiinipatukka|\burheiluravinne|\baminohapp|\bkreatiini|\belektrolyytti|\bmelatoniini|\bomega.?3|\bkollageeni|\bcollagen|\brasvahappovalmiste|\bkalaoljyvalmiste|\bkalaöljyvalmiste|\bkauneuden hyvinvointivalmiste/.test(healthText)) return "Vitamiinit & ravinteet";
    return "Muut";
  }

  return "";
}

function classifyGostaCategoryFromSPathV155(rawText: string) {
  const text = normalizeGostaText(rawText);
  if (!text) return "Muut";

  // Use S-kaupat's own top-level category path first. This avoids false
  // positives from product names, brands or benefit text.
  if (/^liha-ja-kasviproteiinit\b|\/ liha ja kasviproteiinit\b|\bliha ja kasviproteiinit\b/.test(text)) return "Liha & makkarat";
  if (/^kala-ja-merenelavat\b|^kala-ja-merenelävät\b|\/ kala ja merenelavat\b|\/ kala ja merenelävät\b|\bkala ja merenelavat\b|\bkala ja merenelävät\b/.test(text)) return "Kala";
  if (/^hedelmat-ja-vihannekset\b|^hedelmät-ja-vihannekset\b|\/ hedelmat ja vihannekset\b|\/ hedelmät ja vihannekset\b|\bhedelmat ja vihannekset\b|\bhedelmät ja vihannekset\b/.test(text)) return "Hevi";
  if (/^leivat-keksit-ja-leivonnaiset\b|^leivät-keksit-ja-leivonnaiset\b|\/ leivat keksit ja leivonnaiset\b|\/ leivät keksit ja leivonnaiset\b|\bleivat keksit ja leivonnaiset\b|\bleivät keksit ja leivonnaiset\b/.test(text)) return "Leipomo";
  if (/^maito-munat-ja-rasvat\b|\/ maito munat ja rasvat\b|\bmaito munat ja rasvat\b/.test(text)) return "Maitotuotteet";
  if (/^juustot-tofut-ja-kasvipohjaiset\b|\/ juustot tofut ja kasvipohjaiset\b|\bjuustot tofut ja kasvipohjaiset\b/.test(text)) return "Maitotuotteet";
  if (/^kahvit-teet-ja-mehut\b|\/ kahvit teet ja mehut\b|\bkahvit teet ja mehut\b/.test(text)) return "Kahvi & tee";
  if (/^alkoholi-ja-virvoitusjuomat\b|\/ alkoholi ja virvoitusjuomat\b|\balkoholi ja virvoitusjuomat\b|^virvoitusjuomat\b/.test(text)) return "Juomat";
  if (/^pakasteet\b|\/ pakasteet\b|\bpakasteet\b/.test(text)) return "Pakasteet";
  if (/^valmisruoka\b|\/ valmisruoka\b|\bvalmisruoka\b/.test(text)) return "Valmisruoka";
  if (/^kuivatuotteet\b|\/ kuivatuotteet\b|\bkuivatuotteet\b|^pasta-riisi-ja-aterian-lisukkeet\b|\b pasta riisi ja aterian lisukkeet\b|^sailykkeet\b|^säilykkeet\b|^jauhot-ja-leivonta\b|\bjauhot ja leivonta\b|^murot-myslit-ja-hiutaleet\b|\bmurot myslit ja hiutaleet\b/.test(text)) return "Kuivatuotteet";
  if (/^karkit-ja-suklaat\b|\/ karkit ja suklaat\b|\bkarkit ja suklaat\b/.test(text)) return "Makeiset & keksit";
  if (/^lemmikit\b|^lemmikkien-ruoat-ja-tarvikkeet\b|^lemmikkien-ruuat-ja-tarvikkeet\b|\/ lemmikit\b|\blemmikit\b|\blemmikkien ruoat ja tarvikkeet\b|\blemmikkien ruuat ja tarvikkeet\b/.test(text)) return "Lemmikit";

  // Baby food is food; diapers/care products are Koti.
  if (/^lapset\/lastenruoat\b|\/ lastenruoat\b|\blastenruoat\b|\blastenruoka\b|\bvauvanruoka\b|\bvauvanruoat\b/.test(text)) return "Valmisruoka";

  if (/^kodinhoito-ja-taloustarvikkeet\b|\/ kodinhoito ja taloustarvikkeet\b|\bkodinhoito ja taloustarvikkeet\b|^taloustarvikkeet\b|^hygienia\b/.test(text)) return "Koti & vapaa-aika";

  return "Muut";
}

function classifyGostaCategoryFromText(rawText: string) {
  const text = normalizeGostaText(rawText);

  // V157: strict non-produce/non-dairy buckets first. These must win before
  // Hevi/Maitotuotteet because S-kaupat/search metadata can contain words like
  // hedelmä, marja, milk or cream inside candy/cosmetic products.
  if (/lemmikkien ruuat ja tarvikkeet|lemmikkien ruoat ja tarvikkeet|lemmikki|lemmik|koira|kissa|pedigree|whiskas|sheba|purina|friskies|perfect fit|best friend/.test(text)) return "Lemmikit";

  if (/kodinhoito ja taloustarvikkeet|kodinhoito|taloustarvikkeet|vaippa|vaipat|hoitotarvikkeet|pampers|libero|lastenhoito|pesu|pyykin|pyykinpesu|fairy|astianpesu|wc|siivous|talouspaperi|vessa|roskapussi|leivinpaperi|folio|kelmu|hygienia|shampoo|saippua|hammastahna|hammasharja|lumene|nivea|dove|kasvovoide|kosteusvoide|paivavoide|päivävoide|yovoide|yövoide|ihonhoito|kosmetiikka|meikki|seerumi|deodorantti|smartstore|sailytyslaatikko|säilytyslaatikko|sailytysrasia|säilytysrasia|muovilaatikko|muovirasia|rasia|astia|paistinpannu|pannu|kattila|kasari|keittio|keittiö|grillipannu/.test(text)) return "Koti & vapaa-aika";

  // V159: Pakasteet must win before Makeiset. Ice creams often contain
  // words such as suklaa/lakritsi in the product name, but the real bucket is Pakasteet.
  if (/pakasteet|pakaste|jaatel|jäätel|ice cream|pingviini|kingis|magnum|ben jerry|ben and jerry|pizza|ranskalaiset|wokvihannes|pakastevihannes|pakastemarja/.test(text)) return "Pakasteet";

  if (/karkit ja suklaat|suklaa|karkki|karkit|hedelmakarkki|hedelmäkarkki|makeinen|makeiset|lakritsi|salmiakki|pastilli|purukumi|ksylitoli|haribo|click mix|marianne|fazer|pandy/.test(text)) return "Makeiset & keksit";

  // V154: baby food is food, not Koti. Diapers/care products still stay in Koti.
  if (/lastenruoka|lastenruoat|vauvanruoka|vauvanruoat|baby food|piltti|bonan|semper|lasten sose|vauvan sose/.test(text)) return "Lastenruoat";
  if (/valmisruoka|valmisateria|mikroateria|salaattiateria|pasta ateria|keitto|keitot|ruokaisa salaatti|ateria|ateriat|kiusaus|makaronilaatikko|kaalilaatikko|perunalaatikko|porkkanalaatikko|lanttulaatikko/.test(text)) return "Valmisruoka";

  if (/kuivatuotteet|pasta|riisi|nuudeli|makaroni|spagetti|jauho|jauhot|sokeri|hiutale|hiutaleet|kaurahiutale|muro|murot|mysli|granola|sailyke|säilyke|tonnikalasailyke|tonnikalasäilyke|papu|pavut|linssi|linssit|kastikejauhe|mauste|mausteet|leivonta/.test(text)) return "Kuivatuotteet";

  if (/liha ja kasviproteiinit|liha|jauheliha|kana|broiler\w*|possu|porsas|nauta|sika|makkara\w*|leikkele\w*|kinkku|pekoni|filee|paisti|lihapulla\w*|kasviproteiini|tofu|nyhtokaura|harkis|vege/.test(text)) return "Liha & makkarat";
  if (/kala ja merenelavat|kala ja merenelävät|merenelav|mereneläv|kirjolohi|lohi|tonnikala|silakka|katkarapu|kuha|ahven|seiti|kalapuikko|silli|kala/.test(text)) return "Kala";
  if (/leivat keksit ja leivonnaiset|leivät keksit ja leivonnaiset|kaurapala|kaurapalat|pullava|voisilmapitko|voisilmäpitko|taytepitko|täytepitko|pitko|pitkot|leipa|leipä|sampyl|sämpyl|pulla|croissant|karjalanpiir|pita|patonki|ruis|paahtoleipa|paahtoleipä|donitsi|leivonnainen/.test(text)) return "Leipomo";
  if (/maito munat ja rasvat|maito|kananmuna|munat|jugur|jogur|jogurt|rahka|raejuusto|juusto|voi|margariini|rasva|kerma|piima|viili|kefiiri|proteiinivanukas|vanukas/.test(text)) return "Maitotuotteet";
  if (/juustot tofut ja kasvipohjaiset|juusto|tofu|kasvipohjainen|kaurajuoma|soijajuoma|vegejuusto/.test(text)) return "Maitotuotteet";
  if (/\bkahvi\b|\bkahvit\b|\btee\b|\bteet\b|espresso|suodatinjauh|kahvipapu|papukahvi|cappuccino|latte/.test(text)) return "Kahvi & tee";
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

  // V164: clear bread and sweet bakery products must win before generic
  // cookie/candy words from provider taxonomy.
  if (/\b(kaurapala|kaurapalat|pullava|voisilmapitko|voisilmäpitko|taytepitko|täytepitko|pitko|pitkot|saaristolaisnappi|saaristolaisleipa|saaristolaisleipä|ruisleipa|ruisleipä|ruispalat|ruispala|limppu|vuokaleipa|vuokaleipä|paahtoleipa|paahtoleipä|patonki|sampyla|sämpylä|karjalanpiirakka|reissumies|jalkiuuni|jälkiuuni)\b/.test(strictText)) {
    return "Leipomo";
  }

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
    return "Koti & vapaa-aika";
  }

  if (/\b(pedigree|whiskas|sheba|purina|friskies|perfect fit|best friend|koiranruoka|kissanruoka|lemmikkiruoka|lemmikit|lemmikki)\b/.test(strictText)) {
    return "Lemmikit";
  }

  return "";
}


const TRUSTED_PROVIDER_CATEGORY_LABELS_V162 = new Map<string, string>([
  ["kahvi", "Kahvi & tee"],
  ["kahvi ja tee", "Kahvi & tee"],
  ["lastenruoat", "Lastenruoat"],
  ["vitamiinit ravinteet", "Vitamiinit & ravinteet"],
  ["hygienia kosmetiikka", "Hygienia & kosmetiikka"],
  ["kodinhoito", "Kodinhoito"],
  ["koti vapaa aika", "Koti & vapaa-aika"],
  ["maitotuotteet", "Maitotuotteet"],
  ["liha", "Liha & makkarat"],
  ["kala", "Kala"],
  ["leipomo", "Leipomo"],
  ["hevi", "Hevi"],
  ["juomat", "Juomat"],
  ["pakasteet", "Pakasteet"],
  ["valmisruoka", "Valmisruoka"],
  ["kuivatuotteet", "Kuivatuotteet"],
  ["makeiset", "Makeiset & keksit"],
  ["makeiset ja keksit", "Makeiset & keksit"],
  ["makeiset keksit", "Makeiset & keksit"],
  ["lemmikit", "Lemmikit"],
  ["koti", "Koti"],
  ["muut", "Muut"],
]);

function getTrustedProviderCategoryV162(item: ZiiplyGostaOfferLike): string {
  const providerCategoryValues = [
    item?.category,
    item?.mainCategory,
    item?.productGroup,
    item?.department,
  ];

  for (const value of providerCategoryValues) {
    const normalized = normalizeGostaText(value)
      .replace(/\bja\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const trusted = TRUSTED_PROVIDER_CATEGORY_LABELS_V162.get(normalized);
    if (trusted) return trusted;
  }

  return "";
}

export function getOfferCategoryV106(item: ZiiplyGostaOfferLike) {
  // V165: official S-kaupat/Prisma taxonomy wins before title/brand overrides.
  const officialSKaupatCategoryV165 = getOfficialSKaupatCategoryV165(item);
  if (officialSKaupatCategoryV165) return officialSKaupatCategoryV165;

  // V162: trust an explicit normalized provider category before any title regex.
  // This prevents products such as "Nordqvist Jäätee" from changing
  // from provider category Juomat to Kahvi merely because the title contains "tee".
  const trustedProviderCategoryV162 = getTrustedProviderCategoryV162(item);
  if (trustedProviderCategoryV162) return trustedProviderCategoryV162;

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
    "kahvi ja tee",
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
    "lastenruoat",
    "vitamiinit ravinteet",
    "lemmikit",
    "hygienia kosmetiikka",
    "kodinhoito",
    "koti vapaa aika",
    "koti",
    "muut",
  ].includes(normalizeGostaText(filter));
}

export const GOSTA_CATEGORY_LABELS_V136 = [
  "Kaikki",
  "Kahvi & tee",
  "Maitotuotteet",
  "Liha & makkarat",
  "Kala",
  "Leipomo",
  "Hevi",
  "Juomat",
  "Pakasteet",
  "Valmisruoka",
  "Kuivatuotteet",
  "Makeiset & keksit",
  "Lastenruoat",
  "Vitamiinit & ravinteet",
  "Lemmikit",
  "Hygienia & kosmetiikka",
  "Kodinhoito",
  "Koti & vapaa-aika",
  "Muut",
];

export function getGostaCategorySeedQueriesV136(categoryOrFilter: string) {
  const key = normalizeGostaText(categoryOrFilter);

  const seedsByCategory: Record<string, string[]> = {
    kahvi: ["kahvi", "tee", "espresso", "suodatinjauhettu kahvi", "kahvipapu", "juhla mokka", "presidentti"],
    maitotuotteet: ["maito", "munat", "kananmuna", "juusto", "jogurtti", "rahka", "raejuusto", "voi", "margariini", "kerma", "viili", "kefiiri", "vanukas", "kaurajuoma"],
    liha: ["liha", "liha ja kasviproteiinit", "jauheliha", "kana", "broileri", "nauta", "possu", "porsas", "sika", "makkara", "grillimakkara", "leikkele", "kinkku", "pekoni", "filee", "lihapulla", "kasviproteiini", "tofu"],
    kala: ["kala", "kala ja merenelävät", "lohi", "kirjolohi", "tonnikala", "silakka", "katkarapu", "seiti", "kalapuikko", "silli"],
    leipomo: ["leipä", "leivät", "sämpylä", "pulla", "pullava", "pitko", "täytepitko", "voisilmäpitko", "kaurapala", "kaurapalat", "croissant", "karjalanpiirakka", "patonki", "ruisleipä", "paahtoleipä", "leivonnaiset"],
    hevi: ["hedelmät", "vihannekset", "hedelmä", "omena", "banaani", "appelsiini", "vihannes", "tomaatti", "kurkku", "salaatti", "peruna", "sipuli", "porkkana", "marjat"],
    juomat: ["virvoitusjuomat", "mehu", "limu", "cola", "energiajuoma", "vesi", "kivennäisvesi", "smoothie", "kahvit teet ja mehut"],
    valmisruoka: ["valmisruoka", "valmisateria", "keitto", "salaattiateria", "mikroateria", "ateria", "makaronilaatikko", "kaalilaatikko", "porkkanalaatikko", "pasta", "risotto"],
    kuivatuotteet: ["kuivatuotteet", "pasta", "riisi", "makaroni", "spagetti", "nuudeli", "jauhot", "sokeri", "hiutaleet", "kaurahiutale", "murot", "mysli", "granola", "säilykkeet", "pavut", "linssit", "mausteet"],
    makeiset: ["karkit", "karkki", "makeinen", "makeiset", "suklaa", "suklaat", "lakritsi", "salmiakki", "pastillit", "pastilli", "purukumi", "ksylitoli", "keksi", "keksit", "keksipaketti", "haribo", "marianne", "fazer", "pandy"],
    makeisetkeksit: ["karkit", "karkki", "makeinen", "makeiset", "suklaa", "suklaat", "lakritsi", "salmiakki", "pastillit", "pastilli", "purukumi", "ksylitoli", "keksi", "keksit", "keksipaketti", "haribo", "marianne", "fazer", "pandy"],
    "makeiset ja keksit": ["karkit", "karkki", "makeinen", "makeiset", "suklaa", "suklaat", "lakritsi", "salmiakki", "pastillit", "pastilli", "purukumi", "ksylitoli", "keksi", "keksit", "keksipaketti", "haribo", "marianne", "fazer", "pandy"],
    lastenruoat: ["lastenruoka", "lastenruoat", "vauvanruoka", "vauvanruoat", "sose", "velli", "lasten puuro", "piltti", "semper"],
    "vitamiinit ravinteet": ["vitamiini", "ravintolisä", "mineraali", "magnesium", "sinkki", "rauta", "proteiinipatukka", "urheiluravinne"],
    "hygienia kosmetiikka": ["kosmetiikka", "hygienia", "shampoo", "saippua", "hammastahna", "deodorantti", "ihonhoito", "vaipat"],
    kodinhoito: ["kodinhoito", "taloustarvikkeet", "pesuaine", "pyykinpesuaine", "astianpesuaine", "wc-paperi", "talouspaperi", "siivous", "roskapussi"],
    "koti vapaa aika": ["kukat", "koti", "keittiö", "kattaus", "vapaa-aika", "ruukku", "kynttilä"],
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
      ...seedsByCategory.lastenruoat,
      ...seedsByCategory["vitamiinit ravinteet"],
      ...seedsByCategory.lemmikit,
      ...seedsByCategory["hygienia kosmetiikka"],
      ...seedsByCategory.kodinhoito,
      ...seedsByCategory["koti vapaa aika"],
      ...seedsByCategory.koti,
      ...seedsByCategory.muut,
    ]));
  }

  return seedsByCategory[key] ?? [];
}

export function getGostaCategoryLabelFromFilterV136(filter: string) {
  const normalized = normalizeGostaText(filter);
  const aliases: Record<string, string> = {
    "kahvi ja tee": "Kahvi & tee",
    "maitotuotteet ja munat": "Maitotuotteet",
    "liha ja kasviproteiinit": "Liha & makkarat",
    "leipa ja leivonnaiset": "Leipomo",
    "hedelmat ja vihannekset": "Hevi",
    "valmisruoat": "Valmisruoka",
    "kuivatuotteet ja ruoanlaitto": "Kuivatuotteet",
    "makeiset": "Makeiset & keksit",
  };
  if (aliases[normalized]) return aliases[normalized];
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
