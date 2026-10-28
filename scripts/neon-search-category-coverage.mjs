#!/usr/bin/env node
// Read-only catalog coverage, dynamically generated from the live Neon taxonomy.
import { neon } from '@neondatabase/serverless';
import { mkdirSync, writeFileSync } from 'node:fs';
const base=process.env.SEARCH_BASE_URL;
if(base!=='http://127.0.0.1:3099') throw Error('Local API required');
if(!process.env.DATABASE_URL) throw Error('DATABASE_URL missing');
const sql=neon(process.env.DATABASE_URL);
const categories=await sql`SELECT category, count(*)::int AS items FROM ziiply_ean_products WHERE category IS NOT NULL AND category <> '' GROUP BY category ORDER BY category`;
const tests=[];
for(const row of categories){
 const leaf=row.category.split('/').at(-1);
 const tokens=leaf.normalize('NFKC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(t=>t.length>=4 && t!=='sekä');
 if(!tokens.length)continue;
 tests.push({category:row.category,query:tokens.at(-1),items:row.items});
}
const report=[];
const categoryNames=new Set(categories.map(r=>r.category));
const normalize=s=>String(s||'').normalize('NFKC').toLocaleLowerCase('fi-FI');
const categoriesByQuery=new Map();
for(const t of tests)categoriesByQuery.set(t.query,(categoriesByQuery.get(t.query)||0)+1);
for(const test of tests){
 const entry={...test,failures:[],classification:'pending',ambiguousQuery:(categoriesByQuery.get(test.query)||0)>1,topCategoryMatch:false,anyCategoryMatch:false};
 try{
  const start=Date.now();
  const response=await fetch(base+'/api/neon-first-search?q='+encodeURIComponent(test.query),{signal:AbortSignal.timeout(15000)});
  const data=await response.json();
  entry.ms=Date.now()-start;
  entry.count=data.products?.length||0;
  entry.top=(data.products||[]).slice(0,5).map(p=>({name:p.name,category:p.category,rank:p.rank}));
  entry.topCategoryMatch=entry.top.some(p=>p.category===test.category);
  entry.anyCategoryMatch=(data.products||[]).some(p=>p.category===test.category);
  entry.relatedCategoryMatch=(data.products||[]).some(p=>normalize(p.category).startsWith(normalize(test.category)+'/'));
  entry.queryInCategory=normalize(test.category).includes(normalize(test.query));
  if(!response.ok||!data.ok)entry.failures.push('api-error');
  if(!entry.count)entry.failures.push('empty');
  if(entry.count&&!entry.topCategoryMatch)entry.failures.push('category-absent-top5');
  entry.classification=!response.ok||!data.ok?'api-error':!entry.count?'no-results':entry.topCategoryMatch?'top5-exact':entry.anyCategoryMatch?'ranking-after-top5':entry.relatedCategoryMatch?'child-category-only':entry.ambiguousQuery?'ambiguous-shared-term':'missing-category-in-results';
 }catch(error){entry.failures.push(String(error));entry.classification='request-error'}
 report.push(entry);
}
const failed=report.filter(r=>r.failures.length);
const breakdown=Object.fromEntries([...new Set(report.map(r=>r.classification))].sort().map(k=>[k,report.filter(r=>r.classification===k).length]));
const genuineCandidates=report.filter(r=>['api-error','no-results','request-error','missing-category-in-results'].includes(r.classification));
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/neon-search-category-coverage.json',JSON.stringify({at:new Date().toISOString(),categories:categories.length,tests:tests.length,failures:failed.length,breakdown,genuineCandidates:genuineCandidates.length,report},null,2));
console.log('CATEGORY COVERAGE:',tests.length,'tested,',failed.length,'flagged');
console.log('CLASSIFICATION:',JSON.stringify(breakdown));
console.log('POTENTIAL REAL ISSUES:',genuineCandidates.length);
for(const r of failed.slice(0,40))console.log('REVIEW',r.category,r.query,r.failures.join(','));
console.log('Full report: artifacts/neon-search-category-coverage.json');
