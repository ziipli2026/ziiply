#!/usr/bin/env node
// READ-ONLY: compare Ziiply SEARCH_INTENTS to a Neon category export.
// Export from Neon: COPY (SELECT source,category,count(*) AS n FROM ziiply_ean_products
// WHERE category IS NOT NULL AND btrim(category)<>'' GROUP BY source,category)
// TO STDOUT WITH (FORMAT CSV, HEADER TRUE);
// Usage: node scripts/audit-search-neon-taxonomy.cjs path/to/export.csv
const fs=require('node:fs');
const source=fs.readFileSync('src/app/components/ziiply/ziiplyCore.ts','utf8');
const section=source.split('const SEARCH_INTENTS: SearchIntent[] = [')[1]?.split('\n];')[0];
if(!section)throw Error('SEARCH_INTENTS missing');
const intents=[...section.matchAll(/category:\s*"([^"]+)"[\s\S]*?(?=\bcategory:\s*"|$)/g)].map(m=>{
 const b=m[0], label=b.match(/label:\s*"([^"]+)"/)?.[1]||m[1];
 const variants=[...(b.match(/variants:\s*\[([^\]]*)\]/)?.[1]||'').matchAll(/"([^"]+)"/g)].map(x=>x[1]);
 return {id:m[1],label,variants};
});
const normalize=s=>String(s||'').toLocaleLowerCase('fi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function parseCsv(s){const rows=[];let row=[],v='',quoted=false;for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quoted&&s[i+1]==='"'){v+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(v);v='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&s[i+1]==='\n')i++;row.push(v);if(row.some(Boolean))rows.push(row);row=[];v='';}else v+=c;}if(v||row.length){row.push(v);rows.push(row);}return rows;}
const file=process.argv[2];
if(!file){console.log(JSON.stringify({intentCount:intents.length,intents,notice:'Supply a read-only Neon CSV export to compare actual stored categories.'},null,2));process.exit(0);}
const [header,...rows]=parseCsv(fs.readFileSync(file,'utf8'));const idx=k=>header.indexOf(k);
if(['source','category','n'].some(k=>idx(k)<0))throw Error('CSV must contain source,category,n');
const categories=rows.map(r=>({source:r[idx('source')],category:r[idx('category')],count:Number(r[idx('n')])||0}));
const matches=categories.map(c=>{
 const n=normalize(c.category);
 const candidates=intents.filter(i=>normalize(i.label)===n||i.variants.some(v=>normalize(v)===n));
 return {...c,candidateIds:candidates.map(i=>i.id),status:candidates.length===1?'candidate_exact':candidates.length>1?'ambiguous':'unmapped'};
});
const totals={};for(const m of matches)totals[m.status]=(totals[m.status]||0)+1;
console.log(JSON.stringify({intentCount:intents.length,storedCategoryValues:matches.length,totals,notice:'Exact text candidates are NOT verified store taxonomy mappings; manual review required.',matches},null,2));
