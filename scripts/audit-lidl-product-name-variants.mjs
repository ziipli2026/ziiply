import catalog from "../data/lidl/official-grocery-candidates-v44-2026-10-01.json" with {type:"json"};
const rows=catalog.records;
const count=(re)=>rows.filter(r=>re.test(String(r.name??""))).length;
const duplicateNames=[...new Map(rows.map(r=>[r.name,(rows.filter(x=>x.name===r.name).length)])).entries()].filter(([,n])=>n>1);
const explicitPackSignals=rows.filter(r=>{const s=String(r.name??"").toLocaleLowerCase("fi-FI");return /kpl|pack|pull|munaa|munan/.test(s) && /[0-9]/.test(s);}).length;
const multiUnitSignals=rows.filter(r=>{const s=String(r.name??"").toLocaleLowerCase("fi-FI");return s.includes("kpl") && /[0-9]/.test(s);}).length;
console.log(JSON.stringify({total:rows.length,duplicateNameGroups:duplicateNames.length,explicitPackSignals,multiUnitSignals,duplicateExamples:duplicateNames.slice(0,20)},null,2));
