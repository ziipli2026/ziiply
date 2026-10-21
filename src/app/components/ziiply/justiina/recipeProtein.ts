import { recipeCategory } from "./recipeCategories";
/** Preparation and storage are separate: a retail tray may contain fresh raw meat. */
export type RecipeProteinRequirement={family:"fish"|"meat";species:string;processing:"raw"|"cooked"|"smoked"|"cured"|"canned";storage:"fresh"|"frozen"|"prefer_fresh";marinated:boolean;unseasoned:boolean;marinade?:string|null;cut:string|null;searchTerm:string;basis:string};
const species:Array<{id:string;family:"fish"|"meat";pattern:RegExp;query:string}>=[
 {id:"nauta-sika",family:"meat",pattern:/nauta-sika|sika-nauta|naudan.*sian|sian.*naudan/,query:"nauta-sikajauheliha"},
 {id:"kirjolohi",family:"fish",pattern:/kirjoloh/,query:"kirjolohifilee"},
 {id:"lohi",family:"fish",pattern:/lohi|lohta|lohen/,query:"lohifilee"},
 {id:"silakka",family:"fish",pattern:/silak/,query:"silakka"},
 {id:"seiti",family:"fish",pattern:/seiti|seitä|seitifile/,query:"seiti"},
 {id:"turska",family:"fish",pattern:/tursk/,query:"turska"},
 {id:"kuha",family:"fish",pattern:/kuhaa?|kuhan/,query:"kuha"},
 {id:"ahven",family:"fish",pattern:/ahven/,query:"ahven"},
 {id:"siika",family:"fish",pattern:/siika|siikaa|siian/,query:"siika"},
 {id:"tonnikala",family:"fish",pattern:/tonnikala/,query:"tonnikala"},
 {id:"kana",family:"meat",pattern:/broiler|kanan|\bkanaa?\b/,query:"broileri"},
 {id:"kalkkuna",family:"meat",pattern:/kalkkun/,query:"kalkkuna"},
 {id:"sika",family:"meat",pattern:/porsaa|porsas|sian|sika/,query:"porsaanliha"},
 {id:"nauta",family:"meat",pattern:/naudan|nauta|nautaa/,query:"naudanliha"},
 {id:"lammas",family:"meat",pattern:/lampaa|lammas|karitsa/,query:"lampaanliha"},
 {id:"hirvi",family:"meat",pattern:/hirve|hirvi/,query:"hirvenliha"},
 {id:"poro",family:"meat",pattern:/poron|poroa|\bporo\b/,query:"poronliha"},
 {id:"jauheliha",family:"meat",pattern:/jauhelih/,query:"jauheliha"},
];
const meal=/keitto|laatikko|lasagne|pizza|salaatti|ateria|kastik|kalapuikko|nugget|pyörykk|silakkapihvi|kalapihvi|kalapulla|kalajaloste|kalakukko|lohikukko|patonki|leipä|sushi|levite|suutarinlohi|silakkarulla/;
function identity(name:string){
 if(/mauste|liemi|liemikuutio|kananmuna|kananmunia|sikuri/.test(name))return undefined;
 return species.find(x=>x.pattern.test(name));
}
export function inferRecipeProtein(name:string,instructions="",sourceLine=name):RecipeProteinRequirement|null{
 if(recipeCategory(name))return null;
 const input=name.toLocaleLowerCase("fi"),food=identity(input);if(!food||meal.test(input))return null;
 const clauses=instructions.toLocaleLowerCase("fi").split(/[.!?\n]/).filter(x=>food.pattern.test(x)||(food.family==="fish"&&/\bkala/.test(x))||(food.family==="meat"&&/\bliha/.test(x)));
 const context=clauses.join(" ");
 const processing=/säilyke/.test(input)||(/tonnikala/.test(input)&&/\b(?:prk|tlk|tölkki|purkki)\b/.test(sourceLine))?"canned":/savu|savust/.test(input)?"smoked":/graav/.test(input)?"cured":/kypsä|kypsää|kypsennetty|paistettu|keitetty|grillattu/.test(input)?"cooked":/kypsää|valmiiksi kyps|valmiiksi paistett/.test(context)?"cooked":"raw";
 const storage=/pakast/.test(input)?"frozen":/tuore|jäähdytetty/.test(input)?"fresh":/sulata|sulatettu|pakast/.test(context)?"frozen":"prefer_fresh";
 const cut=/jauhelih/.test(input)?"jauheliha":/fileesuikale/.test(input)?"fileesuikale":/suikale/.test(input)?"suikale":/file|filee/.test(input)?"file":/rinta/.test(input)?"rinta":/pihvi/.test(input)?"pihvi":null;
 const base=cut==="jauheliha"&&food.id==="kana"?"kananjauheliha":food.id==="silakka"&&cut==="file"?"silakkafilee":food.query;
 const searchTerm=(storage==="frozen"?"pakaste ":"")+(processing==="smoked"?"savulohi".replace("lohi",food.id):processing==="cured"?"graavi"+food.id:processing==="cooked"?"kypsä "+(food.id==="kana"?"kana":base):base);
 return {family:food.family,species:food.id,processing,storage,marinated:/marinoit/.test(input),marinade:/hunajamarinoit/.test(input)?"hunaja":null,unseasoned:/maustamaton|maustamatonta|maustamattom/.test(input),cut,searchTerm,basis:processing!=="raw"?"ingredient_or_matching_instruction":storage==="frozen"?"ingredient_or_thaw_instruction":"raw_default"};
}
export function proteinProductRejection(required:RecipeProteinRequirement,product:{name?:string;category?:string}):string|null{
 const name=(product.name||"").toLocaleLowerCase("fi"),category=(product.category||"").toLocaleLowerCase("fi"),text=name+" "+category;
 const food=species.find(x=>x.id===required.species)!;
 if(!food.pattern.test(name))return "protein_species_mismatch";
 if(required.species==="lohi"&&/kirjoloh/.test(name))return "protein_species_mismatch";
 if(required.species==="nauta"&&/sika|porsaa/.test(name)&&! /sika/.test(required.searchTerm))return "protein_species_mismatch";
 if(meal.test(name)||/valmisruoka/.test(category))return "ready_meal_is_not_ingredient";
 const cooked=/kypsä|kypsennet|paistett|keitett|grillatt|loimut|palv/.test(name),smoked=/savu|savust/.test(name),cured=/graav/.test(name);
 const canned=/säilyke|sillit-ja-anjovikset/.test(category)||/säilyke|tonnikala.*(?:paloina|öljyssä|vedessä)|suolaliem/.test(name);
 if(required.processing==="raw"&&(cooked||smoked||cured||canned||/kalajaloste|leikkele|makkara|lihavalmiste|kypsät|kypsat/.test(category)))return "raw_protein_required";
 if(required.processing==="cooked"&&!cooked)return "cooked_protein_required";
 if(required.processing==="smoked"&&!smoked)return "smoked_protein_required";
 if(required.processing==="cured"&&!cured)return "cured_protein_required";
 if(required.processing==="canned"&&!canned)return "canned_protein_required";
 const frozen=/pakast|frozen/.test(text);
 if(required.storage==="frozen"&&!frozen)return "frozen_protein_required";
 if(required.storage==="fresh"&&frozen)return "fresh_protein_required";
 if(required.species==="kana"&&/nauta|porsaa|sika|kalkkuna/.test(name))return "protein_species_mismatch";
 if(required.cut&&!(required.cut==="fileesuikale"?/file.*suikale|suikale.*file/.test(name):new RegExp(required.cut).test(name)))return "protein_cut_mismatch";
 if(!required.marinated&&required.processing==="raw"&&/marinoitu|teriyaki|hunaja/.test(name))return "unmarinated_protein_required";
 if(required.marinated&&!/marinoit/.test(name))return "marinated_protein_required";
 if(required.marinade&&!name.includes(required.marinade))return "requested_marinade_required";
 if(required.unseasoned&&!/maustamaton|maustamattom/.test(name))return "unseasoned_requirement_missing";
 return null;
}
