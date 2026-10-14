/** Recipe-only canonicalization. Preserve the ingredient type before looking at price. */
export type RecipeFoodGroup = { ingredient: string; mainGroup: string; subGroup: string; searchTerm: string };
type Kind = { term: string; pattern: RegExp; product: RegExp; group: string; exclude?: RegExp };
const kinds: Kind[] = [
 {term:"koskenlaskija ruoka dippi jalapeno cheddar",pattern:/koskenlaskija.*ruoka.*dipp/,product:/koskenlaskija.*ruoka.*dipp.*jalapeno/,group:"Juustovalmisteet"},
 {term:"koskenlaskija viherpippuri sulatejuusto",pattern:/koskenlaskija.*viherpippuri.*sulatejuusto/,product:/koskenlaskija.*viherpippuri/,group:"Sulatejuustot"},
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
 {term:"kuorittu tomaatti",pattern:/kuoritt.*tomaat/,product:/kuorit.*tomaatti/,group:"Tomaattisäilykkeet"},
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
 {term:"peruna",pattern:/^perun/,product:/\bperuna\b|perunoita/,exclude:/muusi|lastu|sipsi|ranskan|keitto|salaatti|laatikko/,group:"Kasvikset"},
 {term:"porkkana",pattern:/porkkan/,product:/\bporkkana\b/,exclude:/kakku|mehu|sose|keitto/,group:"Kasvikset"},
 {term:"kalamataoliivi",pattern:/kalamataoliiv/,product:/kalamata.*oliivi|oliivi.*kalamata/,group:"Säilykkeet"},
 {term:"punainen linssi esikeitetty",pattern:/esikeitet.*punais.*linss/,product:/punai.*linssi/,exclude:/kuivattu|linssikeitto|linssipasta/,group:"Palkokasvit"},
 {term:"punainen linssi",pattern:/punais.*linss|punainen linssi/,product:/punai.*linssi/,exclude:/keitto|pasta|sipsi/,group:"Palkokasvit"},
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
 {term:"tomusokeri",pattern:/tomusoker/,product:/tomusokeri/,group:"Sokerit"},
 {term:"taloussokeri",pattern:/^(?:sokeri|sokeria|taloussokeri)$/,product:/taloussokeri|\bsokeri\b|hienosokeri/,exclude:/vanilja|tomu|fariini|hillo|vartalo|kuorinta|karvanpoisto/,group:"Sokerit"},
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
 {term:"maito",pattern:/^maitoa?$|kevytmaito|täysmaito/,product:/\bmaito\b|kevytmaito|täysmaito|rasvaton maito/,exclude:/jauhe|suklaa|kookos|kaura|soija|manteli|kondensoitu|juoma/,group:"Maidot"},
 {term:"voi",pattern:/^voita?$/,product:/\bvoi\b|meijerivoi/,exclude:/taikina|voide|vartalo|kasvo|keksi|margariini/,group:"Rasvat"},
];
function cleanName(input: string): string {
 return input.toLocaleLowerCase("fi").replace(/[™®]/g,"").replace(/^[•*–-]+\s*/,"")
 .replace(/\([^)]*\)/g," ").replace(/,\s*(?:esim\.|msc-sertifioitu).*$/,"").replace(/,\s*/g," ")
 .replace(/^(?:(?:valio|pirkka|parhaat|k-menu|snellman|kunnon|vikkelät|keittiön|luomu|kreikkalaista|tuoretta|hienonnettua|kuivattua|kokonaista|jauhettua|iso|pieni|pala|cm)\s+)+/g,"")
 .replace(/\s+\d+(?:[,.]\d+)?\s*%/g,"").replace(/\s+\d+(?:[,.]\d+)?\s*(?:kg|g|ml|dl|l)\b/g,"")
 .replace(/\s+(?:rasvaa|lohkoina|kuutioina|pieninä kuutioina)$/g,"").replace(/\s+/g," ").trim();
}
export function recipeProductSearchTerm(input: string): string | null {
 const name=cleanName(input);
 if(/(?:laatikko|keitto|piirakka|pannukakku|korvapuusti|salaatti|kanapasta|tonnikalapasta|linssicurry)/.test(name))return name;
 if(!name||/^(?:vesi|vettä|veden|pastan keitinvet|keitinvet)/.test(name))return null;
 return kinds.find(x=>x.pattern.test(name))?.term||name;
}
export function classifyRecipeIngredient(input: string): RecipeFoodGroup | null {
 const term=recipeProductSearchTerm(input);const kind=kinds.find(x=>x.term===term);
 return kind?{ingredient:kind.term,searchTerm:kind.term,mainGroup:kind.group,subGroup:kind.group}:null;
}
/** Unknown ingredients require a literal match, never an arbitrary cheapest item. */
export function recipeProductRejectionReason(input: string, product: { name?: string; category?: string }): string | null {
 const term=recipeProductSearchTerm(input);if(!term)return "not_purchasable_ingredient";
 const requirement=input.toLocaleLowerCase("fi");
 const name=String(product.name||"").toLocaleLowerCase("fi");const category=String(product.category||"").toLocaleLowerCase("fi");
 if(/kosmeti|hygienia|siivous|pesuaine|vartalo|karvanpoisto|ihonhoito|lemmik|kissan|kissoille|koiran|koirille|täysravinto|eläinruoka/.test(name+" "+category))return "non_food_product";
 if(isRawRecipeFish(term)){
   if(/valmisruoka|kalajaloste|sillit-ja-anjovikset|säilyke/.test(category)||/laatikko|keitto|pihvi|pyörykk|pullat|rulla|salaatti|paistett|kypsennet|savust|savu|graav|marino|suutarinlohi|säilyke|kastik|loimut|palv|sushi|suolattu|etikka|sinappi/.test(name))return "raw_fish_required";
 }
 const kind=kinds.find(x=>x.term===term);
 if(kind&&(!kind.product.test(name)||kind.exclude?.test(name)))return "ingredient_product_type_mismatch";
 if(!kind&&!term.split(" ").every(word=>name.includes(word)))return "unknown_ingredient_literal_match_missing";
 if(/laktoosito/.test(requirement)&&! /laktoositon|laktoositonta/.test(name))return "lactose_free_requirement_missing";
 if(/gluteenito/.test(requirement)&&! /gluteeniton|gluteenitonta/.test(name))return "gluten_free_requirement_missing";
 if(/maustamaton/.test(requirement)&&! /maustamaton|maustamattom/.test(name))return "unseasoned_requirement_missing";
 if(/esikeitet/.test(requirement)&&! /esikeitet|kypsä|kypsennet|säilyke|tetra/.test(name+" "+category))return "precooked_requirement_missing";
 if(/tuoretta inkivääriä/.test(requirement)&&/jauhe|mauste/.test(name))return "fresh_ginger_required";
 if(/kokonaista maustepippuria/.test(requirement)&&/jauhett/.test(name))return "whole_allspice_required";
 if(/pippur|juustokumin|kardemumm|kanel/.test(term)){
   if(/kokonai/.test(requirement)&&/jauhett|rouhittu/.test(name))return "whole_spice_required";
   if(/jauhett/.test(requirement)&&/kokonai/.test(name))return "ground_spice_required";
 }
 return null;
}

export function recipeProductCompatible(input:string,product:{name?:string;category?:string}):boolean {
 return recipeProductRejectionReason(input,product)===null;
}

function isRawRecipeFish(term:string|null):boolean {
 return term!==null&&["silakka","silakkafilee","lohifilee","kirjolohifilee"].includes(term);
}
/** Freshness tier precedes price; an uncooked frozen fish remains a fallback. */
export function recipeFishFreshnessTier(input:string,product:{name?:string;category?:string}):number {
 if(!isRawRecipeFish(recipeProductSearchTerm(input)))return 0;
 return /pakast|frozen/i.test((product.name||"")+" "+(product.category||""))?1:0;
}
export function prioritizeRecipeFishProducts<T extends {name?:string;category?:string}>(input:string,products:T[]):T[] {
 return products.map((product,index)=>({product,index,tier:recipeFishFreshnessTier(input,product)})).sort((a,b)=>a.tier-b.tier||a.index-b.index).map(x=>x.product);
}
