import { cleanRecipeQuery, normalizeRecipeCategoryQuery, recipeCategory, recipeCategoryRejection } from "./recipeCategories";
import { inferRecipeProtein, proteinProductRejection, type RecipeProteinRequirement } from "./recipeProtein";
type RecipeContext={sourceLine?:string;proteinRequirement?:RecipeProteinRequirement|null;wholeSpice?:boolean};
/** Recipe-only canonicalization. Preserve the ingredient type before looking at price. */
export type RecipeFoodGroup = { ingredient: string; mainGroup: string; subGroup: string; searchTerm: string };
type Kind = { term: string; pattern: RegExp; product: RegExp; group: string; exclude?: RegExp };
const kinds: Kind[] = [
 {term:"keittojuurekset",pattern:/keittojuure|keittojuureks|juuressekoitus|juureskuutio|juuressuikale/,product:/keittojuure|juuressekoitus|juureskuutio|juuressuikale|keittojuures/,exclude:/keittojuures.*(?:keitto|ateria|valmisruoka)|(?:keitto|ateria|valmisruoka).*keittojuures/,group:"Kasvikset ja pakastekasvikset"},
 {term:"kanaliemikuutio",pattern:/kanaliemikuutio/,product:/kanaliemikuutio/,group:"Liemet"},
 {term:"jauhoinen peruna",pattern:/jauhois.*perun/,product:/jauhoinen.*peruna|peruna.*jauhoinen|rosamunda|van gogh/,group:"Kasvikset"},
 {term:"kevytmaitojuoma",pattern:/kevytmaitojuom/,product:/kevytmaitojuoma/,group:"Maidot"},
 {term:"mustikka",pattern:/mustik/,product:/mustikka|mustikoita/,exclude:/mehu|hillo|keitto|jogur|rahka|piirakka|suklaa|patukka|puuro|juoma|smoothie|keksi/,group:"Marjat"},
 {term:"vaniljakastike",pattern:/vaniljakastik/,product:/vaniljakastike/,group:"Kastikkeet"},
 {term:"villiriisisekoitus",pattern:/villiriisisekoit/,product:/villiriisisekoitus|villiriisi.*sekoitus/,group:"Riisit"},
 {term:"maissi pakaste",pattern:/pakastemaiss/,product:/maissi/,exclude:/tähkä|jauho|sips|lastu|tärkkelys|öljy|paprika|herne/,group:"Pakastekasvikset"},
 {term:"sweet chili kastike",pattern:/sweet chili.*kastik/,product:/sweet chili.*kastike|kastike.*sweet chili/,group:"Kastikkeet"},
 {term:"vaalea suuruste",pattern:/vaaleaa suuruste/,product:/vaale.*suuruste|suuruste.*vaale/,group:"Jauhot"},

 {term:"ancho chili",pattern:/ancho.*chili/,product:/ancho.*chili|chili.*ancho/,group:"Mausteet"},
 {term:"varhaisperuna",pattern:/varhaisperun/,product:/varhaisperuna|uusi peruna/,group:"Kasvikset"},
 {term:"salaattisekoitus",pattern:/salaattisekoit/,product:/salaattisekoitus|salaattimix/,group:"Kasvikset"},
 {term:"vaalea kastike",pattern:/kermaista vaaleaa kastiketta/,product:/vaalea kastike|kastike.*vaalea/,group:"Kastikkeet"},
 {term:"savujuusto",pattern:/savujuust/,product:/savujuusto|savustettu.*juusto/,group:"Juustot"},
 {term:"annosfondi",pattern:/annosfond|fond.*du chef/,product:/annosfondi|fond.*du chef/,group:"Liemet"},
 {term:"timjami",pattern:/timjam/,product:/timjami/,group:"Mausteet"},
 {term:"korianteri",pattern:/korianter/,product:/korianteri/,group:"Yrtit"},
 {term:"persilja",pattern:/persilj/,product:/persilja/,group:"Yrtit"},
 {term:"chilihiutale",pattern:/chilihiutal/,product:/chilihiutale|chili.*hiutale/,group:"Mausteet"},
 {term:"pizzamauste",pattern:/pizzamaust/,product:/pizzamauste/,group:"Mausteet"},
 {term:"välimeren yrttiseos",pattern:/välimeren.*yrtti/,product:/välimeren.*yrtti/,group:"Mausteet"},
 {term:"sormisuola",pattern:/sormisuol/,product:/sormisuola|merisuolahiutale|fleur de sel/,group:"Mausteet"},
 {term:"dijonsinappi",pattern:/dijonsinap/,product:/dijon.*sinappi|sinappi.*dijon/,group:"Sinapit"},
 {term:"kapris",pattern:/kaprik/,product:/kapris/,group:"Säilykkeet"},
 {term:"fenkoli",pattern:/fenkol/,product:/fenkoli/,group:"Kasvikset"},
 {term:"kevätsipuli",pattern:/kevätsipul/,product:/kevätsipuli/,group:"Kasvikset"},
 {term:"purjo",pattern:/purjo/,product:/purjo/,group:"Kasvikset"},
 {term:"herne",pattern:/hernei|^herne/,product:/herne/,group:"Kasvikset",exclude:/keitto|sokeriherne|herneproteiini|hernerouhe|hernejauho/},
 {term:"bataatti",pattern:/bataat/,product:/bataatti/,group:"Kasvikset",exclude:/ransk|muusi|keitto|laatikko|pihvi/},
 {term:"pinaatti",pattern:/pinaat/,product:/pinaatti/,group:"Kasvikset",exclude:/lettu|keitto|pasta|kastike/},
 {term:"raejuusto",pattern:/raejuust/,product:/raejuusto/,group:"Juustot"},
 {term:"viinietikka",pattern:/viinietik/,product:/viinietikka/,group:"Etikat"},
 {term:"sitruunamehu",pattern:/sitruunanmeh/,product:/sitruunamehu/,group:"Mehut"},
 {term:"juokseva margariini",pattern:/juokseva.*margariin/,product:/juokseva.*(?:margariini|öljyvalmiste)|(?:margariini|öljyvalmiste).*juokseva/,group:"Rasvat"},
 {term:"maitojauhe",pattern:/maitojauh/,product:/maitojauhe/,group:"Maidot",exclude:/äidin|äitiys|korvike/},
 {term:"sipulikeittoaines",pattern:/sipulikeittoaine/,product:/sipulikeittoaines|sipulikeitto.*pussi/,group:"Keittoainekset"},
 {term:"fusillipasta",pattern:/fusilli/,product:/fusilli/,group:"Pastat"},
 {term:"tumma makaroni",pattern:/tummia.*makaron|tumma.*makaron/,product:/tumma.*makaron/,group:"Pastat"},
 {term:"aura muru",pattern:/aura.*muru/,product:/aura.*(?:muru|murenn)/,group:"Juustot"},
 {term:"kiehu maitojuoma",pattern:/kiehu.*maitojuom/,product:/kiehu.*maitojuoma/,group:"Maidot"},
 {term:"kasvisliemi",pattern:/kasvislient|^kasvisliemi$/,product:/kasvisliemi|kasvisfond/,group:"Liemet"},
 {term:"kananjauheliha",pattern:/kananjauhelih|broilerin.*jauhelih/,product:/kana.*jauheliha|broiler.*jauheliha/,group:"Jauhelihat"},
 {term:"koskenlaskija ruoka dippi jalapeno cheddar",pattern:/koskenlaskija.*ruoka.*dipp/,product:/koskenlaskija.*ruoka.*dipp.*jalapeno/,group:"Juustovalmisteet"},
 {term:"koskenlaskija viherpippuri sulatejuusto",pattern:/koskenlaskija.*viherpippuri.*sulatejuusto/,product:/koskenlaskija.*viherpip/,group:"Sulatejuustot"},
 {term:"oivariini juokseva",pattern:/oivariini.*juoksev/,product:/oivariini.*juoksev/,group:"Rasvat"},
 {term:"oivariini",pattern:/oivariini/,product:/oivariini/,exclude:/juoksev/,group:"Rasvat"},
 {term:"ruokakerma kolme juustoa",pattern:/ruokakerma.*kolme juustoa/,product:/ruokakerma.*kolme juustoa/,group:"Kermat"},
 {term:"ruokakerma kolme sipulia",pattern:/ruokakerma.*kolme sipulia/,product:/ruokakerma.*kolme sipulia/,group:"Kermat"},
 {term:"laktoositon juustokerma",pattern:/laktoosito.*juustokerma/,product:/juustokerma/,group:"Kermat"},
 {term:"kookoskerma",pattern:/kookoskerma/,product:/kookoskerma/,group:"Kasvipohjaiset kermat"},
 {term:"kookosmaito",pattern:/kookosmai/,product:/kookosmaito/,exclude:/juoma/,group:"Kasvipohjaiset maidot"},
 {term:"kermaviili",pattern:/kermaviil/,product:/kermaviili/,group:"Maitotuotteet"},
 {term:"tuorejuusto",pattern:/tuorejuust/,product:/tuorejuusto/,group:"Tuorejuustot"},
 {term:"sulatejuusto",pattern:/sulatejuust/,product:/sulatejuusto/,group:"Sulatejuustot"},
 {term:"fetajuusto",pattern:/fetajuust|\bfetaa?\b/,product:/fetajuusto|\bfeta\b/,group:"Juustot"},
 {term:"ruokakerma",pattern:/ruokakerma/,product:/ruokakerma/,exclude:/kookos|kaura|soija/,group:"Kermat"},
 {term:"kuohukerma",pattern:/kuohukerma/,product:/kuohukerma/,group:"Kermat"},
 {term:"kerma",pattern:/^kermaa?$/,product:/\bkerma\b|ruokakerma|kuohukerma|vispikerma/,exclude:/juusto|kookos|kaura/,group:"Kermat"},
 {term:"kirjolohifilee",pattern:/kirjoloh/,product:/kirjoloh.*file/,exclude:/savu|graavi|suolattu|keitto|pyörykk|kalapuikko/,group:"Tuore kala"},
 {term:"lohifilee",pattern:/\bloh(?:i|ta|en|ifilee|ifilettä|ifileetä|ifileitä)\b/,product:/\blohi.*file/,exclude:/kirjoloh|savu|graavi|suolattu|keitto|pyörykk|kalapuikko/,group:"Tuore kala"},
 {term:"silakkafilee",pattern:/silakk.*file/,product:/silakk.*file/,exclude:/marinoitu|etikka|sinappi/,group:"Tuore kala"},
 {term:"silakka",pattern:/^silak(?:ka|kaa|oita)$/,product:/silak(?:ka|oita)/,exclude:/marinoitu|etikka|sinappi/,group:"Tuore kala"},
 {term:"tonnikala",pattern:/tonnikala/,product:/tonnikala/,exclude:/pasta|salaatti|pizza|ateria|kastike/,group:"Kalasäilykkeet"},
 {term:"kanan fileesuikale maustamaton",pattern:/(?:kanan|broilerin).*fileesuikale.*maustamaton/,product:/(?:kanan|broilerin|broileri).*fileesuikale/,exclude:/marinoitu|hunaja|curry|teriyaki|grilli/,group:"Siipikarja"},
 {term:"kananfilee",pattern:/kananfile|kanan file|kananrinta|broilerin.*file/,product:/(?:kana|broiler).*file|kananrinta/,exclude:/ateria|kastike|pasta/,group:"Siipikarja"},
 {term:"naudan jauheliha",pattern:/naudan.*jauhelih/,product:/naudan.*jauheliha|nautajauheliha/,exclude:/sika|ateria|kastike|lasagne|keitto|spagetti/,group:"Jauhelihat"},
 {term:"jauheliha",pattern:/jauhelih/,product:/jauheliha/,exclude:/ateria|kastike|lasagne|keitto|spagetti/,group:"Jauhelihat"},
 {term:"perunamuusiaines",pattern:/perunamuusiaine/,product:/perunamuusiaines|perunamuusiain/,group:"Pakastekasvikset"},
 {term:"kasvissuikale",pattern:/kasvissuikale/,product:/kasvissuikale/,group:"Kasvikset"},
 {term:"varsiparsakaali",pattern:/varsiparsakaal/,product:/varsiparsakaali|broccolini/,group:"Kasvikset"},
 {term:"kirsikkatomaatti",pattern:/kirsikkatomaat/,product:/kirsikkatomaatti/,group:"Kasvikset"},
 {term:"kuorittu tomaatti",pattern:/kuoritt.*tomaat/,product:/kuorit.*tomaat/,group:"Tomaattisäilykkeet"},
 {term:"tomaattimurska",pattern:/tomaattimursk/,product:/tomaattimurska/,group:"Tomaattisäilykkeet"},
 {term:"tomaattipyree",pattern:/tomaattipyree/,product:/tomaattipyree|tomaattisose/,group:"Tomaattisäilykkeet"},
 {term:"tomaattisose",pattern:/tomaattisose/,product:/tomaattisose|tomaattipyree/,group:"Tomaattisäilykkeet"},
 {term:"valkosipuli",pattern:/valkosipuli/,product:/\bvalkosipuli\b/,exclude:/jauhe|rouhe|mauste|suola|kastike/,group:"Kasvikset"},
 {term:"punasipuli",pattern:/punasipul/,product:/punasipuli/,exclude:/jauhe|mauste|kastike/,group:"Kasvikset"},
 {term:"sipuli",pattern:/\bsipul/,product:/\bsipuli\b|keltasipuli/,exclude:/jauhe|rouhe|suola|mauste|kastike|keitto/,group:"Kasvikset"},
 {term:"vihreä paprika",pattern:/vihreä.*paprik/,product:/vihreä paprika|paprika vihreä/,group:"Kasvikset"},
 {term:"paprika",pattern:/^paprikaa?$/,product:/\bpaprika\b/,exclude:/jauhe|mauste|sipsi|kastike/,group:"Kasvikset"},
 {term:"kurkku",pattern:/kurkk/,product:/\bkurkku\b/,exclude:/suola|mauste|etikka|säilyke|kastike/,group:"Kasvikset"},
 {term:"tomaatti",pattern:/^tomaat/,product:/\btomaatti\b|kirsikkatomaatti/,exclude:/murska|pyree|sose|keitto|kastike|kuivattu|kuorittu/,group:"Kasvikset"},
 {term:"peruna",pattern:/^(?:jauhoisia )?perun/,product:/\bperuna\b|perunoita/,exclude:/muusi|lastu|sipsi|ranskan|keitto|salaatti|laatikko/,group:"Kasvikset"},
 {term:"porkkana",pattern:/porkkan/,product:/\bporkkana\b/,exclude:/kakku|mehu|sose|keitto/,group:"Kasvikset"},
 {term:"kalamataoliivi",pattern:/kalamataoliiv/,product:/kalamata.*oliivi|oliivi.*kalamata/,group:"Säilykkeet"},
 {term:"punainen linssi esikeitetty",pattern:/esikeitet.*punais.*linss/,product:/punai.*linss/,exclude:/kuivattu|linssikeitto|linssipasta/,group:"Palkokasvit"},
 {term:"punainen linssi",pattern:/punais.*linss|punainen linssi/,product:/punai.*linss/,exclude:/keitto|pasta|sipsi/,group:"Palkokasvit"},
 {term:"pennepasta",pattern:/pennepasta|pennepastaa/,product:/penne/,exclude:/ateria|kastike|valmis/,group:"Pastat"},
 {term:"tumma makaroni",pattern:/tumma.*makaron/,product:/tumma.*makaroni|täysjyvä.*makaroni/,exclude:/laatikko|ateria|kastike/,group:"Pastat"},
 {term:"makaroni",pattern:/makaron/,product:/makaroni/,exclude:/laatikko|ateria|kastike/,group:"Pastat"},
 {term:"pasta",pattern:/^pastaa?\b|^spagett/,product:/pasta|fusilli|penne|spagetti|makaroni|simpukka/,exclude:/ateria|kastike|salaatti|valmis|keitto/,group:"Pastat"},
 {term:"riisi",pattern:/^(?:riisi|riisiä)$/,product:/\briisi\b/,exclude:/puuro|ateria|kakku|sipsi/,group:"Riisit"},
 {term:"basmatiriisi",pattern:/basmatiriis/,product:/basmatiriisi/,exclude:/ateria/,group:"Riisit"},
 {term:"jasmiiniriisi",pattern:/jasmiiniriis/,product:/jasmiiniriisi/,exclude:/ateria/,group:"Riisit"},
 {term:"juustoraaste",pattern:/juustoraast/,product:/juustoraaste/,group:"Juustot"},
 {term:"juusto",pattern:/^(?:juusto|juustoa|emmental|edam)$/,product:/juusto|edam|emmental/,exclude:/kakku|keksi|kastike|ateria|dippi|tuorejuusto|sulatejuusto|raejuusto/,group:"Juustot"},
 {term:"broileri",pattern:/^(?:broileri|broileria)$/,product:/broileri|kananfile|kanan file/,exclude:/ateria|kastike|keitto|pasta|pizza/,group:"Siipikarja"},
 {term:"paprikajauhe",pattern:/paprikajauhe/,product:/paprikajauhe|paprika.*jauhettu/,group:"Mausteet"},
 {term:"basilika",pattern:/basilik/,product:/\bbasilika\b/,exclude:/kastike|juusto|pasta|pizza/,group:"Yrtit"},
 {term:"persilja",pattern:/persilj/,product:/\bpersilja\b/,exclude:/kastike|juusto|pasta/,group:"Yrtit"},
 {term:"soijakastike",pattern:/soijakastik/,product:/soijakastike/,group:"Kastikkeet"},
 {term:"hunaja",pattern:/^hunajaa?$/,product:/\bhunaja\b/,exclude:/marinoitu|kastike|juoma|kana|broileri/,group:"Makeuttajat"},
 {term:"sitruunankuori",pattern:/sitruunan.*kuor/,product:/\bsitruuna\b/,exclude:/mehu|pesu|saippua/,group:"Hedelmät"},
 {term:"kananmuna",pattern:/kananmun|^mun(?:a|ia)$/,product:/kananmun|\bmunia\b/,exclude:/suklaa|yllätys|koriste|leikk/,group:"Kananmunat"},
 {term:"vehnäjauho",pattern:/vehnäjauh|^jauhoja?$/,product:/vehnäjauho/,group:"Jauhot"},
 {term:"korppujauho",pattern:/korppujauh/,product:/korppujauho/,group:"Jauhot"},
 {term:"leivinjauhe",pattern:/leivinjauhe/,product:/leivinjauhe/,group:"Leivonta"},
 {term:"hiiva",pattern:/^hiivaa?$/,product:/\bhiiva\b/,exclude:/hiivaleip|ravintohiiva|oluthiiva/,group:"Leivonta"},
 {term:"mantelirouhe",pattern:/mantelirouhe/,product:/mantelirouhe/,group:"Leivonta"},
 {term:"vaniljasokeri",pattern:/vaniljasoker/,product:/vaniljasokeri/,group:"Sokerit"},
 {term:"fariinisokeri",pattern:/fariinisoker/,product:/fariinisokeri/,group:"Sokerit"},
 {term:"ruokosokeri",pattern:/ruokosoker/,product:/ruokosokeri/,group:"Sokerit"},
 {term:"tomusokeri",pattern:/tomusoker/,product:/tomusokeri/,group:"Sokerit"},
 {term:"sokeri",pattern:/^(?:sokeri|sokeria|taloussokeri|hienosokeri|kidesokeri|erikoishieno sokeri)$/,product:/sokeri|\bsiro\b/,exclude:/vanilja|tomu|hillo|vartalo|kuorinta|karvanpoisto|suklaa|karkki|makeinen|pastilli|juoma|jogurtti|keksi|siirappi/,group:"Sokerit"},
 {term:"merisuola",pattern:/merisuol/,product:/merisuola/,exclude:/saippua|kylpy|suihku/,group:"Suolat"},
 {term:"suola",pattern:/^suolaa?$/,product:/\bsuola\b|ruokasuola|hienosuola|merisuola|vuorisuola/,exclude:/kylpy|saippua|suihku|suolakur|sipsi|suolapäh|suolainen/,group:"Suolat"},
 {term:"maustepippuri",pattern:/maustepippur/,product:/maustepippuri/,group:"Mausteet"},
 {term:"valkopippuri",pattern:/valkopippur/,product:/valkopippuri/,group:"Mausteet"},
 {term:"mustapippuri",pattern:/mustapippur|^pippuria?$/,product:/mustapippuri/,group:"Mausteet"},
 {term:"laakerinlehti",pattern:/laakerinleh/,product:/laakerinlehti|laakerinlehtiä/,group:"Mausteet"},
 {term:"currytahna",pattern:/currytahn/,product:/currytahna|curry.*tahna/,group:"Mausteet"},
 {term:"curry",pattern:/^currya?$/,product:/\bcurry\b/,exclude:/tahna|kastike|ateria|pasta/,group:"Mausteet"},
 {term:"juustokumina",pattern:/juustokumin/,product:/juustokumina/,group:"Mausteet"},
 {term:"inkivääri",pattern:/inkiväär/,product:/inkivääri/,exclude:/juoma|olut|shot|keksi|kastike/,group:"Mausteet ja kasvikset"},
 {term:"kardemumma",pattern:/kardemumm/,product:/kardemumma/,exclude:/pulla|keksi/,group:"Mausteet"},
 {term:"kaneli",pattern:/kanel/,product:/\bkaneli\b/,exclude:/pulla|keksi|korppu|sokeri/,group:"Mausteet"},
 {term:"oregano",pattern:/oregan/,product:/oregano/,group:"Mausteet"},
 {term:"tilli",pattern:/tilli/,product:/\btilli\b/,exclude:/juusto|kastike|kurkku|lohi|silakka/,group:"Yrtit"},
 {term:"sitruunamehu",pattern:/sitruunamehu/,product:/sitruunamehu/,group:"Mehut"},
 {term:"sitruuna",pattern:/^sitruun/,product:/\bsitruuna\b/,exclude:/mehu|limonadi|pesu|saippua/,group:"Hedelmät"},
 {term:"oliiviöljy",pattern:/oliiviölj/,product:/oliiviöljy/,group:"Ruokaöljyt"},
 {term:"rypsiöljy",pattern:/rypsiölj/,product:/rypsiöljy/,group:"Ruokaöljyt"},
 {term:"ruokaöljy",pattern:/^öljyä?$|^ruokaöljy$/,product:/rypsiöljy|oliiviöljy|rapsiöljy|auringonkukkaöljy|ruokaöljy/,group:"Ruokaöljyt"},
 {term:"väkiviinaetikka",pattern:/väkiviinaetikk|^etikkaa?$/,product:/väkiviinaetikka/,exclude:/pyykki|siivous|pesu/,group:"Etikat"},
 {term:"maito",pattern:/^maitoa?$|kevytmaito|täysmaito/,product:/\bmaito\b|kevytmaito|täysmaito|rasvaton maito/,exclude:/jauhe|suklaa|kookos|kaura|soija|manteli|kondensoitu/,group:"Maidot"},
 {term:"voi",pattern:/^voita?$/,product:/\bvoi\b|meijerivoi/,exclude:/taikina|voide|vartalo|kasvo|keksi|margariini/,group:"Rasvat"},
];
function cleanName(input: string): string {
 return input.toLocaleLowerCase("fi").replace(/[™®]/g,"").replace(/^[•*–-]+\s*/,"")
 .replace(/\([^)]*\)/g," ").replace(/,\s*(?:esim\.|msc-sertifioitu).*$/,"").replace(/,\s*/g," ")
 .replace(/^(?:(?:valio|pirkka|parhaat|k-menu|snellman|kunnon|vikkelät|keittiön|luomu|eila|kreikkalaista|tuoretta|keitettyä|keitettyjä|hienonnettua|kuivattua|kokonaista|jauhettua|iso|pieni|pala|cm)\s+)+/g,"")
 .replace(/\s+\d+(?:[,.]\d+)?\s*%/g,"").replace(/\s+\d+(?:[,.]\d+)?\s*(?:kg|g|ml|dl|l)\b/g,"")
 .replace(/\s+(?:rasvaa|lohkoina|kuutioina|pieninä kuutioina)$/g,"").replace(/\s+/g," ").trim();
}
export function recipeProductSearchTerm(input: string): string | null {
 // Restore the previously working basic-potato lookup on desktop preview.
 // An inflected potato ingredient must not fall through to literal search.
 const rawIngredient=String(input||"").toLocaleLowerCase("fi");
 if(/\bperun(?:a|an|aa|at|oita|oiden|oissa|oista|oihin)\b/.test(rawIngredient)
   && !/peruna[- ](?:sipuli|juures|kikherne|pekoni|broileri)|peruna(?:salaat|pyöryk|pihv|muus|gnocch|gratiin|laatik|keitto)|pakaste|sekoitus/.test(rawIngredient))
   return "peruna";
 const name=cleanName(cleanRecipeQuery(input));
 // Normalize inflected single-root vegetables before product lookup.
 if(/\b(?:selleri|selleriä|sellerin|selleriäkin)\b/.test(name))return "selleri";
 if(/\b(?:lanttu|lanttua|lantun|lanttuja)\b/.test(name))return "lanttu";
 const potatoCore=name
   .replace(/\b(?:kiinteä|kiinteitä|jauhoinen|jauhoisia|varhais|varhaisia|kuorittu|kuorittuja|pesty|pestyjä|suomalainen|suomalaisia|isoja|pieniä|muutama|muutamia|kuorittuna|kuorittuina|pestynä|keitettynä|raakana|raaka|keltainen|vihreä|pussi)\b/g," ")
   .replace(/\s+/g," ").trim();
 if(/^(?:peruna|perunan|perunaa|perunat|perunoita|perunoiden|perunoissa|perunoista|perunoihin)$/.test(potatoCore))return "peruna";
 if(recipeCategory(name))return normalizeRecipeCategoryQuery(name);
 if(!/sipulikeittoaine|salaattisekoit|keittojuure|juuressekoitus|juureskuutio|juuressuikale/.test(name)&&/(?:laatikko|keitto|piirakka|pannukakku|korvapuusti|salaatti|kanapasta|tonnikalapasta|linssicurry)/.test(name))return name;
 if(!name||/^(?:vesi|vettä|veden|pastan keitinvet|keitinvet)/.test(name))return null;
 return kinds.find(x=>x.pattern.test(name))?.term||name;
}
export function classifyRecipeIngredient(input: string): RecipeFoodGroup | null {
 const term=recipeProductSearchTerm(input);const category=recipeCategory(input);
 if(category&&term)return {ingredient:term,searchTerm:term,mainGroup:category.label,subGroup:category.label};
 // Broth concentrates are not interchangeable with portion gels or stock cubes.
 // Preserve the requested physical form independently of recipe quantity.
 const kind=kinds.find(x=>x.term===term);
 return kind?{ingredient:kind.term,searchTerm:kind.term,mainGroup:kind.group,subGroup:kind.group}:null;
}
/** Unknown ingredients require a literal match, never an arbitrary cheapest item. */
export function recipeProductRejectionReason(input: string, product: { name?: string; category?: string },context?:RecipeContext): string | null {
 // Explicit recipe alternatives are OR choices, never separate requirements.
 // Evaluate each choice with the same category/attribute checks as an ordinary ingredient.
 const original=String(context?.sourceLine||"");
 if(/\s+tai\s+/i.test(original) && !/\([^)]*\btai\b[^)]*\)/i.test(original)){
   const alternatives=original.split(/\s+tai\s+/i).map(x=>x.trim()).filter(Boolean);
   if(alternatives.length>1){
     const stripQuantity=(x:string)=>x.replace(/^\s*\d+(?:[,.]\d+)?(?:\s*[-–]\s*\d+(?:[,.]\d+)?)?\s*(?:kg|g|l|dl|cl|ml|kpl|pkt|pss|prk|rkl|tl)\s+/i,"").trim();
     const verdicts=alternatives.map(x=>recipeProductRejectionReason(stripQuantity(x),product,{...context,sourceLine:stripQuantity(x)}));
     if(verdicts.includes(null))return null;
     return verdicts[0]||"alternative_ingredient_mismatch";
   }
 }
 const term=recipeProductSearchTerm(input);if(!term)return "not_purchasable_ingredient";
 const requirement=input.toLocaleLowerCase("fi");
 const name=String(product.name||"").toLocaleLowerCase("fi");const category=String(product.category||"").toLocaleLowerCase("fi");
 if(/nelson garden|kosmeti|hygienia|siivous|pesuaine|vartalo|karvanpoisto|ihonhoito|tuuheuttava|hiussuihke|merisuolasuihke|lemmik|kissan|kissoille|koiran|koirille|täysravinto|eläinruoka/.test(name+" "+category))return "non_food_product";
 // Raw potato ingredients must not fall through to the unknown-literal gate.
 // This applies to every store and accepts whole potatoes only, not prepared dishes.
 if(term==="peruna"){
   const rawPotato=/(?:^|[\s-])(?:peruna|perunat|ruokaperuna|puikulaperuna|siikliperuna)(?=$|[\s-])/i.test(name);
   const processed=/pyörykk|gnocch|salaat|sekoit|muus|lastu|sips|ranskan|keitto|laatik|gratiin|pihv|paistet|lohkoperun|uuniperun|valmisruok|peruna-(?:sipuli|kikherne|pekoni)|sämpyl|leipä|snack|linssi|pasta/i.test(name);
   return rawPotato&&!processed?null:"ingredient_product_type_mismatch";
 }
 // A generic ring-sausage ingredient may admit oven sausage, but not smoked sausage.
 // Explicit alternatives are handled above before this product-type check.
 if(/lenkkimakkar/.test(term) && !/savulenk/.test(requirement) && /savulenk/.test(name))return "sausage_variant_mismatch";
 const categoryIntent=recipeCategory(term);
 const categoryRejection=recipeCategoryRejection(term,product);
 if(categoryRejection)return categoryRejection;
 const protein=categoryIntent?null:context?.proteinRequirement||inferRecipeProtein(input);
 if(protein)return proteinProductRejection(protein,product);
 const kind=kinds.find(x=>x.term===term);
 if(kind&&(!kind.product.test(name)||kind.exclude?.test(name)))return "ingredient_product_type_mismatch";
 if(!categoryIntent&&!kind&&!term.split(" ").every(word=>name.includes(word)))return "unknown_ingredient_literal_match_missing";
 if(term==="sokeri"){
   const sugarName=/(?:^|[\s-])(?:sokeri|taloussokeri|hienosokeri|kidesokeri|ruokosokeri|fariinisokeri|palasokeri|raesokeri|siro)(?=$|[\s\d-])/i.test(name);
   if(!sugarName)return "actual_sugar_product_required";
   if(category.includes("/")&&!/(?:^|\/)(?:sokerit|sokeri|sugars)(?:\/|$)/.test(category))return "sugar_category_required";
   if(/(?:sokeriton|sokerittom|sokerimassa|sokerikuorr|sokeriströss|sokerikorist|sokeriherne|sokeriliem|sokeriruoko|sokeritouk|vähemmän soker|lisättyä soker|purukumi|salmiakki|lautanen|\bkulho\b|pyydys)/.test(name))return "actual_sugar_product_required";
 }
 const produceTerms=["porkkana","sitruuna","peruna","varhaisperuna","sipuli","punasipuli","valkosipuli","inkivääri","purjo","kevätsipuli","fenkoli","bataatti","pinaatti","herne","tomaatti","kirsikkatomaatti","kurkku","paprika","vihreä paprika"];
 if(produceTerms.includes(term)&&(/^(?:juomat|makeiset|leivat|valmisruoka|liha|maito|lapset)/.test(category)||/juusto|levite|tahna|tonnikala|broiler|filee|jogur|pasta|gnocchi|leipä|kierre|hyytelö|patukka|vichy|kivennäisvesi|limonadi|mehu|shot|shotti|tee|hauduke|makeinen|pastilli|suklaa|karkki|keksi|sips|lastu|pyörykk|pihvi|muusi|keitto|laatikko|jäätelö|jäätel|sorbet|grilliperuna|peruna-sipulisekoit|peruna-juuressekoit/.test(name)))return "whole_ingredient_required";
 if(["tuorejuusto","sulatejuusto","juustoraaste"].includes(term)&&/sips|keitto|kakku|makeinen|keksi/.test(name))return "cheese_ingredient_required";
 if(produceTerms.includes(term)&&category.includes("/")&&!/^(?:hedelmat-ja-vihannekset|pakasteet\/(?:vihannes|peruna|marja))/.test(category)&&!(term==="inkivääri"&&/^mausteet-ja-maustaminen/.test(category)))return "produce_category_required";
 if(produceTerms.includes(term)&&/^ca[a-z]+$/.test(category)&&!/^caaaa|^caabq|^caabgbaak/.test(category))return "produce_category_required";
 if(term==="maissi pakaste"&&!/pakast/.test(name+" "+category))return "frozen_vegetable_required";
 // Recipe amounts affect the shopping quantity, not whether a product is a valid ingredient.
 // An explicitly fresh ingredient must not silently become a frozen or dried product.
 const recipeSource=(requirement+" "+String(context?.sourceLine||"").toLocaleLowerCase("fi"));
 const explicitlyFresh=/\btuore(?:tta|ita|et|en|ita)?\b/.test(recipeSource);
 if(explicitlyFresh&&/pakast|kuivatt/.test(name+" "+category))return "fresh_ingredient_required";

 if(["ruokaöljy","rypsiöljy","oliiviöljy"].includes(term)&&/basilika|chili|valkosipuli|sitruuna|yrtti|tryffeli/.test(name)&&!/basilika|chili|valkosipuli|sitruuna|yrtti|tryffeli/.test(requirement))return "plain_oil_required";
 if(term==="voi"&&(/sips|chips|peruna|mun[aa]|levite|flora|rasvaseos/.test(name)||category.includes("/")&&!/\/voit$/.test(category)))return "butter_product_required";
 const spiceTerms=["suola","merisuola","maustepippuri","mustapippuri","valkopippuri","laakerinlehti","curry","juustokumina","kardemumma","kaneli","oregano","paprikajauhe","basilika","timjami","korianteri","persilja","chilihiutale","pizzamauste","välimeren yrttiseos","sormisuola"];
 if(spiceTerms.includes(term)&&(/liha|broileri|snack|sips|leip|keksi|riisikak|maissikak|suklaa|jaatel|jäätel|rasvalev|ranskanker|valmisruoka|juoma/.test(category)||/riisikak|maissikak|keksi|sips|chips|suklaa|pretzel|korppu|näkk|leipä|flatbread|levite|\bjuusto\b|tuorejuusto|hillo|puuro|murska|öljy|pesto|sinappi|etikka|kastike|maissitikku|couscous|uunifeta|broiler|\bkana\b|kanan|pähkin|oliivi|jäätel|ateria|keitto/.test(name)))return "spice_category_required";
 if(["sokeri","fariinisokeri","ruokosokeri","vaniljasokeri","tomusokeri"].includes(term)&&/liha|broileri|snack|sips|leip|keksi|riisikak|maissikak|suklaa|jaatel|jäätel|rasvalev|ranskanker|valmisruoka|juoma|jogur/.test(category))return "sugar_category_required";
 if(["suola","merisuola"].includes(term)){
   if(category.includes("/")&&!/(?:^|\/)(?:suola|suolat|merisuola|muu-suola)(?:\/|$)/.test(category))return "salt_category_required";
   if(/chilillä|valkosipulilla|yrtti|maustettu|savustettu/.test(name)&&!/chili|valkosipuli|yrtti|maustettu|savu/.test(requirement))return "plain_salt_required";
   if(/riisikak|maissikak|keksi|sips|chips|lastu|snack|suklaa|pretzel|korppu|näkk|leip|flatbread|levite|oivariini|ingmariini|broiler|kanan|manteli|pähkin|oliivi|kinuski|jäätel|siemen|härkäpapu|mausteseos|grillimauste|merisuolavoi|b\+tter/.test(name))return "salt_product_required";
 }
 if(["basilika","timjami","korianteri","persilja","tilli","oregano"].includes(term)){
   if(category.includes("/")&&!/^(?:hedelmat-ja-vihannekset|mausteet-ja-maustaminen|pakasteet\/vihannes)/.test(category))return "herb_category_required";
   if(/^ca[a-z]+$/.test(category)&&!/^caaaa|^caabq|^caabgbaak/.test(category))return "herb_category_required";
 }
 if(term==="inkivääri"&&/smuuti|smoothie|välipala|siirappi|hapankaali|sima|liquid|mausteseos|säilötty|elektrolyyt/.test(name))return "ginger_ingredient_required";
 if(produceTerms.includes(term)&&/mix|sekoitus/.test(name)&&!/mix|sekoitus/.test(requirement))return "single_vegetable_required";
 if(["basilika","timjami","korianteri","persilja","tilli","oregano","inkivääri"].includes(term)){
   const dried=/kuivatt|jauhett/.test(requirement)||(!/tuore/.test(requirement)&&/\b(?:tl|rkl)\b/.test(context?.sourceLine||"")&&term!=="tilli"&&!/hienonnet|lehti/.test(requirement));
   const productDried=/kuivatt|jauhett|\bjauh\b|mauste|purkki|\bpussi\b|meira|santa maria|\b\d+(?:[,.]\d+)?\s*g\b/.test(name)&&!/tuore|ruukku|rkk|pakast/.test(name)||/^caabgbaak/.test(category)||category.includes("/mauste");
   if(dried&&(!productDried||/liquid/.test(name)))return "dried_or_ground_ingredient_required";
   if(/tuore/.test(requirement)&&productDried)return "fresh_ingredient_required";
   if(/hienonnet/.test(recipeSource)&&productDried)return "fresh_or_raw_frozen_herb_required";
 }
 if(term==="tilli"){
   if(/sips|perunalastu|oliivi|creme fraiche|ranskankerma|peruna|valmisruoka/.test(name+" "+category))return "herb_product_required";
   const dried=/kuivatt|mauste|purkki|\bpussi\b/.test(name+" "+category)||/^caabgbaak/i.test(category);
   if(/kuivatt/.test(requirement)&&!dried)return "dried_herb_required";
   if(!/kuivatt/.test(requirement)&&/hienonnet|tuore/.test(requirement)&&dried)return "fresh_or_raw_frozen_herb_required";
 }
 if(/kermaviili/.test(term)&&/laktoosito/.test(requirement)&&!/laktoosito/.test(name))return "lactose_free_requirement_missing";
 for(const [requested, offered] of [[/ruohosipuli/,/ruohosipuli/],[/italian yrt/,/italian yrt/],[/voimakas/,/voimakas/],[/hunajamarinoit/,/hunajamarinoit/],[/emmental.*mozzarella/,/emmental.*mozzarella|mozzarella.*emmental/]] as Array<[RegExp,RegExp]>) {
   if(requested.test(requirement)&&!offered.test(name))return "requested_flavour_required";
 }
 if(context?.wholeSpice&&/jauhe|\bjauh\b|rouh/.test(name))return "whole_spice_required";
 if(/laktoosito|\beila/.test(requirement)&&! /laktoositon|laktoositonta/.test(name))return "lactose_free_requirement_missing";
 if(/gluteenito/.test(requirement)&&! /gluteeniton|gluteenitonta/.test(name))return "gluten_free_requirement_missing";
 if(/maustamaton/.test(requirement)&&! /maustamaton|maustamattom/.test(name))return "unseasoned_requirement_missing";
 if(/esikeitet/.test(requirement)&&! /esikeitet|kypsä|kypsennet|säilyke|sailykkeet|tetra|\d+\s*g?\s*\/\s*\d+/.test(name+" "+category))return "precooked_requirement_missing";
 if(/tuoretta inkivääriä/.test(requirement)&&/jauhe|mauste/.test(name))return "fresh_ginger_required";
 if(/kokonaista maustepippuria/.test(requirement)&&/jauhett/.test(name))return "whole_allspice_required";
 if(/pippur|juustokumin|kardemumm|kanel/.test(term)){
   if(/kokonai/.test(requirement)&&/jauhett|rouhittu/.test(name))return "whole_spice_required";
   if(/jauhett/.test(requirement)&&/kokonai/.test(name))return "ground_spice_required";
 }
 return null;
}

