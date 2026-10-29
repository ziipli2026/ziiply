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
const verifyLimit=Number(process.env.VERIFY_TRUNCATED_LIMIT||25);
let verifiedTruncated=0;
const LIMIT=100;
const singularCandidates=word=>[word,word.replace(/t$/u,''),word.replace(/at$/u,'a'),word.replace(/ät$/u,'ä'),word.replace(/it$/u,'i')].filter(Boolean);
const normalizedLeaf=category=>normalize(category.split('/').at(-1)).replace(/[^\p{L}\p{N}]+/gu,' ');
const queryVariants=word=>[...new Set(singularCandidates(word))];
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
  entry.queryVariants=queryVariants(test.query);
  entry.categoryLeaf=normalizedLeaf(test.category);
  entry.truncated=Boolean(data.truncated);
  entry.topRankDistribution=Object.fromEntries([...new Set(entry.top.map(p=>String(p.rank)))].map(k=>[k,entry.top.filter(p=>String(p.rank)===k).length]));
  if(!response.ok||!data.ok)entry.failures.push('api-error');
  if(!entry.count)entry.failures.push('empty');
  if(entry.count&&!entry.topCategoryMatch)entry.failures.push('category-absent-top5');
  entry.classification=!response.ok||!data.ok?'api-error':!entry.count?'no-results':entry.topCategoryMatch?'top5-exact':entry.anyCategoryMatch?'ranking-after-top5':entry.relatedCategoryMatch?'child-category-only':entry.ambiguousQuery?'ambiguous-shared-term':entry.truncated?'not-in-first-100-unverified':'missing-category-in-results';
 }catch(error){entry.failures.push(String(error));entry.classification='request-error'}
 if(entry.classification==='not-in-first-100-unverified' && verifiedTruncated<verifyLimit){
  verifiedTruncated++;
  try{
   const matches=await sql`SELECT count(*)::int AS n FROM ziiply_ean_products WHERE category = ${test.category} AND (name ILIKE ${'%'+test.query+'%'} OR brand ILIKE ${'%'+test.query+'%'} OR EXISTS (SELECT 1 FROM unnest(aliases) a WHERE a ILIKE ${'%'+test.query+'%'}))`;
   entry.databaseCandidateCount=matches[0]?.n||0;
   entry.classification=entry.databaseCandidateCount>0?'matching-products-outside-top100':'category-label-only-no-text-match';
  }catch(e){entry.databaseVerificationError=String(e);entry.classification='verification-error'}
 }
 report.push(entry);
}
const failed=report.filter(r=>r.failures.length);
const breakdown=Object.fromEntries([...new Set(report.map(r=>r.classification))].sort().map(k=>[k,report.filter(r=>r.classification===k).length]));
const genuineCandidates=report.filter(r=>['api-error','no-results','request-error','missing-category-in-results'].includes(r.classification));
const truncationUnknown=report.filter(r=>r.classification==='not-in-first-100-unverified');
const outsideTop100=report.filter(r=>r.classification==='matching-products-outside-top100');
mkdirSync('artifacts',{recursive:true});
writeFileSync('artifacts/neon-search-category-coverage.json',JSON.stringify({at:new Date().toISOString(),categories:categories.length,tests:tests.length,failures:failed.length,breakdown,genuineCandidates:genuineCandidates.length,truncationUnknown:truncationUnknown.length,outsideTop100:outsideTop100.length,report},null,2));
// Diagnostic only: distinguish broad/ambiguous category labels from ranking defects.
const belowTop5=report.filter(r=>r.classification==='ranking-after-top5');
const byQuery=new Map();
for(const r of belowTop5){
 const key=r.query;
 if(!byQuery.has(key))byQuery.set(key,[]);
 byQuery.get(key).push(r);
}
const rankedQueries=[...byQuery].map(([query,entries])=>({
 query,affectedCategories:entries.map(e=>e.category),
 top:entries[0].top.map(p=>({name:p.name,category:p.category,rank:p.rank})),
 returned:entries[0].count,truncated:entries[0].truncated,
 repeatedCategoryLabel:entries.length>1,
 ambiguous:entries.some(e=>e.ambiguousQuery)
})).sort((a,b)=>b.affectedCategories.length-a.affectedCategories.length||a.query.localeCompare(b.query,'fi'));
// Analyze the eight unique-label cases without treating taxonomy synonyms as ranking failures.
const uniqueLabelCases=belowTop5.filter(r=>!r.ambiguousQuery);
const categoryTokens=s=>new Set(normalize(s).split(/[^\\p{L}\\p{N}]+/u).filter(Boolean));
const uniqueLabelAnalysis=uniqueLabelCases.map(r=>{
 const expected=categoryTokens(r.category);
 const query=normalize(r.query);
 const top=r.top.map(p=>{
  const tokens=categoryTokens(p.category);
  return {name:p.name,category:p.category,rank:p.rank,
   categoryContainsQuery:tokens.has(query),
   categorySharesExpectedToken:[...expected].some(t=>t.length>=5&&tokens.has(t)),
   categoryHasMultipleLabels:String(p.category||'').includes(';;')};
 });
 return {query:r.query,expectedCategory:r.category,expectedItems:r.items,top,
  top5CategoryContainsQuery:top.filter(p=>p.categoryContainsQuery).length,
  top5SharesExpectedToken:top.filter(p=>p.categorySharesExpectedToken).length,
  top5MultiLabelCategories:top.filter(p=>p.categoryHasMultipleLabels).length};
});
writeFileSync('artifacts/neon-search-unique-category-analysis.json',JSON.stringify({
 at:new Date().toISOString(),note:'Diagnostic taxonomy comparison only; does not establish product relevance or true category equivalence.',
 cases:uniqueLabelAnalysis},null,2));
