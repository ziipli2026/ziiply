import catalog from "../data/lidl/official-grocery-candidates-v44-2026-10-01.json" with {type:"json"};
const rows=catalog.records;
const count=(re)=>rows.filter(r=>re.test(String(r.name??""))).length;
const duplicateNames=[...new Map(rows.map(r=>[r.name,(rows.filter(x=>x.name===r.name).length)])).entries()].filter(([,n])=>n>1);
const explicitPackSignals=rows.filter(r=>/\\b\\d+\\s*(kpl|pack|pull|munaa|munan)\\b/i.test(String(r.name??""))).length;
const multiUnitSignals=rows.filter(r=>/\\b\\d+\\s*kpl\\b/i.test(String(r.name??""))).length;
console.log(JSON.stringify({total:rows.length,duplicateNameGroups:duplicateNames.length,explicitPackSignals,multiUnitSignals,duplicateExamples:duplicateNames.slice(0,20)},null,2));