export function recipeProductCompatible(input:string,product:{name?:string;category?:string},context?:RecipeContext):boolean {
 return recipeProductRejectionReason(input,product,context)===null;
}

function isRawRecipeFish(term:string|null):boolean {
 return term!==null&&["silakka","silakkafilee","lohifilee","kirjolohifilee"].includes(term);
}
/** Freshness tier precedes price; an uncooked frozen fish remains a fallback. */
export function recipeFishFreshnessTier(input:string,product:{name?:string;category?:string},context?:RecipeContext):number {
 const protein=context?.proteinRequirement||inferRecipeProtein(input);
 if(protein&&protein.storage!=="prefer_fresh")return 0;
 if(!protein&&!isRawRecipeFish(recipeProductSearchTerm(input)))return 0;
 return /pakast|frozen/i.test((product.name||"")+" "+(product.category||""))?1:0;
}
export function prioritizeRecipeFishProducts<T extends {name?:string;category?:string}>(input:string,products:T[],context?:RecipeContext):T[] {
 const term=recipeProductSearchTerm(input);
 const salt=/suola/.test(term||"");
 const herb=["tilli","persilja","basilika","korianteri","timjami","oregano"].includes(term||"")&&/tuore|hienonnet/i.test(input+" "+String(context?.sourceLine||""))&&!/kuivatt/i.test(input);
 return products.map((product,index)=>({product,index,tier:herb?(/mauste|kuivatt|purkki|^caabgbaak/i.test((product.name||"")+" "+(product.category||""))||/^caabgbaak/i.test(product.category||"")?2:/pakast/i.test((product.name||"")+" "+(product.category||""))?1:0):salt&&/karke/i.test(input)?(/karkea|coarse/i.test(product.name||"")?0:/hieno|fine/i.test(product.name||"")?2:1):recipeFishFreshnessTier(input,product,context)})).sort((a,b)=>a.tier-b.tier||a.index-b.index).map(x=>x.product);
}
