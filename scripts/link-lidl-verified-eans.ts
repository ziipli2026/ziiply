/**
 * Import manually verified Lidl productId -> EAN/GTIN matches into the offline catalog.
 * Input data/lidl/verified-ean-links.json must contain:
 * [{"lidlProductId":"10037649","ean":"<verified GTIN>","evidence":"<specific verifiable source>"}]
 * Run npx tsx scripts/link-lidl-verified-eans.ts
 * Does NOT write to production Neon or mutate the shared EAN bank.
 */
import {readFileSync,writeFileSync} from "node:fs";
import {resolve} from "node:path";
type Link={lidlProductId:string;ean:string;evidence:string};
const root=resolve(process.cwd(),"data/lidl");
const catalog=JSON.parse(readFileSync(resolve(root,"official-catalog-merged-2026-10-01.json"),"utf8"));
const links=JSON.parse(readFileSync(resolve(root,"verified-ean-links.json"),"utf8")) as Link[];
function validGtin(s:string){if(!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(s))return false;const digits=[...s].map(Number);const check=digits.pop()!;let sum=0;for(let i=digits.length-1,p=0;i>=0;i--,p++)sum+=digits[i]*(p%2===0?3:1);return (10-sum%10)%10===check}
const seen=new Set<string>();const matches=new Map<string,Link>();
for(const link of links){if(!link.evidence?.trim())throw new Error("Missing independent EAN evidence for "+link.lidlProductId);if(!validGtin(link.ean))throw new Error("Invalid GTIN/check digit for "+link.lidlProductId);if(seen.has(link.lidlProductId))throw new Error("Duplicate link "+link.lidlProductId);seen.add(link.lidlProductId);matches.set(link.lidlProductId,link)}
const known=new Set(catalog.records.map((r:{lidlProductId:string})=>r.lidlProductId));
for(const id of matches.keys())if(!known.has(id))throw new Error("Unknown Lidl product ID "+id);
const records=catalog.records.map((r:{lidlProductId:string})=>{const match=matches.get(r.lidlProductId);return match?{...r,ean:match.ean,eanMatchStatus:"verified",eanEvidence:match.evidence}:r});
writeFileSync(resolve(root,"official-catalog-linked-2026-10-01.json"),JSON.stringify({...catalog,records,verifiedEanLinks:matches.size},null,2)+"\n");
console.log({products:records.length,verifiedEanLinks:matches.size});
