import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import { pathToFileURL } from "node:url";

const root=process.cwd(), tmp=path.join(root,".tmp-lidl-lifecycle");
await fs.mkdir(tmp,{recursive:true});
const source=await fs.readFile(path.join(root,"src/app/components/ziiply/offerSearch/publicationLifecycle.ts"),"utf8");
const out=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const modPath=path.join(tmp,"publicationLifecycle.mjs");
await fs.writeFile(modPath,out);
const {publicationState,visibleStagedOffers}=await import(pathToFileURL(modPath).href+"?v="+Date.now());

const oldPub={id:"lidl-2026-10-05_07",chain:"LIDL:FI0218",validFrom:"2026-10-05",validUntil:"2026-10-07",parsedAt:"2026-10-05T12:00:00Z",offers:[{name:"old-5-7"}]};
const nextPub={id:"lidl-2026-10-08",chain:"LIDL:FI0218",validFrom:"2026-10-08",validUntil:"2026-10-11",parsedAt:"2026-10-07T12:00:00Z",offers:[{name:"next-8"}]};
const staged=[oldPub,nextPub];
const at=(iso)=>new Date(iso);
const checks=[
 ["old current 5 Oct",publicationState(oldPub,"2026-10-05"),"current"],
 ["next upcoming 7 Oct",publicationState(nextPub,"2026-10-07"),"upcoming"],
 ["old current 7 Oct",publicationState(oldPub,"2026-10-07"),"current"],
 ["old expired 8 Oct",publicationState(oldPub,"2026-10-08"),"expired"],
 ["next current 8 Oct",publicationState(nextPub,"2026-10-08"),"current"],
 ["visible 7 Oct",visibleStagedOffers(staged,"LIDL:FI0218",at("2026-10-07T09:00:00+03:00")).map(x=>x.name).join(","),"old-5-7"],
 ["visible 8 Oct",visibleStagedOffers(staged,"LIDL:FI0218",at("2026-10-08T09:00:00+03:00")).map(x=>x.name).join(","),"next-8"],
];
let failed=0;
for(const [name,actual,expected] of checks){const ok=actual===expected; console.log(ok?"PASS":"FAIL",name,{actual,expected}); if(!ok) failed++;}
await fs.rm(tmp,{recursive:true,force:true});
if(failed) process.exit(1);
console.log("Lidl publication lifecycle simulation passed:",checks.length,"checks");
