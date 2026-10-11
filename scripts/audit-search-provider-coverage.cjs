#!/usr/bin/env node
// Static provider coverage diagnostics. No network calls, credentials or database writes.
const fs = require("node:fs");
const paths = {
  s:"src/app/api/s-products/route.ts",
  k:"src/app/api/k-products/route.ts",
  lidl:"src/app/api/lidl/products/route.ts",
  tokmanni:"src/app/api/tokmanni/products/route.ts"
};
const sources = Object.fromEntries(Object.entries(paths).map(([key,path])=>[key,fs.readFileSync(path,"utf8")]));
const report = Object.entries(sources).map(([chain,source])=>{
 const paginatedOnlyForKetchup = chain!=="tokmanni" &&
   /ketsuppi\|ketchup/.test(source) && /sourceItems\.length\s*===\s*(?:80|100)/.test(source);
 const hasProviderFallback = chain==="tokmanni" ? /fetchHtmlFallbackProducts/.test(source)
   : chain==="s" ? /fetchSKaupatNormalProductsV220/.test(source) : false;
 const researchWithoutVerifiedPrice = chain==="lidl" && /priceVerified:\s*false/.test(source);
 return {chain,providerPaginationRestrictedToKetchup:paginatedOnlyForKetchup,
   providerFallback:hasProviderFallback,researchWithoutVerifiedPrice,
   risk:paginatedOnlyForKetchup ? "Other broad category queries may stop at first provider page" : null};
});
console.log(JSON.stringify({kind:"static-provider-coverage",liveProviderQueries:0,report,
 limitations:["Static code inspection only","Does not establish actual missing products or live store availability"]},null,2));
