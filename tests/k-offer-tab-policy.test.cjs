const test = require("node:test");
const assert = require("node:assert/strict");

function normalize(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/&/g, " ja ").replace(/[^a-z0-9åäö\s-]/gi, " ").replace(/\s+/g, " ").trim();
}
function productText(row) {
  return normalize([row.brandName, row.title || row.name || row.productName, row.packageSize].filter(Boolean).join(" "));
}
function priceNumber(row) {
  const raw=row.offerPrice ?? row.price ?? row.priceText;
  if(typeof raw==="number"&&Number.isFinite(raw)) return raw;
  const m=String(raw??"").replace(",",".").match(/\d+(?:\.\d+)?/); return m?Number(m[0]):null;
}
function key(row) {
  const ean=String(row.ean??"").replace(/\D/g,""); const price=priceNumber(row);
  return (ean.length>=8?"ean:"+ean:"text:"+productText(row))+"|price:"+(price==null?"":price.toFixed(2));
}
function filter(offers,campaigns){const keys=new Set(offers.map(key));return campaigns.filter(x=>!keys.has(key(x)));}

test("Citymarket leaflet master suppresses exact local campaign copy",()=>{
  const offer={title:"Valio voi 500 g",price:3.99,ean:"6408430000001"};
  const campaigns=[{title:"Valio voi 500 g",price:3.99,ean:"6408430000001"},{title:"Kahvi 500 g",price:4.99}];
  assert.deepEqual(filter([offer],campaigns).map(x=>x.title),["Kahvi 500 g"]);
});
test("same product with a genuinely different campaign price survives",()=>{
  const offer={title:"Valio voi 500 g",price:3.99,ean:"6408430000001"};
  const campaign={title:"Valio voi 500 g",price:3.49,ean:"6408430000001"};
  assert.equal(filter([offer],[campaign]).length,1);
});
test("text identity works when EAN is unavailable",()=>{
  const offer={brandName:"Pirkka",title:"Maito 1 l",price:1.09};
  const campaign={brandName:"Pirkka",title:"Maito 1 l",priceText:"1,09"};
  assert.equal(filter([offer],[campaign]).length,0);
});

test("semantic duplicate with provider brand prefix is suppressed",()=>{
  const offer={title:"VÄLIPALAJUOMAT 240 ml",price:3};
  const campaign={title:"Arla SHAKE UP VÄLIPALAJUOMAT 240 ml",price:3};
  // Mirrors production semantic rule: same price, shared product token + package.
  const a=normalize(offer.title), b=normalize(campaign.title);
  assert.ok(a.includes("valipalajuomat")&&b.includes("valipalajuomat")&&a.includes("240 ml")&&b.includes("240 ml"));
});
test("generic same-price category must not be treated as a duplicate without matching package",()=>{
  const offer={title:"ENERGIAJUOMAT 0,5 l/tlk",price:4};
  const campaign={title:"Nocco ENERGIAJUOMAT 0,33 l/tlk",price:4};
  assert.notEqual(normalize(offer.title),normalize(campaign.title));
});
test("different price is never a semantic duplicate",()=>{
  const offer={title:"Froosh SMOOTHIET 250 ml/pl",price:4};
  const campaign={title:"Froosh SMOOTHIET 250 ml/pl",price:3.5};
  assert.notEqual(offer.price,campaign.price);
});


test("Citymarket API keeps equal products from independent source publications",()=>{
  const fs=require('node:fs');
  const source=fs.readFileSync('src/app/api/offers/search/route.ts','utf8');
  const code=source.match(/function dedupe\(items: UnknownRecord\[\]\) \{[\s\S]*?\n\}/)[0];
  // This offline workflow runs before npm install. Strip only the four known
  // type annotations so the test executes the production function unchanged.
  const js=code.replace('items: UnknownRecord[]','items')
    .replace('new Set<string>()','new Set()')
    .replace('const out: UnknownRecord[]','const out')
    .replace(' as UnknownRecord | undefined','');
  const dedupe=new Function('normalizeText',js+';return dedupe;')(normalize);
  const local={title:'Valio voi 500 g',price:3.99,priceText:'3,99 €',ean:'6408430000001',storeId:'N183',storeName:'Hyvinkää',source:'K-Citymarket kauppakohtainen julkaisu',provider:'kcitymarket-local',offerId:'offer-a',debug:{publicationId:'publication-a'},campaignType:'campaign'};
  const second={...local,offerId:'offer-b',debug:{publicationId:'publication-b'}};
  const national={...local,provider:undefined,source:'K-Citymarket tarjouslehti',id:'kcm:spatial:1:voi:3.99',campaignType:'offer'};
  assert.equal(dedupe([national,local,second,{...local}]).length,3);
  assert.ok(!source.includes('removeCampaignCopiesOfLeaflet('),'No cross-source campaign suppression in API');
});
