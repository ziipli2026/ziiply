import fs from "node:fs";
const d=JSON.parse(fs.readFileSync("data/lidl/public-observation-evidence-v1-2026-10-05.json","utf8"));
if(d.observations.length!==6) throw new Error("expected 6 observations");
if(d.observations.some(x=>x.checkoutPriceVerified===true)) throw new Error("public observations must never be checkout verified");
if(d.observations.some(x=>!x.sourceUrl.startsWith("https://www.lidl.fi/"))) throw new Error("source must be official Lidl.fi");
console.log("PASS: Lidl public observations are official-source, non-checkout evidence");
