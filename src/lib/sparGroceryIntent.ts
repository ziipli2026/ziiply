// Conservative provider-category exclusions for explicit human-food search intent.
// Unknown/missing provider categories remain visible; this does not approve EANs.
const foodIntents = new Set(["maito","kahvi","kananmuna","leipä","juusto","jogurtti","voi","riisi","pasta","sokeri","jauho","mehu","cola","peruna","banaani","omena","tomaatti","kana","kala","suklaa","keksi","muro","jäätelö","kerma","rahka","öljy","suola","tee","makkara","puuro"]);
const nonFoodCategory = /(?:koiran|kissan|lemmikki|eläin|pet food|sukat|pehmolelu|lelut|lelu|shampoo|kosmetiik|ihonhoito|kasvojen|vartalovoite|hiusten|matot|t-paidat|paitoja|miesten paidat|naisten paidat|puhdistusaine|puhdistusliina|puhdistuspyyh|kahvinkeittimien tarvikkeet|wc-puhdistus|kodinkone|puhelin|paristo)/iu;
export function filterSparHumanFoodIntent<T extends {category?:string;ean?:string}>(items:T[],intent:string):T[]{
 if(!foodIntents.has(intent.toLocaleLowerCase("fi-FI").trim()))return items;
 return items.filter(item=>!nonFoodCategory.test(String(item.category??"")));
}
