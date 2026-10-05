import catalog from "../data/lidl/official-grocery-candidates-v44-2026-10-01.json" with {type:"json"};
import evidence from "../data/lidl/independent-staple-ean-evidence-2026-10-02.json" with {type:"json"};
const verified=evidence.records.filter(r=>String(r.ean??"").replace(/\\D/g,"").length>=8 && String(r.eanStatus??"").startsWith("verified"));
const byIan=new Map(verified.filter(r=>r.ian).map(r=>[String(r.ian),r]));
const byName=new Map(verified.map(r=>[String(r.name).toLocaleLowerCase("fi-FI"),r]));
const candidates=catalog.records.filter(r=>r.ian||r.name);
const exact=candidates.filter(r=>byIan.has(String(r.ian))||byName.has(String(r.name).toLocaleLowerCase("fi-FI")));
console.log(JSON.stringify({catalogRecords:candidates.length,verifiedEvidenceEanCount:verified.length,exactUnambiguousMatches:exact.length,importableMatches:0,reason:"Existing evidence is historical/independent identification; no current packaging match is established"},null,2));
