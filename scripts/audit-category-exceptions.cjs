#!/usr/bin/env node
// Read-only regression for proposed cola exceptions. Requires a CSV export
// with columns ean,name,source,category,proposed_category_id.
const fs=require('node:fs');
const file=process.argv[2];
if(!file){console.error('Usage: node scripts/audit-category-exceptions.cjs exceptions.csv');process.exit(2);}
function csv(s){const rows=[];let row=[],v='',quoted=false;for(let i=0;i<s.length;i++){const c=s[i];if(c==='"'){if(quoted&&s[i+1]==='"'){v+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(v);v='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&s[i+1]==='\n')i++;row.push(v);if(row.some(Boolean))rows.push(row);row=[];v='';}else v+=c;}if(v||row.length){row.push(v);rows.push(row);}return rows;}
const [header,...rows]=csv(fs.readFileSync(file,'utf8'));
const get=(r,k)=>r[header.indexOf(k)];
for(const key of ['ean','name','source','category','proposed_category_id'])if(!header.includes(key))throw Error('Missing column '+key);
const colaToken=/(^|[^\p{L}])(cola|pepsi)(?=[^\p{L}]|$)/iu;
const colaContext=/(virvoitusjuoma|virvoitujuoma|soda|original taste|zero sugar)/iu;
const excluded=/(jauhe|karkki|makeinen|energiajuoma)/iu;
const failures=rows.filter(r=>get(r,'proposed_category_id')==='cola'&&(!colaToken.test(get(r,'name'))||!colaContext.test(get(r,'name'))||excluded.test(get(r,'name'))));
console.log(JSON.stringify({rows:rows.length,colaExceptions:rows.filter(r=>get(r,'proposed_category_id')==='cola').length,failed:failures.map(r=>({ean:get(r,'ean'),name:get(r,'name')})),status:failures.length?'FAIL':'PASS'},null,2));
if(failures.length)process.exitCode=1;
