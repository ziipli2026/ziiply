import { neon } from "@neondatabase/serverless";
import { resolveUniqueCatalogIdentity, type CatalogIdentity } from "./catalogIdentityResolver";

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
  // Product taxonomy parents for non-food goods are authoritative: a pet
  // fish-flavoured snack, a coffee-machine cleaner or freezer bags must not
  // become human food because a child label contains a food keyword.
  if (/lemmik/.test(parent)) return "Lemmikit";
  if (/hygienia|kosmetiikka|kauneus/.test(parent)) return "Hygienia & kosmetiikka";
  if (/kodinhoito|siivous/.test(parent)) return "Kodinhoito";
  if (/koti|kayttotavarat|vapaa-aika/.test(parent)) return "Koti & vapaa-aika";
  // Specific child group wins over a broad parent (coffee/juice, fish/ready meals).
  if (/kahvi|suodatinpuss|teejuom|(?:^|\/)(?:teet|tee)(?:\/|$)/.test(parts.slice(1).join("/"))) return "Kahvi & tee";
  if (/mehu|smoothie|virvoitus|cola|limonadi|energiajuom|kivennaisves|vesipull|oluet|siider/.test(leaf)) return "Juomat";
  if (/kala|lohi|silak|muik|katkarap|merenelav|kalatiski/.test(leaf)) return "Kala";
  if (/lasten-?ruo|vauvan-?ruo|lasten-?valipal|valipalasose|lasten-?sose|vellit/.test(path)) return "Lastenruoat";
  if (/vaip|lastenhoito/.test(path)) return "Lastenhoito";
  if (/vitamiin|ravintolis|kivennaisain|omega|proteiinivalmiste|proteiinijauhe|urheiluravinte|urheiluvalmiste|elektrolyyt|terveysvalmiste/.test(path)) return "Vitamiinit & ravinteet";
  if (/valipalakeks|valipalapatuk|keks|pikkuleiv/.test(leaf)) return "Makeiset & keksit";
  if (/lastenruoat/.test(path)) return "Lastenruoat";
  // Confectionery subgroups take precedence over the broad naposteltavat parent.
  if (/^makeiset-ja-naposteltavat\//.test(path) &&
      /^(suklaat|karkkipussit|purukumit|muut-makeiset|pastillit)$/.test(parts[1] || "")) return "Makeiset & keksit";
  // Frozen products stay in Pakasteet even when their subgroup contains snack terms.
  if (/jaatelo|pakaste/.test(path)) return "Pakasteet";
  if (/sips|snacks|naposteltav|popcorn|nacho/.test(path)) return "Kuivatuotteet";
  if (/juomat\/kahvi/.test(path)) return "Kahvi & tee";
  if (/juomat/.test(parent)) return "Juomat";
  if (/kala|merenelav/.test(parent)) return "Kala";
  if (/leivat|leipa|leivonnais/.test(parent)) return "Leipomo";
  if (/liha|kasviproteiin/.test(parent)) return "Liha & makkarat";
  if (/hedelmat|vihannekset|hevi/.test(parent)) return "Hevi";
  if (/maito|juusto|munat|rasvat/.test(parent)) return "Maitotuotteet";
  if (/valmisruo/.test(parent)) return "Valmisruoka";
  if (/pastat|riisit|nuudelit|mausteet|sailykkeet|kuivatuotteet|kuivat-elintarvikkeet|leivonta|texmex|maailman-mau/.test(parent)) return "Kuivatuotteet";
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
  const readOnly = process.env.OFFER_CATEGORY_READ_ONLY === "1";
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
    if (missing.size && !readOnly) {
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
    if (unresolvedNames.length && !readOnly) {
      try {
        const candidates = await sql`SELECT lower(regexp_replace(trim(name), '[[:space:]]+', ' ', 'g')) AS normalized_name,
          min(category) AS category, count(DISTINCT category) AS category_count
          FROM ziiply_ean_products
          WHERE lower(regexp_replace(trim(name), '[[:space:]]+', ' ', 'g')) = ANY(${unresolvedNames}::text[])
            AND category LIKE '%/%'
          GROUP BY 1 HAVING count(DISTINCT category) = 1`;
        const safe = new Map(candidates.map(row => [String(row.normalized_name), String(row.category)]));
        // Guard every inferred path against the live Neon taxonomy before writing.
        // Name heuristics may suggest a path, but only paths already present in the
        // registry are eligible for persistence.
        const categoryRows = await sql`SELECT DISTINCT category FROM ziiply_ean_products WHERE category LIKE '%/%'`;
        const existingCategoryPaths = new Set(categoryRows.map(row => String(row.category)));
        const updates: Array<{ean: string; category: string}> = [];
        const seen = new Set<string>();
        for (const offer of offers) {
          const ean = getEan(offer);
          const name = getName(offer);
          const category = safe.get(normalizeName(name));
          if (!ean || !category || !existingCategoryPaths.has(category) || seen.has(ean) || eanRows.some(row => String(row.ean) === ean)) continue;
          updates.push({ean, category});
          seen.add(ean);
        }
        if (updates.length) {
          const payload = JSON.stringify(updates);
          await sql`UPDATE ziiply_ean_products AS p SET category = u.category, updated_at = now()
            FROM jsonb_to_recordset(${payload}::jsonb) AS u(ean text, category text)
            WHERE p.ean = u.ean AND (p.category IS NULL OR trim(p.category) = '')`;
          // Read back persisted rows: a concurrent update may have skipped a proposed category.
          const confirmed = await sql`SELECT ean, category FROM ziiply_ean_products WHERE ean = ANY(${updates.map(item => item.ean)}::text[]) AND category IS NOT NULL AND category <> ''`;
          for (const row of confirmed) eanRows.push({ean:String(row.ean),category:String(row.category)});
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
    // Resolve EAN-less offers from every provider with the same strict catalog
    // identity rules. Never guess from a category shelf, partial name or URL.
    const withoutEan = offers.filter(offer => !getEan(offer));
    const identityNames = [...new Set(withoutEan.map(getName)
      .filter(name => name.length >= 6 && name.length <= 300))];
    const identityMatches = new Map<T, CatalogIdentity>();
    if (identityNames.length) {
      try {
        const candidates = await sql`SELECT ean, name, brand, quantity, category
          FROM ziiply_ean_products
          WHERE lower(regexp_replace(trim(name), '[[:space:]]+', ' ', 'g')) = ANY(${identityNames.map(name => name.toLocaleLowerCase("fi").normalize("NFKC").replace(/\s+/g, " ").trim())}::text[])
            AND category IS NOT NULL AND trim(category) <> ''`;
        const catalog = candidates.map(row => ({
          ean: String(row.ean), name: String(row.name),
          brand: row.brand == null ? null : String(row.brand),
          quantity: row.quantity == null ? null : String(row.quantity),
          category: String(row.category),
        }));
        for (const offer of withoutEan) {
          const identity = resolveUniqueCatalogIdentity({
            title: getName(offer), brand: String(offer.brand ?? offer.brandName ?? ""),
            quantity: String(offer.quantity ?? ""), packageSize: String(offer.packageSize ?? ""),
          }, catalog);
          if (identity) identityMatches.set(offer, identity);
        }
      } catch (error) {
        console.error("[offers] Shared catalog identity lookup failed; preserving provider data", error);
      }
    }
    const byEan = new Map(eanRows.map(row => [String(row.ean), String(row.category)]));
    return offers.map(offer => {
      const ean = getEan(offer);
      const localIdentity = identityMatches.get(offer);
      const localCategory = localIdentity?.category ?? null;
      const exactPath = byEan.get(ean) || localCategory || null;
      const matchType = byEan.has(ean) ? "ean" : localIdentity ? "catalog-identity" : null;
      const display = exactPath ? neonOfferDisplayCategory(exactPath) : null;
      if (!display) return offer;
      // A verified EAN or unique catalog identity is authoritative for every
      // provider. Never retain a conflicting provider shelf category.
      const category = display;
      const source = offer.__sourceOfferSearchResult;
      return {
        ...offer, category, categoryPath: category, mainCategory: category,
        neonCategoryPath: exactPath, neonDisplayCategory: display, neonCategoryMatch: matchType,
        ...(source && typeof source === "object" && !Array.isArray(source)
          ? {__sourceOfferSearchResult: {...source, category, categoryPath: category, mainCategory: category}}
          : {}),
      };
    });
  } catch (error) {
    console.error("[offers] Neon category lookup failed; preserving provider categories", error);
    return offers;
  }
}
