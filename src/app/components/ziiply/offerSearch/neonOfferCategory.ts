import { neon } from "@neondatabase/serverless";

// Exact EAN matches only. Neon is authoritative over legacy title heuristics.
const labels = new Set(["Kahvi & tee","Maitotuotteet","Liha & makkarat","Kala","Leipomo","Hevi","Juomat","Pakasteet","Valmisruoka","Kuivatuotteet","Makeiset & keksit","Lastenruoat","Lastenhoito","Vitamiinit & ravinteet","Lemmikit","Hygienia & kosmetiikka","Kodinhoito","Koti & vapaa-aika","Muut"]);
export function neonOfferDisplayCategory(category: string): string | null {
  const raw = category.trim();
  if (labels.has(raw)) return raw;
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
  const getEan = (o: T) => String(o.ean || o.eanCode || o.barcode || "").replace(/\D/g, "");
  const getName = (o: T) => String(o.title || o.name || "").trim();
  const eans = [...new Set(offers.map(getEan).filter(e => /^\d{8,14}$/.test(e)))];
  // Exact names only: no fuzzy matches that might confuse package sizes.
  const names = [...new Set(offers.filter(o => !/^\d{8,14}$/.test(getEan(o))).map(getName).filter(n => n.length >= 6 && n.length <= 300))];
  if (!eans.length && !names.length) return offers;
  try {
    const sql = neon(url);
    const eanRows = eans.length ? await sql`SELECT ean, category FROM ziiply_ean_products WHERE ean = ANY(${eans}::text[]) AND category IS NOT NULL AND category <> ''` : [];
    const nameRows = names.length ? await sql`SELECT name, category FROM ziiply_ean_products WHERE name = ANY(${names}::text[]) AND category IS NOT NULL AND category <> ''` : [];
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
      const exactPath = byEan.get(ean) || (!ean ? byName.get(getName(offer).toLocaleLowerCase("fi")) : null);
      const display = exactPath ? neonOfferDisplayCategory(exactPath) : null;
      return display ? {...offer, neonCategoryPath: exactPath, neonDisplayCategory: display} : offer;
    });
  } catch (error) {
    console.error("[offers] Neon category lookup failed; preserving provider categories", error);
    return offers;
  }
}
