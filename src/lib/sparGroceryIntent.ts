// Conservative provider-category exclusions for explicit human-food search intent.
// Unknown/missing provider categories remain visible; this does not approve EANs.
const foodIntents = new Set(["maito","kahvi","kananmuna","leipä","juusto","jogurtti","voi","riisi","pasta","sokeri","jauho","mehu","cola","peruna","banaani","omena","tomaatti","kana","kala","suklaa","keksi","muro","jäätelö","kerma","rahka","öljy","suola","tee","makkara","puuro"]);
const nonFoodCategory = /(?:koiran|kissan|lemmikki|eläin|pet food|sukat|pehmolelu|lelut|lelu|shampoo|kosmetiik|ihonhoito|kasvojen|vartalovoite|hiusten|matot|t-paidat|paitoja|miesten paidat|naisten paidat|puhdistusaine|puhdistusliina|puhdistuspyyh|kahvinkeittimien tarvikkeet|wc-puhdistus|kodinkone|puhelin|paristo)/iu;
// Exclude clearly non-grocery departments regardless of the search term.
// Classification is based on provider taxonomy, not product names or query words.
// Ambiguous categories remain available for the shared relevance engine.
const nonGroceryDepartment = /(?:pussilakana|lakanasetit|kylpypyyh|fleecehuov|penaalit|autotarvik|autonraikast|vartalotuoks|vartalon kuorinta|vitamiinit|monivitamiinit|ravintolis|kalaöljyt|aminohappovalmiste|urheiluravinte|elektrolyyttijauhe|kondomit|tarjoiluastiat|keittiövälineet|sisustustekstiilit)/iu;
export function filterSparHumanFoodIntent<T extends {category?:string;ean?:string}>(items:T[],intent:string):T[]{
 if(!foodIntents.has(intent.toLocaleLowerCase("fi-FI").trim()))return items;
 return items.filter(item=>{const category=String(item.category??"");return !nonFoodCategory.test(category)&&!nonGroceryDepartment.test(category)});
}
