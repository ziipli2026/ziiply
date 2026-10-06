#!/usr/bin/env node
const shouldSuppress=({continuous=true,canonicalKind,boundPromoPrice,regularPrice}) =>
  continuous && canonicalKind !== "regular" && boundPromoPrice != null && boundPromoPrice === regularPrice;
const cases=[
  {canonicalKind:"offer",boundPromoPrice:8.99,regularPrice:8.99,expected:true},
  {canonicalKind:"lidl_plus",boundPromoPrice:2.99,regularPrice:2.99,expected:true},
  {canonicalKind:"offer",boundPromoPrice:3.99,regularPrice:5.99,expected:false},
  {canonicalKind:"regular",boundPromoPrice:5.99,regularPrice:5.99,expected:false},
  {canonicalKind:"offer",boundPromoPrice:null,regularPrice:5.99,expected:false},
  {continuous:false,canonicalKind:"offer",boundPromoPrice:3.99,regularPrice:3.99,expected:false}
];
for(const c of cases){const actual=shouldSuppress(c);if(actual!==c.expected)throw new Error("unexpected suppression result");}
console.log("Lidl canonical promo dedupe regression: "+cases.length+"/"+cases.length+" passed");
