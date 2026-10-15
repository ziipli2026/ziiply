import { neon } from "@neondatabase/serverless";

// Exact EAN matches only. Neon is authoritative over legacy title heuristics.
const labels = new Set(["Kahvi & tee","Maitotuotteet","Liha & makkarat","Kala","Leipomo","Hevi","Juomat","Pakasteet","Valmisruoka","Kuivatuotteet","Makeiset & keksit","Lastenruoat","Lastenhoito","Vitamiinit & ravinteet","Lemmikit","Hygienia & kosmetiikka","Kodinhoito","Koti & vapaa-aika","Muut"]);
export function neonOfferDisplayCategory(category: string): string | null {
  const raw = category.trim();
  // Generic "Muut" is not reliable enough to override a specific provider classification.
  if (raw === "Muut") return null;
  if (labels.has(raw)) return raw;
  // Neon also stores newer provider-specific display labels and opaque category IDs.
  // Map known labels explicitly; opaque IDs need a taxonomy lookup, not a guess.
  const aliases: Record<string, string> = {
    "Käyttötavarat": "Koti & vapaa-aika",
    "Liha": "Liha & makkarat",
    "Kauneus ja hygienia": "Hygienia & kosmetiikka",
    "Leipä ja leivonnaiset": "Leipomo",
    "Makeiset": "Makeiset & keksit",
    "Valmisruoat": "Valmisruoka",
    "Hyvinvointi ja ravintolisät": "Vitamiinit & ravinteet",
    "Ravintolisät": "Vitamiinit & ravinteet",
    "Hedelmät ja vihannekset": "Hevi",
    "Kala ja äyriäiset": "Kala",
    "Juustot": "Maitotuotteet",
    "Mausteet ja kastikkeet": "Kuivatuotteet",
    "Hygienia": "Hygienia & kosmetiikka",
    "Leivonnaiset": "Leipomo",
    "Snacksit": "Kuivatuotteet",
    "Kastikkeet ja levitteet": "Kuivatuotteet",
    "Leivonta": "Kuivatuotteet",
    "Kahvi": "Kahvi & tee",
    "Keksit": "Makeiset & keksit",
    "Levitteet": "Maitotuotteet",
    "Aamiaistuotteet": "Kuivatuotteet",
    "Juustot ja maitotuotteet": "Maitotuotteet",
    "Makkarat ja leikkeleet": "Liha & makkarat",
    "Säilykkeet": "Kuivatuotteet",
    "Leikkeleet": "Liha & makkarat",
    "Pähkinät": "Kuivatuotteet",
    "Kananmunat": "Maitotuotteet",
    "Välipalapatukat": "Makeiset & keksit",
    "sokeroimattomat mehujuomat": "Juomat",
  };
  if (aliases[raw]) return aliases[raw];
  if (/^CA[A-Z]{8,}$/.test(raw)) return null;
  const path = raw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
  const parts = path.split("/").filter(Boolean);
  if (!parts.length) return null;
  const leaf = parts[parts.length - 1];
  const parent = parts[0];
  // Specific child group wins over a broad parent (coffee/juice, fish/ready meals).
  if (/kahvi|suodatinpuss|teejuom|teet$|tee$/.test(parts.slice(1).join("/"))) return "Kahvi & tee";
  if (/mehu|smoothie|virvoitus|cola|limonadi|energiajuom|kivennaisves|vesipull|oluet|siider/.test(leaf)) return "Juomat";
  if (/kala|lohi|silak|muik|katkarap|merenelav|kalatiski/.test(leaf)) return "Kala";
  if (/lastenruo|vauvanruo|lastenvalipal|vellit|lastensose/.test(path)) return "Lastenruoat";
  if (/vaip|lastenhoito/.test(path)) return "Lastenhoito";
  if (/vitamiin|ravintolis|kivennaisain|omega|proteiinivalmiste|urheiluvalmiste|terveysvalmiste/.test(path)) return "Vitamiinit & ravinteet";
  if (/valipalakeks|valipalapatuk|keks|pikkuleiv/.test(leaf)) return "Makeiset & keksit";
  if (/lastenruoat/.test(path)) return "Lastenruoat";
  if (/sips|snacks|naposteltav|popcorn|nacho/.test(path)) return "Kuivatuotteet";
  if (/jaatelo|pakaste/.test(path)) return "Pakasteet";
  if (/juomat\/kahvi/.test(path)) return "Kahvi & tee";
  if (/juomat/.test(parent)) return "Juomat";
  if (/kala|merenelav/.test(parent)) return "Kala";
  if (/leivat|leipa|leivonnais/.test(parent)) return "Leipomo";
  if (/liha|kasviproteiin/.test(parent)) return "Liha & makkarat";
  if (/hedelmat|vihannekset|hevi/.test(parent)) return "Hevi";
  if (/maito|juusto|munat|rasvat/.test(parent)) return "Maitotuotteet";
  if (/valmisruo/.test(parent)) return "Valmisruoka";
  if (/pastat|riisit|nuudelit|mausteet|sailykkeet|kuivatuotteet|kuivat-elintarvikkeet|leivonta/.test(parent)) return "Kuivatuotteet";
  if (/makeiset|karkit|suklaat/.test(parent)) return "Makeiset & keksit";
  if (/lemmik/.test(parent)) return "Lemmikit";
  if (/hygienia|kosmetiikka|kauneus/.test(parent)) return "Hygienia & kosmetiikka";
  if (/kodinhoito|siivous/.test(parent)) return "Kodinhoito";
  if (/koti|kayttotavarat|vapaa-aika/.test(parent)) return "Koti & vapaa-aika";
  if (/mausteet-ja-maustaminen|kastikkeet/.test(parent)) return "Kuivatuotteet";
  return null; // Unknown detailed categories must not be guessed.
}
// Only return detailed paths that are already present in the Neon product registry.
// Ambiguous products intentionally remain uncategorized for review.
function inferExistingCategoryFromName(name: string): string | null {
  const text = name.toLocaleLowerCase("fi").normalize("NFKC").split(" ").filter(Boolean).join(" ").trim();
  const rules: Array<{ terms: string[]; category: string }> = [
    { terms: ["hammastahna", "toothpaste"], category: "kosmetiikka-terveys-ja-hygienia/suunhoito/hammastahnat" },
    { terms: ["suihkusaippua", "suihkugeeli", "shower gel", "shower cream"], category: "kosmetiikka-terveys-ja-hygienia/vartalonhoito/suihkusaippuat" },
    { terms: ["eyeliner", "maskara", "meikkipuikko", "meikkivoide", "huulipuna"], category: "kosmetiikka-terveys-ja-hygienia/meikit/kasvomeikit" },
    { terms: ["hiuskiinne", "hairspray", "rakennesuihke", "dry texture spray", "lämpösuoja", "heat protection", "volyymivaahto", "root boost mousse"], category: "kosmetiikka-terveys-ja-hygienia/hiukset-ja-hiustenhoito/hiusten-muotoilutuotteet" },
    { terms: ["aitokanerva", "ruukkukanerva", "ruukkukasvi"], category: "koti-ja-vapaa-aika/kukat-ja-kasvit/ruukkukasvit" },
    { terms: ["leikkokukka", "kukkakimppu", "kimppu"], category: "koti-ja-vapaa-aika/kukat-ja-kasvit/leikkokukat-ja-kimput" },
    { terms: ["muikku", "kirjolohifilee", "savusiika", "tuore kala", "lohifilee", "kalafilee"], category: "kala-ja-merenelavat/kala/tuore-kala" },
    { terms: ["mehujuoma", "kerta-annosmehu"], category: "juomat/mehut/kerta-annosmehut" },
    { terms: ["mausteseos", "spice mix"], category: "mausteet-ja-maustaminen/mausteet/pussit" },
    { terms: ["käsiastianpesuaine", "kasiastianpesuaine", "astianpesuaine"], category: "kodinhoito-ja-taloustarvikkeet/astianpesu/kasiastianpesuaineet" },
    { terms: ["makeissekoitus", "makesissekoitus"], category: "karkit-suklaat-ja-keksit/karkkipussit/hedelma-ja-makeissekoituspussit" },
    { terms: ["taco sauce", "tacokastike"], category: "mausteet-ja-maustaminen/majoneesit-maustekastikkeet-ja-tahnat/majoneesit-maustekastikkeet-ja-tahnat" },
    { terms: ["spice mix"], category: "mausteet-ja-maustaminen/mausteet/pussit" },
    { terms: ["nacho chips"], category: "texmex-ja-maailman-makuja/maissilastut-ja-nachot/maustamattomat-lastut" },
    { terms: ["granola"], category: "kuivat-elintarvikkeet-ja-leivonta/murot-ja-myslit/myslit" },
    { terms: ["minuuttipihvi maustamaton"], category: "liha-ja-kasviproteiinit/broileri-kana-ja-kalkkuna/fileet-pihvit-ja-rullat" },
    { terms: ["taco shells", "tacokuoret", "mini taco tubs"], category: "texmex-ja-maailman-maut/texmex/texmex-lisukkeet" },
    { terms: ["tex mex salsa dip", "dip nacho cheese", "dip tex mex", "dippi jalapeñoilla", "chipotle chili mayo", "creamy garlic mayo", "lime & jalapeño mayo", "salsa dip medium", "green jalapeño"], category: "texmex-ja-maailman-maut/texmex/texmex-kastikkeet" },
    { terms: ["jasmiiniriisi"], category: "pastat-riisit-ja-nuudelit/riisit/riisit" },
    { terms: ["haarukkavatkain", "paistinlasta"], category: "koti-ja-vapaa-aika/keittio-ja-ruokailu/keittiovalineet" },
    { terms: ["scanpot alusvati", "scanpot saviruukku"], category: "koti-ja-vapaa-aika/kukat-ja-kasvit/ruukut-ja-istutusastiat" },
    { terms: ["snö of sweden"], category: "koti-ja-vapaa-aika/asusteet-ja-korut/korut" },
    { terms: ["lanka nalle raita"], category: "koti-ja-vapaa-aika/kasityot/neulelangat" },
    { terms: ["kookosöljy", "rypsiöljy"], category: "oljyt-etikat-ja-salaattikastikkeet/oljyt/erikoisoljyt" },
    { terms: ["maalaispossun maustettu uunifilee", "iberico"], category: "liha-ja-kasviproteiinit/porsas/fileet-kyljykset-ja-pihvit" },
    { terms: ["mannafrutti"], category: "maito-juusto-munat-ja-rasvat/maitotuotteet/vanukkaat-ja-välipalat" },
    { terms: ["mentos discovery"], category: "karkit-suklaat-ja-keksit/karkkipussit/pastillit-ja-purukumit" },
    { terms: ["shield & shape", "rakennesuihke", "hiuskiinne", "hairspray", "dry texture spray"], category: "kosmetiikka-terveys-ja-hygienia/hiukset-ja-hiustenhoito/hiusten-muotoilutuotteet" },
    { terms: ["antiseptinen suihke", "q10 ubikinoni", "dekspantenoli nenäsuihke"], category: "kosmetiikka-terveys-ja-hygienia/terveysvalmisteet/muut-terveysvalmisteet" },
    { terms: ["talouspaperi"], category: "kodinhoito-ja-taloustarvikkeet/kodin-paperit/talouspaperit" },
  ];
  for (const rule of rules) {
    if (rule.terms.some(term => text.includes(term))) return rule.category;
  }
  return null;
}

