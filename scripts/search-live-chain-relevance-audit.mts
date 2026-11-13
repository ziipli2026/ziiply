import assert from 'node:assert/strict';
import { rankProductResultsByRelevanceAndPrice } from '../src/app/components/ziiply/ziiplyCore';
import { desktopSearchDecision } from '../src/app/components/ziiply/search/desktopNormalRelevance';
type P={id:number;ean?:string;name:string;category?:string;price:number;priceAmountUnit?:string;storeItems?:{price:number}[]};
const base=process.env.ZIIPLY_TEST_URL||'https://ziiply-9y3fsg8m1-ziipli2026s-projects.vercel.app';
const queries=['maito','kahvi','kirjolohi'];
let checks=0,failures=0;
async function main(){
 for(const q of queries) for(const [chain,store] of [['s','292'],['k','3221']]){
  const url=base+'/api/'+chain+'-products?search='+encodeURIComponent(q)+'&store='+store;
  const response=await fetch(url,{signal:AbortSignal.timeout(30000)});
  assert.equal(response.status,200,'HTTP '+url);
  const body=await response.json() as {items?:P[]};
  const raw=body.items||[];
  assert(raw.length>0,'empty upstream '+q+' '+chain);
  const ranked=rankProductResultsByRelevanceAndPrice(q,raw,p=>p.price);
  const rankedIds=new Set(ranked.map(p=>p.id));
  const wrong=ranked.filter(p=>q==='maito'?/suklaa|jäätelö|leipä|vanukas|maitorahka/i.test(p.name):q==='kirjolohi'?/lemmik|koira|kissa|kirjolohiöljy/i.test(p.name+' '+(p.category||'')):false);
  const parity=raw.filter(p=>desktopSearchDecision(q,{...p,__price:p.price}).accepted!==rankedIds.has(p.id));
  const unpriced=ranked.filter(p=>!Number.isFinite(p.price)||p.price<=0);
  const unordered=ranked.some((p,i)=>i>0&&ranked[i-1].price>p.price);
  checks+=raw.length+3;
  if(wrong.length||parity.length||unpriced.length||unordered) failures++;
  console.log('LIVE_CHAIN_RELEVANCE',JSON.stringify({query:q,chain,raw:raw.length,accepted:ranked.length,wrong:wrong.map(p=>p.name),parity:parity.map(p=>p.name),unpriced:unpriced.length,unordered}));
 }
 console.log('LIVE_CHAIN_SUMMARY',JSON.stringify({queries:queries.length,chains:2,checks,failures}));
 assert.equal(failures,0,'Live chain relevance failures');
}
main().catch(e=>{console.error(e);process.exitCode=1});
