const assert=require("node:assert/strict");
const price=v=>{const m=String(v??"").replace(/\s/g,"").match(/(\d+(?:[.,]\d{1,2})?)/);return m?Number(m[1].replace(",",".")):null};
const parse=t=>{
 const multi=t.match(/(\d+)\s*kpl\s*\/\s*(\d+\s*(?:[,.]\s*\d{1,2})?)\s*€/i);
 const offer=t.match(/(?:Tarjoushinta|Klubitarjous!)\s*(\d+\s*(?:[,.]\s*\d{1,2})?)/i);
 const normal=t.match(/Normaalihinta\s*(\d+\s*(?:[,.]\s*\d{1,2})?)/i);
 return {offerPrice:multi?price(multi[2]):price(offer?.[1]),normalPrice:price(normal?.[1])};
};
assert.deepEqual(parse("Fazer Kismet 55 g 5 kpl / 4,00 € 0 ,99"),{offerPrice:4,normalPrice:null});
assert.deepEqual(parse("Lu TUC 100 g 2 kpl / 2,00 € 1 ,49"),{offerPrice:2,normalPrice:null});
assert.deepEqual(parse("Ässä 220 g Tarjoushinta 1 ,79 Normaalihinta 2 ,79"),{offerPrice:1.79,normalPrice:2.79});
assert.deepEqual(parse("Piltti 125 g Tarjoushinta 0 ,87 Normaalihinta 1 ,09"),{offerPrice:0.87,normalPrice:1.09});
assert.deepEqual(parse("II-Kaneli 500 g Tarjoushinta 2 ,99 Normaalihinta 3 ,99"),{offerPrice:2.99,normalPrice:3.99});
console.log("Tokmanni spaced-price fixtures: 5/5 OK");