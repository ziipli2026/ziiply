/** Offline Lidl grocery coverage regression; run with npx tsx scripts/check-lidl-grocery-coverage-v45.ts if tsx is available, or compile with TypeScript. */
import {readFileSync} from "node:fs";
import {join} from "node:path";
type Item={lidlProductId:string;name:string;displayedPriceEur:number|null;researchCategory?:string};
const input=JSON.parse(readFileSync(join(process.cwd(),"data/lidl/official-grocery-candidates-v44-2026-10-01.json"),"utf8")) as {records:Item[]};
const terms=["maito","kananmuna","jauheliha","voi","juusto","banaani","peruna","pasta","leipä","sämpylä","ruispala","kaurajuoma"];
const tokenMatch=(name:string,q:string)=>name.toLocaleLowerCase("fi-FI").split(/[^\p{L}\p{N}]+/u).some(t=>q.length<=5?t===q:t.includes(q));
const coverage=terms.map(q=>({query:q,count:input.records.filter(r=>tokenMatch(r.name,q)).length,examples:input.records.filter(r=>tokenMatch(r.name,q)).slice(0,3).map(r=>r.name)}));
const ids=new Set(input.records.map(r=>r.lidlProductId));
const errors:string[]=[];
if(ids.size!==input.records.length)errors.push("Duplicate product IDs");
if(input.records.some(r=>r.researchCategory==="nonfood"||r.researchCategory==="food-other"))errors.push("Quarantined products leaked into grocery candidates");
if(input.records.some(r=>r.researchCategory==="bakery-piece"&&r.displayedPriceEur!==null))errors.push("Unexpected published bakery price; review before comparison");
if(coverage.find(r=>r.query==="maito")?.examples.some(x=>x.toLocaleLowerCase("fi-FI").includes("cookie")))errors.push("False maito/cookie search match");
process.stdout.write(JSON.stringify({ok:errors.length===0,sourceCount:input.records.length,uniqueIds:ids.size,coverage,errors},null,2)+"\n");
if(errors.length)process.exitCode=1;
