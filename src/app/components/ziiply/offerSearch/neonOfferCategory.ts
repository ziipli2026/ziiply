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
    const normalizeName = (name: string) => name.toLocaleLowerCase("fi").normalize("NFKC").replace(/\\s+/g, " ").trim();
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
        const updates = [...new Map(offers.map(offer => {
          const ean = getEan(offer);
          return [ean, {ean, category: safe.get(normalizeName(getName(offer)))}] as const;
        }).filter((entry): entry is readonly [string, {ean:string;category:string}] =>
          Boolean(entry[0] && entry[1].category && !eanRows.some(row => String(row.ean) === entry[0])))).values()];
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
