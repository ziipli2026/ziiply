#!/usr/bin/env node
// Regression-only guard for canonical Lidl promo dedupe.
const shouldSuppress=({continuous=true,canonicalKind,boundPromoPrice,regularPrice}) =>
  continuous && canonicalKind !== "regular" && boundPromoPrice != null && boundPromoPrice === regularPrice;

const cases=[
  {name:"equal canonical offer without explicit promo price",canonicalKind:"offer",boundPromoPrice:8.99,regularPrice:8.99,expected:true},
  {name:"equal Lidl Plus price",canonicalKind:"lidl_plus",boundPromoPrice:2.99,regularPrice:2.99,expected:true},
  {name:"real discounted promo",canonicalKind:"offer",boundPromoPrice:3.99,regularPrice:5.99,expected:false},
  {name:"canonical page is regular",canonicalKind:"regular",boundPromoPrice:5.99,regularPrice:5.99,expected:false},
  {name:"missing promo binding",canonicalKind:"offer",boundPromoPrice:null,regularPrice:5.99,expected:false},
  {name:"non-continuous record",continuous:false,canonicalKind:"offer",boundPromoPrice:3.99,regularPrice:3.99,expected:false}
];

for (const c of cases) {
  const actual=shouldSuppress(c);
  if(actual!==c.expected) throw new Error(c.name+": expected "+c.expected+", got "+actual);
}
console.log("Lidl canonical promo dedupe regression: "+cases.length+"/"+cases.length+" passed");
