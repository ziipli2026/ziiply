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
 if(q==='maito'&&chain==='k') {
  for(const expected of [
    {ean:'6410405082626',name:'Pirkka suomalainen rasvaton maito 1l',price:95},
    {ean:'6408430000531',name:'Valio vapaan lehmän rasvaton maito 1,75l',price:199}
  ]) {
    const source=raw.find(p=>p.ean===expected.ean);
    const visible=ranked.find(p=>p.ean===expected.ean);
    assert(source,'K chain must return missing-Neon-list EAN '+expected.ean);
    assert(visible,'Final shared relevance filter must retain K chain EAN '+expected.ean);
    assert.equal(price(visible),expected.price,'K chain price must survive filter '+expected.ean);
    console.log('NEON_TRUNCATION_CHAIN_RECOVERY_OK',JSON.stringify({ean:expected.ean,name:visible.name,priceCents:price(visible),source:'real K chain snapshot',note:'EAN absent from truncated Neon maito name response but available in Neon exact EAN lookup'}));
    checks+=3;
  }
}
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

/** Guard against accepting an ingredient mention as the requested product. */
const familyCases=[
 {query:'ruokaöljy',name:'Keiju rypsiöljy 1l',expected:true},
 {query:'ruokaöljy',name:'Kotimaista 450ml rypsiöljy',expected:true},
 {query:'ruokaöljy',name:'Coop auringonkukkaöljy 1 l',expected:true},
 {query:'ruokaöljy',name:'Oliiviöljy extra virgin 500 ml',expected:true},
 {query:'ruokaöljy',name:'Rypsiöljyä sisältävä margariini 400 g',expected:false},
 {query:'ruokaöljy',name:'Tonnikala rypsiöljyssä 160 g',expected:false},
 {query:'ruokaöljy',name:'Oliiviöljykastike 250 ml',expected:false},
 {query:'ruokaöljy',name:'Oliiviöljysipsit 150 g',expected:false},
 {query:'etikka',name:'Xtra väkiviinaetikka 750 ml',expected:true},
 {query:'etikka',name:'Rajamäen omenaviinietikka 0,4l',expected:true},
 {query:'etikka',name:'Valkoviinietikka 500 ml',expected:true},
 {query:'etikka',name:'Etikkasipsit 150 g',expected:false},
 {query:'etikka',name:'Etikkainen salaattikastike 250 ml',expected:false},
 {query:'etikka',name:'Etikkapuhdistusaine 500 ml',expected:false},
];
for(const test of familyCases){
 const p={name:test.name,price:199,category:'',ean:''} as Product;
 const decision=desktopSearchDecision(test.query,{...p,__price:199});
 const ranked=rankProductResultsByRelevanceAndPrice(test.query,[p],()=>199);
 assert.equal(decision.accepted,test.expected,'desktop family relevance '+JSON.stringify(test));
 assert.equal(ranked.length>0,test.expected,'final family relevance '+JSON.stringify(test));
 checks+=2;
}
console.log('OIL_VINEGAR_NEGATIVE_REGRESSIONS_OK',JSON.stringify({cases:familyCases.length,checks:familyCases.length*2}));

console.log('REAL_S_K_FILTER_SUMMARY',JSON.stringify({chains:2,queries:queries.length,checks,failures,source:snapshot.metadata.source,retrieved:snapshot.metadata.retrieved}));
assert.equal(failures,0,'real S/K filter regression failures');
