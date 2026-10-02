#!/usr/bin/env node
// Merge audit snapshots by EAN. Classification is metadata only; NEVER writes Neon.
import {readFileSync,writeFileSync} from "node:fs";
const history=JSON.parse(readFileSync("tokmanni-spar-historical-neon.json","utf8")).items;
const gap=JSON.parse(readFileSync("tokmanni-spar-ean-gap.json","utf8")).items;
const clean=v=>String(v??"").trim();
const digits=v=>/^[0-9]{8,14}$/.test(v);
const reject=/auto|vanne|rengas|tuulilas|moottori|työkalu|rakennus|maali|liima|sähkö|elektron|paristo|akku|puhelin|tietokone|urheiluväline|retkeil|kalast|metsäst|puutarha|lannoit|sisustus|verho|valaisin|huonekalu|kodintekni|keittiöväline|astiasto|ruokailuastia|muki|termos|vaate|sukka|kenkä|asuste|laukku|lelu|askartel|koriste|kynttil|pyyhe|lakana|peitto|tyyny|talutin|panta|häkki|akvaario/i;
const matCategory=/(?:^|[;,\s])matto(?:$|[;,\s])/i;
const knownCategoryConflicts=new Set(["4008429037894","6414505163414"]);
const rules=[
["Lemmikit",/kissan|koiran|lemmik|puruluu/],["Lastenruoat",/lastenruok|vauvanruok|äidinmaidonkorv/],
["Hygienia & kosmetiikka",/hammastahn|hammasharj|deodorant|suihkusaipp|nestesaipp|shampoo|hiustenhoito|terveyssite|tampon|vaipat|ihonhoito|kosmetiik|aurinkosuoja|suunhoito/],
["Kodinhoito",/tiskiaine|astianpesu|pyykinpes|huuhteluaine|wc-paper|talouspaper|roskapuss|jätesäk|leivinpaper|alumiinifolio|siivousaine|puhdistusaine/],
["Makeiset & keksit",/keksit|suklaa|karkki|makeiset|purukumi|pastillit/],["Leipomo",/näkkileiv|leipä|korppu|leivonnais|pullat/],
["Kahvi & tee",/kahvi|pussiteet|irtoteet|teejuom|kaakao/],["Juomat",/mehujuom|virvoitusjuom|energiajuom|kivennäisves|juomaves|smoothie|mehutiivist/],
["Kuivatuotteet",/perunalast|snacks|pähkin|kuivatut hedelm|maustepuss|maustepurk|pasta|makaron|riisi|jauhot|sokerit|säilyk|ruokaöljy|etikat|kastikkeet|murot|myslit|hiutaleet/],
["Vitamiinit & ravinteet",/vitamiinit|ravintolisät|proteiinijauheet|kivennäisaineet|urheiluravinteet/],
["Pakasteet",/jäätelöt|pakastevihannek|pakastemarj|pakasteruoka/],["Valmisruoka",/valmisateriat|valmisruoat|keitot|pizzat/],
["Maitotuotteet",/maidot|jogurtit|juustot|rahkat|kermat|kananmunat/],["Hevi",/tuoreet hedelmät|tuoreet vihannekset|perunat|sipulit/],
["Liha & makkarat",/makkarat|leikkeleet|jauhelihat|tuore liha/],["Kala",/tuore kala|kalafileet/]];
const map=new Map();
for(const item of history){const ean=clean(item.ean);if(digits(ean))map.set(ean,{...item,ean,existingInNeon:true});}
let overlap=0;
for(const item of gap){const ean=clean(item.ean);if(!digits(ean))continue;const prev=map.get(ean);if(prev){overlap++;map.set(ean,{...item,...prev,ean,providerCategory:clean(item.category),existingInNeon:true});}else map.set(ean,{...item,ean,existingInNeon:!!item.alreadyInEanBank});}
const counts={daily:0,department_store:0,review:0};
const result=[];
for(const item of map.values()){
 const provider=clean(item.providerCategory||item.category).toLocaleLowerCase("fi-FI");
 const productName=clean(item.name).toLocaleLowerCase("fi-FI");
 const definiteNonGrocery=/lannoit|puutarhamulta|kasvualusta/.test(productName);
 const cosmeticMilk=/\b(?:puhdistusmaito|suihkumaito|kylpymaito|vartalomaito|kasvomaito|aurinkomaito|hiusmaito)\b/.test(productName);
 const explicitFoodMilk=/\b(?:kondensoitu maito|maitojauhe|kevytmaitojuoma|rasvaton maitojuoma|annosmaito)\b/.test(productName);
 const existing=clean(item.existingInNeon?item.category:"");
 const existingDaily=new Set(rules.map(([label])=>label));
 const categoryIsExistingDaily=item.existingInNeon&&existingDaily.has(existing);
 const match=[...new Set(rules.filter(([,re])=>re.test(provider)).map(([name])=>name))];
 let productClass="review",suggestedCategory="";
 if(definiteNonGrocery){productClass="department_store";suggestedCategory="";}
 else if(cosmeticMilk){productClass="daily";suggestedCategory="Hygienia & kosmetiikka";}
 else if(explicitFoodMilk){productClass="daily";suggestedCategory="Maitotuotteet";}
 else if(knownCategoryConflicts.has(item.ean)){productClass="review";suggestedCategory="";}
 else if(categoryIsExistingDaily){productClass="daily";suggestedCategory=existing;}
 else if(reject.test(provider)||matCategory.test(provider))productClass="department_store";
 else if(match.length===1){productClass="daily";suggestedCategory=match[0];}
 // Historical categories are preserved, but never silently treated as verified.
 counts[productClass]++;
 result.push({...item,productClass,suggestedCategory,existingCategory:existing,classificationEvidence:definiteNonGrocery?"explicit non-grocery name override; historical category preserved":cosmeticMilk?"explicit cosmetic milk name override":explicitFoodMilk?"explicit food milk name override":knownCategoryConflicts.has(item.ean)?"known historical category conflict; manual review":categoryIsExistingDaily?"existing Ziiply category":provider?"provider category":"requires historical review"});
}
result.sort((a,b)=>a.ean.localeCompare(b.ean));
writeFileSync("tokmanni-spar-merged-classification.json",JSON.stringify({summary:{historicalRows:history.length,gapRows:gap.length,overlap,uniqueEans:result.length,...counts,neonWrites:0},items:result},null,2));
console.log(JSON.stringify({historicalRows:history.length,gapRows:gap.length,overlap,uniqueEans:result.length,...counts,neonWrites:0},null,2));
