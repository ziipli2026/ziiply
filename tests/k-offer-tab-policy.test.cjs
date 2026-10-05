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