export async function enrichOfferCategoriesFromNeon<T extends Record<string, any>>(offers: T[]): Promise<T[]> {
  const url = process.env.DATABASE_URL;
  if (!url || !offers.length) return offers;
  const getEan = (o: T) => [o.ean, o.gtin, o.eanCode, o.barcode].map(value => String(value ?? "").trim()).find(value => /^\d{8,14}$/.test(value)) || "";
  const getName = (o: T) => String(o.title || o.name || "").trim();
  const eans = [...new Set(offers.map(getEan).filter(e => /^\d{8,14}$/.test(e)))];
  // Exact names only: no fuzzy matches that might confuse package sizes.
  const names = [...new Set(offers.map(getName).filter(n => n.length >= 6 && n.length <= 300))];
  if (!eans.length && !names.length) return offers;
  try {
    const sql = neon(url);
    const eanRows = eans.length ? await sql`SELECT ean, category FROM ziiply_ean_products WHERE ean = ANY(${eans}::text[]) AND category IS NOT NULL AND category <> ''` : [];
    const nameRows = names.length ? await sql`SELECT name, category FROM ziiply_ean_products WHERE lower(name) = ANY(${names.map(n => n.toLocaleLowerCase("fi"))}::text[]) AND category IS NOT NULL AND category <> ''` : [];
    // Register reliable offer EANs without overwriting existing product records.
    const knownRows = eans.length ? await sql`SELECT ean FROM ziiply_ean_products WHERE ean = ANY(${eans}::text[])` : [];
    const knownEans = new Set(knownRows.map(row => String(row.ean)));
    const missing = new Map<string, {name:string; brand:string|null; quantity:string|null; image:string|null}>();
    for (const offer of offers) {
      const ean = getEan(offer);
      const name = getName(offer);
      if (!ean || knownEans.has(ean) || missing.has(ean) || name.length < 3 || name.length > 300) continue;
      if (/^(tuntematon|unknown|tuote|product)$/i.test(name)) continue;
      const clean = (value: unknown, max: number) => {
        const valueText = typeof value === "string" ? value.trim() : "";
        return valueText && valueText.length <= max ? valueText : null;
      };
      const image = clean(offer.imageUrl || offer.image_url, 2000);
      missing.set(ean, {name, brand:clean(offer.brand,150), quantity:clean(offer.quantity || offer.packageSize,100), image:image && /^https:\/\//i.test(image) ? image : null});
    }
    if (missing.size) {
      try {
        const payload = JSON.stringify([...missing].map(([ean, item]) => ({ean, ...item})));
        await sql`INSERT INTO ziiply_ean_products (ean, name, brand, quantity, image_url, source)
          SELECT p.ean, p.name, p.brand, p.quantity, p.image, 'offer-search'
          FROM jsonb_to_recordset(${payload}::jsonb) AS p(ean text, name text, brand text, quantity text, image text)
          ON CONFLICT (ean) DO NOTHING`;
      } catch (error) {
        console.error("[offers] EAN registration failed; continuing offer search", error);
      }
    }
    // Conservative enrichment: infer a detailed Neon path only from unambiguous
    // normalized product names already categorized in the live EAN registry.
    // Never replace a populated category or invent a new taxonomy path.
    const normalizeName = (name: string) => name.toLocaleLowerCase("fi").normalize("NFKC").replace(/\s+/g, " ").trim();
    const unresolvedNames = [...new Set(offers.filter(offer => {
      const ean = getEan(offer);
      return ean && !eanRows.some(row => String(row.ean) === ean);
    }).map(offer => normalizeName(getName(offer))).filter(name => name.length >= 6 && name.length <= 300))];
    if (unresolvedNames.length) {
      try {
        const candidates = await sql`SELECT lower(regexp_replace(trim(name), '[[:space:]]+', ' ', 'g')) AS normalized_name,
          min(category) AS category, count(DISTINCT category) AS category_count
          FROM ziiply_ean_products
          WHERE lower(regexp_replace(trim(name), '[[:space:]]+', ' ', 'g')) = ANY(${unresolvedNames}::text[])
            AND category LIKE '%/%'
          GROUP BY 1 HAVING count(DISTINCT category) = 1`;
        const safe = new Map(candidates.map(row => [String(row.normalized_name), String(row.category)]));
        const updates: Array<{ean: string; category: string}> = [];
        const seen = new Set<string>();
        for (const offer of offers) {
          const ean = getEan(offer);
          const name = getName(offer);
          const category = safe.get(normalizeName(name)) || inferExistingCategoryFromName(name);
          if (!ean || !category || seen.has(ean) || eanRows.some(row => String(row.ean) === ean)) continue;
          updates.push({ean, category});
          seen.add(ean);
        }
        if (updates.length) {
          const payload = JSON.stringify(updates);
          await sql`UPDATE ziiply_ean_products AS p SET category = u.category, updated_at = now()
            FROM jsonb_to_recordset(${payload}::jsonb) AS u(ean text, category text)
            WHERE p.ean = u.ean AND (p.category IS NULL OR trim(p.category) = '')`;
          for (const item of updates) eanRows.push({ean:item.ean,category:item.category});
        }
      } catch (error) {
        console.error("[offers] Conservative Neon category enrichment failed", error);
      }
    }
    // Resolve verified opaque provider codes through the Neon mapping table.
    // Preserve original registry values; only the offer response uses the readable path.
    const codes = [...new Set([...eanRows, ...nameRows].map(row => String(row.category)).filter(category => /^CA[A-Z]{8,}$/.test(category)))];
    if (codes.length) {
      try {
        const mappings = await sql`SELECT code, category_path FROM ziiply_category_code_mappings WHERE code = ANY(${codes}::text[]) AND evidence_count >= 2`;
        const resolved = new Map(mappings.map(row => [String(row.code), String(row.category_path)]));
        for (const row of [...eanRows, ...nameRows]) {
          const path = resolved.get(String(row.category));
          if (path) row.category = path;
        }
      } catch (error) {
        console.error("[offers] Neon category code mapping unavailable", error);
      }
    }
    const byEan = new Map(eanRows.map(row => [String(row.ean), String(row.category)]));
    const byName = new Map<string, string | null>();
    for (const row of nameRows) {
      const key = String(row.name).trim().toLocaleLowerCase("fi");
      const category = String(row.category);
      const previous = byName.get(key);
      if (previous !== undefined && previous !== category) byName.set(key, null);
      else if (previous === undefined) byName.set(key, category);
    }
    return offers.map(offer => {
      const ean = getEan(offer);
      const exactPath = byEan.get(ean) || byName.get(getName(offer).toLocaleLowerCase("fi"));
      const matchType = byEan.has(ean) ? "ean" : exactPath ? "exact-name" : null;
      const display = exactPath ? neonOfferDisplayCategory(exactPath) : null;
      return display ? {...offer, neonCategoryPath: exactPath, neonDisplayCategory: display, neonCategoryMatch: matchType} : offer;
    });
  } catch (error) {
    console.error("[offers] Neon category lookup failed; preserving provider categories", error);
    return offers;
  }
}