console.log('UNIQUE CATEGORY ANALYSIS:',JSON.stringify({cases:uniqueLabelAnalysis.length,
 top5ContainingQuery:uniqueLabelAnalysis.filter(x=>x.top5CategoryContainsQuery>0).length,
 top5MultiLabel:uniqueLabelAnalysis.filter(x=>x.top5MultiLabelCategories>0).length}));
const diagnostics={at:new Date().toISOString(),belowTop5Count:belowTop5.length,distinctQueries:rankedQueries.length,
 ambiguousCount:belowTop5.filter(r=>r.ambiguousQuery).length,
 repeatedLabels:rankedQueries.filter(r=>r.repeatedCategoryLabel).length,
 unambiguousCases:belowTop5.filter(r=>!r.ambiguousQuery).map(r=>({query:r.query,category:r.category,items:r.items,top:r.top,count:r.count,truncated:r.truncated,queryVariants:r.queryVariants,categoryLeaf:r.categoryLeaf})),
 queries:rankedQueries};
writeFileSync('artifacts/neon-search-ranking-diagnostics.json',JSON.stringify(diagnostics,null,2));
console.log('RANKING DIAGNOSTICS:',JSON.stringify({belowTop5:diagnostics.belowTop5Count,distinctQueries:diagnostics.distinctQueries,ambiguous:diagnostics.ambiguousCount,repeatedLabels:diagnostics.repeatedLabels,unambiguousCases:diagnostics.unambiguousCases.length}));
console.log('CATEGORY COVERAGE:',tests.length,'tested,',failed.length,'flagged');
console.log('CLASSIFICATION:',JSON.stringify(breakdown));
console.log('POTENTIAL REAL ISSUES:',genuineCandidates.length);
console.log('TRUNCATED UNVERIFIED:',truncationUnknown.length);
console.log('MATCHING PRODUCTS OUTSIDE TOP100:',outsideTop100.length);
for(const r of failed.slice(0,40))console.log('REVIEW',r.category,r.query,r.failures.join(','));
console.log('Full report: artifacts/neon-search-category-coverage.json');
