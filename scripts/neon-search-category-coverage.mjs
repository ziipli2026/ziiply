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
for(const test of tests){
 const entry={...test,failures:[]};
 try{
  const start=Date.now();
  const response=await fetch(base+'/api/neon-first-search?q='+encodeURIComponent(test.query),{signal:AbortSignal.timeout(15000)});
  const data=await response.json();
  entry.ms=Date.now()-start;
  entry.count=data.products?.length||0;
  entry.top=(data.products||[]).slice(0,5).map(p=>({name:p.name,category:p.category,rank:p.rank}));
  if(!response.ok||!data.ok)entry.failures.push('api-error');
  if(!entry.count)entry.failures.push('empty');
  if(entry.count&&!entry.top.some(p=>p.category===test.category))entry.failures.push('category-absent-top5');
 }catch(error){entry.failures.push(String(error))}
 report.push(entry);
}
const failed=report.filter(r=>r.failures.length);
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/neon-search-category-coverage.json',JSON.stringify({at:new Date().toISOString(),categories:categories.length,tests:tests.length,failures:failed.length,report},null,2));
console.log('CATEGORY COVERAGE:',tests.length,'tested,',failed.length,'flagged');
for(const r of failed.slice(0,40))console.log('REVIEW',r.category,r.query,r.failures.join(','));
console.log('Full report: artifacts/neon-search-category-coverage.json');
