#!/usr/bin/env node
/**
 * Isolated Tokmanni/Spar EAN-gap audit.
 * READ ONLY: never inserts/updates Neon. Writes only an audit artifact.
 *
 * Requires DATABASE_URL only when comparing against the existing EAN bank.
 * Klevu is queried with a deliberately broad grocery query matrix because
 * Tokmanni's catalogue is not a grocery-only catalogue.
 */
import { neon } from "@neondatabase/serverless";
import { writeFileSync } from "node:fs";

const KLEVU_SEARCH_URL = "https://eucs11.ksearchnet.com/cloud-search/n-search/search";
const KLEVU_TICKET = "klevu-15488592134928913";
const queries = [
  "maito","juusto","voi","kerma","jogurtti","rahka","kananmuna","liha","kana","kala",
  "makkara","leikkele","leipä","näkkileipä","paahtoleipä","jauho","sokeri","riisi","pasta",
  "makaroni","öljy","etikka","kastike","säilyke","tomaatti","kurkku","peruna","sipuli",
  "hedelmä","marja","kahvi","tee","kaakao","mehu","limu","virvoitusjuoma","energiajuoma",
  "vesi","olut","suklaa","karkki","makeinen","keksi","jäätelö","snack","pähkinä",
  "shampoo","hoitoaine","saippua","suihkugeeli","deodorantti","hammastahna",
  "wc-paperi","talouspaperi","pesuaine","astianpesuaine","pyykinpesuaine","huuhteluaine",
  "roskapussi","jätesäkki","vaippa","terveysside","pikkuhousunsuoja","lemmikki","koiranruoka",
  "kissanruoka","vitamiini","ravintolisä"
];

const clean = v => String(v ?? "").trim();
const ean = v => clean(v).replace(/D/g,"").match(/^\d{8,14}$/)?.[0] || "";
const price = v => Number(String(v ?? "").replace(",", ".")) || 0;

function classify(name, category) {
  const c = clean(category).toLocaleLowerCase("fi-FI");
  const n = clean(name).toLocaleLowerCase("fi-FI");
  if (/vaate|kodintekni|elektroni|työkalu|autot|puutarha|kalastus|lelu|sisustus|huonekalu|vapaa.?aika/.test(c)) return "tavaratalo";
  if (/ruoka|elintarv|juoma|päivittäis|hygienia|kosmetiikka|kodinhoito|lemmikki|ravintolis/.test(c)) return "daily";
  if (/maito|juusto|voi|jogurt|rahka|kananmun|liha|kana|kala|makkara|leip|jauho|sokeri|riisi|pasta|makaroni|öljy|etikka|kastike|säilyke|hedelmä|marja|kahvi|tee|kaakao|mehu|limu|virvoitus|vesi|suklaa|karkki|makei|keksi|jäätelö|snack|pähkinä|shampoo|hoitoaine|saippua|suihku|deodor|hammastahna|wc-paperi|talouspaperi|pesuaine|pyykin|astianpes|roskapussi|jätesäkki|vaippa|terveysside|pikkuhousunsuoja|lemmikki|koiranruoka|kissanruoka|vitamiini|ravintolis/.test(n)) return "daily";
  return "unknown";
}

async function fetchKlevu(q) {
  const u = new URL(KLEVU_SEARCH_URL);
  for (const [k,v] of Object.entries({
    ticket:KLEVU_TICKET, analyticsApiKey:KLEVU_TICKET, term:q,
    paginationStartsFrom:"0", noOfResults:"100", klevuSort:"rel",
    responseType:"json", category:"KLEVU_PRODUCT", visibility:"search",
    showOutOfStockProducts:"true", fetchMinMaxPrice:"true"
  })) u.searchParams.set(k,v);
  const r = await fetch(u,{headers:{accept:"application/json","user-agent":"Ziiply-EAN-Audit/1.0"},cache:"no-store"});
  if (!r.ok) throw new Error(`Klevu ${r.status} for ${q}`);
  const d=await r.json();
  return Array.isArray(d?.result)?d.result:[];
}

const found=new Map(), errors=[];
for (const q of queries) {
  try {
    for (const x of await fetchKlevu(q)) {
      const code=ean(x?.sku); if (!code) continue;
      const item={ean:code,name:clean(x?.name),brand:clean(x?.item_brand_name),category:clean(x?.category),url:clean(x?.url),classification:classify(x?.name,x?.category),query:q};
      const prev=found.get(code);
      if (!prev || (prev.classification==="unknown" && item.classification!=="unknown")) found.set(code,item);
    }
  } catch(e) { errors.push(String(e)); }
}

let existing=new Map();
if (process.env.DATABASE_URL) {
  const sql=neon(process.env.DATABASE_URL);
  const rows=await sql`SELECT ean,name,brand,category,source FROM ziiply_ean_products WHERE source ILIKE '%tokmanni%' OR source ILIKE '%spar%' OR source ILIKE '%klevu%' OR category IS NOT NULL`;
  existing=new Map(rows.map(x=>[String(x.ean),x]));
}
const rows=[...found.values()].map(x=>({...x,alreadyInEanBank:existing.has(x.ean),existingCategory:existing.get(x.ean)?.category||"",existingName:existing.get(x.ean)?.name||""}));
const summary={queried:queries.length,uniqueFound:rows.length,newDaily:rows.filter(x=>!x.alreadyInEanBank&&x.classification==="daily").length,alreadyDaily:rows.filter(x=>x.alreadyInEanBank&&x.classification==="daily").length,newDepartmentStore:rows.filter(x=>!x.alreadyInEanBank&&x.classification==="tavaratalo").length,newUnknown:rows.filter(x=>!x.alreadyInEanBank&&x.classification==="unknown").length,errors};
writeFileSync("tokmanni-spar-ean-gap.json",JSON.stringify({summary,items:rows},null,2));
writeFileSync("tokmanni-spar-ean-new-daily.csv",["ean,name,brand,category,url,query",...rows.filter(x=>!x.alreadyInEanBank&&x.classification==="daily").map(x=>[x.ean,x.name,x.brand,x.category,x.url,x.query].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(","))].join("\n"));
console.log(JSON.stringify(summary,null,2));
