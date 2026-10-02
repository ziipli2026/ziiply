#!/usr/bin/env node
// Conservative category-first filter. No database writes.
import {readFileSync,writeFileSync} from "node:fs";
const data=JSON.parse(readFileSync("tokmanni-spar-ean-gap.json","utf8"));
const reject=/auto(?:n|ilu|tarvik)|moottori|polttoaine|öljyt? [0-9]|työkalu|rakennus|remont|maali|liima|teippi|sähkö|elektron|paristo|akku|puhelin|tietokone|pelitarvik|urheiluväline|kuntoilu|retkeil|kalast|metsäst|puutarha|kasvi|siemen|lannoit|sisustus|verho|matto|valaisin|huonekalu|kodintekni|keittiöväline|astia(?:t|sto)|muki|termos|pilli(?:muki)|vaate|sukka|kenkä|asuste|laukku|lelu|askartel|koriste|kynttil|sauna(?:tarvike)|pyyhe|lakana|peitto|tyyny|lemmikin lelu|talutin|panta|häkki|akvaario|lintujen ruokinta|rasvasiementanko/i;
const allow=/elintarv|ruoka|juoma|maito|jogurt|juusto|rahka|kerma|voi(?:t|levit)|leip|leivon|keksi|makeis|suklaa|kark|purukumi|pastill|snack|sips|pähkin|hedelm|marja|kasvis|vihannes|mauste|kastike|säilyk|kahvi|tee(?:t|juoma)|kaakao|mehu|limonad|virvoitus|energiajuom|vesi(?:pull|juom)|pasta|riisi|muro|puuro|jauho|soker|suola|öljy(?:t)?(?: ja etikat)?|etikka|proteiinijauhe|ravintolis|vitamiin|lastenruoka|äidinmaidonkorv|vaippa|terveysside|pikkuhousunsuoja|tampon|hammastahna|hammasharja|suunhoito|shampoo|hoitoaine|deodorant|suihkusaippua|nestesaippua|ihonhoito|kasvojen|kosmeti|meikki|pesuaine|pyykinpes|huuhteluaine|tiskiaine|konetiski|wc-paper|talouspaper|roskapuss|jätesäk|puhdistusaine|siivousaine|kissan (?:märkä|kuiva|ruoka|makupala)|koiran (?:märkä|kuiva|ruoka|makupala)|puruluu|lemmikin ruoka/i;
const accepted=[],excluded=[],review=[];
for(const item of data.items){
 const category=String(item.category||"").toLocaleLowerCase("fi-FI");
 const name=String(item.name||"").toLocaleLowerCase("fi-FI");
 // Category is authoritative; search-term/name keyword alone never admits a product.
 const parts=category.split(";;").map(s=>s.trim()).filter(Boolean);
 const hasReject=parts.some(p=>reject.test(p)) || (parts.length===0 && reject.test(name));
 const hasAllow=parts.some(p=>allow.test(p));
 const enriched={...item,filterReason:hasReject?"department-store category":hasAllow?"allowed daily category":"category not confirmed"};
 if(hasReject) excluded.push(enriched);
 else if(hasAllow) accepted.push(enriched);
 else review.push(enriched);
}
const csv=(items)=>["ean,name,brand,category,url,query",...items.map(x=>[x.ean,x.name,x.brand,x.category,x.url,x.query].map(v=>'"'+String(v??"").replaceAll('"','""')+'"').join(","))].join("\n");
writeFileSync("tokmanni-spar-filtered-daily-candidates.csv",csv(accepted));
writeFileSync("tokmanni-spar-excluded-department-store.csv",csv(excluded));
writeFileSync("tokmanni-spar-manual-review.csv",csv(review));
const summary={comparisonPerformed:data.summary.comparisonPerformed,uniqueFound:data.items.length,acceptedDailyCandidates:accepted.length,excludedDepartmentStore:excluded.length,manualReview:review.length,warning:"Candidate classification only; no Neon comparison or insertion. Manual review is NOT admitted."};
writeFileSync("tokmanni-spar-filter-summary.json",JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
