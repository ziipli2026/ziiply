#!/usr/bin/env node
/**
 * Read-only category audit regression. Input: CSV exported from Neon test branch:
 * SELECT p.ean,p.name,p.source,p.category AS source_category,
 *        f.finding_type,f.proposed_category_id,f.review_status
 * FROM ziiply_category_audit_findings f
 * JOIN ziiply_ean_products p ON p.ean=f.ean AND p.source=f.source
 *   AND p.category=f.source_category;
 *
 * Usage: node scripts/audit-category-findings.cjs findings.csv
 */
const fs = require('node:fs');
const file = process.argv[2];
if (!file) { console.error('Usage: node scripts/audit-category-findings.cjs findings.csv'); process.exit(2); }
function parseCSV(s) {
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<s.length;i++){const c=s[i];
    if(c==='"'){if(quoted&&s[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(c===','&&!quoted){row.push(cell);cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&s[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}
    else cell+=c;
  }
  if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}
const [head,...data]=parseCSV(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const required=['ean','name','source','source_category','finding_type','proposed_category_id','review_status'];
for(const field of required)if(!head.includes(field))throw Error('Missing CSV column '+field);
const rows=data.map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]??''])));
const cola=/(^|[^\p{L}])(cola|pepsi)(?=[^\p{L}]|$)/iu;
const context=/(virvoitusjuoma|virvoitujuoma|soda|original taste|zero sugar)/iu;
const exclude=/(jauhe|karkki|makeinen|energiajuoma)/iu;
const plant=/(kaurajuoma|soijajuoma|mantelijuoma)/iu;
const protein=/proteiinijuoma/iu;
const powder=/juomajauhe.*cola/iu;
const failures=[];
const seen=new Set();
for(const r of rows){
  if(!/^\\d{8,14}$/.test(r.ean)||!r.name.trim()||!r.source.trim()||!r.source_category.trim()) failures.push({ean:r.ean,error:'Missing or malformed product identity'});
  const key=[r.ean,r.source,r.source_category,r.finding_type].join('|');
  if(seen.has(key))failures.push({ean:r.ean,error:'Duplicate finding'});
  seen.add(key);
  if(r.review_status!=='candidate'&&r.review_status!=='reviewed'&&r.review_status!=='rejected')failures.push({ean:r.ean,error:'Unknown review status'});
  if(r.finding_type==='more_specific_subcategory'){
    if(r.proposed_category_id!=='cola'||r.source_category!=='Juomat'||!cola.test(r.name)||!context.test(r.name)||exclude.test(r.name))
      failures.push({ean:r.ean,name:r.name,error:'Invalid cola subcategory proposal'});
  }else if(r.finding_type==='source_misclassification'){
    if(!((r.proposed_category_id==='frozen'&&r.source_category==='Makeiset'&&/jäätelö|ice cream/iu.test(r.name))||(r.proposed_category_id===''&&r.source_category==='Maitotuotteet'&&/(maitohappobakteeri|proteiinipatukka|murokakku|kasvovoi|jugurttihiutale)/iu.test(r.name))))
      failures.push({ean:r.ean,name:r.name,error:'Invalid source category misclassification proposal'});
  }else if(r.finding_type==='ambiguous_search_term'){
    if(r.proposed_category_id||r.source_category!=='Juomat'||!(plant.test(r.name)||protein.test(r.name)||powder.test(r.name)))
      failures.push({ean:r.ean,name:r.name,error:'Invalid ambiguous term finding'});
  }else failures.push({ean:r.ean,error:'Unknown finding type'});
}
const counts=Object.fromEntries(['source_misclassification','more_specific_subcategory','ambiguous_search_term'].map(t=>[t,rows.filter(r=>r.finding_type===t).length]));
const expected={source_misclassification:17,more_specific_subcategory:37,ambiguous_search_term:11};
for(const [type,n] of Object.entries(expected))if(counts[type]!==n)failures.push({error:'Snapshot count mismatch',type,expected:n,actual:counts[type]});
if(rows.length!==65)failures.push({error:'Snapshot row count mismatch',expected:65,actual:rows.length});
console.log(JSON.stringify({rows:rows.length,counts,failures,status:failures.length?'FAIL':'PASS'},null,2));
if(failures.length)process.exitCode=1;
