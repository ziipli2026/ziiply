#!/usr/bin/env node
// Conservative category-first filter. No database writes.
import {readFileSync,writeFileSync} from "node:fs";
const data=JSON.parse(readFileSync("tokmanni-spar-ean-gap.json","utf8"));
// Only Ziiply Gösta's existing daily-goods categories; no Koti & vapaa-aika / Muut.
// Klevu's specific category is the authority, never the search query or name alone.
const categoryRules=[
["Lemmikit",/^(?:kissan|koiran|lemmikin|lemmikkien) (?:märkäruoka|kuivaruoka|ruoka|makupala|puruherk|erikoisruokavalio|ravintolisä)|^puruluut/],
["Lastenruoat",/^lastenruoka|^lasten (?:ruoka|välipala|sose|puuro)|^äidinmaidonkorv|^vauvanruoka/],
["Hygienia & kosmetiikka",/hammastahn|hammasharj|deodorant|peseytyminen|suihkusaipp|nestesaipp|shampoo|hiustenhoitoaine|hiusnaamio|terveyssite|pikkuhousunsuoj|tampon|teippivaip|vaipat|kasvovoide|ihonhoito|meikin|kosmetiik|aurinkosuoja|suunhoito/],
["Kodinhoito",/käsitiskiaine|konetiski|astianpesu|pyykinpes|pyykinhuuhtel|huuhteluaine|wc-paper|talouspaper|roskapuss|jätesäk|leivinpaper|alumiinifolio|siivousaine|yleispuhdistus|kodin puhdistus/],
["Makeiset & keksit",/makeat keksit|suolaiset keksit|suklaa|karkki|makeiset|purukumi|pastillit/],
["Leipomo",/näkkileiv|leipä|korppu|leivonnais|pullat/],
["Kahvi & tee",/kahvi|pussiteet|irtoteet|teejuom|kaakao/],
["Juomat",/mehujuom|virvoitusjuom|energiajuom|kivennäisves|juomaves|smoothie|mehutiivist/],
["Kuivatuotteet",/perunalast|snacks|pähkin|kuivatut hedelm|kuivatut marj|maustepuss|maustepurk|pasta|makaron|riisi|jauhot|sokerit|säilyk|ruokaöljy|etikat|kastikkeet|murot|myslit|hiutaleet/],
["Vitamiinit & ravinteet",/^(?:ihmisten |aikuisten |lasten )?(?:vitamiinit|ravintolisät|proteiinijauheet|kivennäisaineet|urheiluravinteet)/],
["Pakasteet",/jäätelöt|pakastevihannek|pakastemarj|pakasteruoka/],
["Valmisruoka",/valmisateriat|valmisruoat|keitot|pizzat/],
["Maitotuotteet",/maidot|jogurtit|juustot|rahkat|kermat|kananmunat/],
["Hevi",/tuoreet hedelmät|tuoreet vihannekset|perunat|sipulit/],
["Liha & makkarat",/makkarat|leikkeleet|jauhelihat|tuore liha/],
["Kala",/tuore kala|kalafileet/]
];
const reject=/auto|vanne|rengas|tuulilas|moottori|työkalu|rakennus|maali|liima|sähkö|elektron|paristo|akku|puhelin|tietokone|urheiluväline|retkeil|kalast|metsäst|puutarha|lannoit|sisustus|verho|matto|valaisin|huonekalu|kodintekni|keittiöväline|astiasto|ruokailuastia|muki|termos|pilli(?:muki)|vaate|sukka|kenkä|asuste|laukku|lelu|askartel|koriste|kynttil|pyyhe|lakana|peitto|tyyny|talutin|panta|häkki|akvaario|lintujen ruokinta/i;
const accepted=[],excluded=[],review=[];
for(const item of data.items){
 const category=String(item.category||"").toLocaleLowerCase("fi-FI");
 const name=String(item.name||"").toLocaleLowerCase("fi-FI");
 const parts=category.split(";;").map(s=>s.trim()).filter(Boolean);
 const blocked=parts.some(p=>reject.test(p));
 const matches=parts.flatMap(p=>categoryRules.filter(([,re])=>re.test(p)).map(([label])=>label));
 const unique=[...new Set(matches)];
 const enriched={...item,ziiplyCategory:unique.length===1?unique[0]:"",filterReason:blocked?"department-store category":unique.length===0?"not a mapped Gösta daily category":unique.length>1?"ambiguous category":"mapped Gösta daily category"};
 if(blocked) excluded.push(enriched);
 else if(unique.length===1) accepted.push(enriched);
 else review.push(enriched);
}
const csv=(items)=>["ean,name,brand,category,ziiplyCategory,url,query",...items.map(x=>[x.ean,x.name,x.brand,x.category,x.ziiplyCategory,x.url,x.query].map(v=>'"'+String(v??"").replaceAll('"','""')+'"').join(","))].join("\n");
writeFileSync("tokmanni-spar-filtered-daily-candidates.csv",csv(accepted));
writeFileSync("tokmanni-spar-excluded-department-store.csv",csv(excluded));
writeFileSync("tokmanni-spar-manual-review.csv",csv(review));
const summary={comparisonPerformed:data.summary.comparisonPerformed,uniqueFound:data.items.length,acceptedDailyCandidates:accepted.length,excludedDepartmentStore:excluded.length,manualReview:review.length,warning:"Candidate classification only; no Neon comparison or insertion. Manual review is NOT admitted."};
writeFileSync("tokmanni-spar-filter-summary.json",JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
