import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rankProductResultsByRelevanceAndPrice, type Product } from '../src/app/components/ziiply/ziiplyCore';
import { desktopSearchDecision } from '../src/app/components/ziiply/search/desktopNormalRelevance';

// Frozen real S/K responses read via authenticated Vercel connector on 2026-11-13.
// Protected preview URL returns HTML to unauthenticated GitHub runner; use the
// exact returned product records rather than silently interpreting login HTML as JSON.
type Snapshot={metadata:{retrieved:string;source:string};items:Record<string,Product[]>};
const snapshot=JSON.parse(readFileSync(new URL('./fixtures/search-live-chain-response-20261113.json',import.meta.url),'utf8')) as Snapshot;
const queries=['maito','kahvi','kirjolohi'];
let checks=0,failures=0;
for(const q of queries) for(const chain of ['s','k']){
 const raw=snapshot.items[q+'_'+chain]||[];
 assert(raw.length>0,'empty real chain response fixture '+q+' '+chain);
 // Products carry cents, exactly as supplied by original S/K endpoints.
 const price=(p:Product)=>Number(p.price ?? p.storeItems?.[0]?.price ?? 0);
 const ranked=rankProductResultsByRelevanceAndPrice(q,raw,price);
 const acceptedIds=new Set(ranked.map((p)=>String(p.id)+'|'+String(p.ean||'')+'|'+p.name));
 const bad=ranked.filter(p=>q==='maito'?/suklaa|jäätelö|leipä|vanukas|maitorahka/i.test(p.name):
    q==='kirjolohi'?/lemmik|koira|kissa|kirjolohiöljy/i.test(p.name+' '+(p.category||'')):false);
 const desktopMismatch=raw.filter(p=>!desktopSearchDecision(q,{...p,__price:price(p)}).accepted&&acceptedIds.has(String(p.id)+'|'+String(p.ean||'')+'|'+p.name));
 const unpriced=ranked.filter(p=>!Number.isFinite(price(p))||price(p)<=0);
 const unordered=ranked.some((p,i)=>i>0&&price(ranked[i-1]!)>price(p));
 checks+=raw.length+3;
 if(bad.length||desktopMismatch.length||unpriced.length||unordered)failures++;
 console.log('REAL_S_K_FILTER_RESULT',JSON.stringify({query:q,chain,raw:raw.length,accepted:ranked.length,wrong:bad.map(p=>p.name),desktopMismatch:desktopMismatch.map(p=>p.name),unpriced:unpriced.length,unordered,top:ranked.slice(0,5).map(p=>({name:p.name,ean:p.ean,priceCents:price(p)}))}));
}
console.log('REAL_S_K_FILTER_SUMMARY',JSON.stringify({chains:2,queries:queries.length,checks,failures,source:snapshot.metadata.source,retrieved:snapshot.metadata.retrieved}));
assert.equal(failures,0,'real S/K filter regression failures');
