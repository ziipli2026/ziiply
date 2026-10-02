// SPAR/Tokmanni Justiina text-search gate. Keep separate from EAN recognition and Gösta offers.
type SearchItem = { name?: string; category?: string };
const normalize = (value: unknown) => String(value ?? "").toLocaleLowerCase("fi-FI").normalize("NFKC").replace(/[^\\p{L}\\p{N}]+/gu, " ").trim();
const NON_GROCERY = /\\b(?:tuttipull\\w*|tutti\\w*|imetys\\w*|kasvomai\\w*|vartalomai\\w*|puhdistusmai\\w*|aurinkomai\\w*|hiusmai\\w*|meikinpoisto\\w*|kasvovoide\\w*|vartalovoide\\w*|shampoo\\w*|suihkugeeli\\w*|vaippa\\w*|lelut?\\w*|lelu\\w*|lannoit\\w*|pesukone\\w*|sisustus\\w*|tekstiili\\w*|kosmetiik\\w*|ihonhoito\\w*)\\b/u;
const MILK_FOOD = /\\b(?:maito\\w*|kevytmaito\\w*|täysmaito\\w*|rasvaton\\s+maito\\w*|laktoositon\\s+maito\\w*|kauramaito\\w*|soijamaito\\w*|mantelimaito\\w*|maitojuoma\\w*|maitojauhe\\w*|kookosmaito\\w*|suklaamaito\\w*|piimä\\w*)\\b/u;
const MILK_NONFOOD = /\\b(?:kasvo\\w*|vartalo\\w*|puhdistus\\w*|aurinko\\w*|ihonhoito\\w*|kosmetiik\\w*|tutti\\w*|pullo\\w*|imeväis\\w*|baby\\w*|vauvanhoito\\w*|hius\\w*|meikinpoisto\\w*)\\b/u;
export function filterSparGrocerySearch<T extends SearchItem>(items: T[], query: string): T[] {
  const q = normalize(query);
  const milkQuery = /\\bmaito\\w*\\b/u.test(q);
  return items.filter(item => {
    const name = normalize(item.name);
    const category = normalize(item.category);
    if (!name) return false;
    if (NON_GROCERY.test(name) || NON_GROCERY.test(category)) return false;
    if (milkQuery) return MILK_FOOD.test(name) && !MILK_NONFOOD.test(name + " " + category);
    return true;
  });
}
