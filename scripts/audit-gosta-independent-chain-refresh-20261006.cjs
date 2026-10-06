const fs=require("node:fs");
const s=fs.readFileSync("src/app/page.tsx","utf8");
const start=s.indexOf("// V825: if the selected offer store changes while Gösta is already open");
if(start<0) throw new Error("V825 independent-chain refresh block missing");
const block=s.slice(start,start+2600);
const checks=[
 ["Tokmanni dependency",block.includes("selectedTokmanniStoreV756?.id")&&block.includes("selectedTokmanniStoreV756?.name")],
 ["EUROSPAR dependency",block.includes("selectedEurosparStoreV751?.id")&&block.includes("selectedEurosparStoreV751?.name")],
 ["Lidl dependency",block.includes("selectedLidlStoreV750?.id")&&block.includes("selectedLidlStoreV750?.name")],
 ["Tokmanni readiness",block.includes('selectedChain === "TOKMANNI"')&&block.includes("!selectedTokmanniStoreV756")],
 ["refresh call",block.includes("void searchOffers();")],
 ["not S/K only",!block.includes('selectedChain !== "S" && selectedChain !== "K"')],
];
let bad=0;for(const [n,ok] of checks){console.log(ok?"PASS":"FAIL",n);if(!ok)bad++}if(bad)process.exit(1);