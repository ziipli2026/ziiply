const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const Module = module.constructor;
const file = path.resolve(__dirname, "../src/lib/gosta/offerWatchCore.ts");
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
const core = new Module(file, module); core.filename = file; core.paths = module.paths; core._compile(output,file);
const { matchesWatch, currentOffer, pickMatches, isFinnishWatchSlot, finnishDate } = core.exports;
test("Finnish DST winter and summer slots",()=>{
 assert.equal(isFinnishWatchSlot(new Date("2026-11-03T05:00:00Z")),true);
 assert.equal(isFinnishWatchSlot(new Date("2026-07-03T04:00:00Z")),true);
 assert.equal(isFinnishWatchSlot(new Date("2026-07-03T05:00:00Z")),false);
 assert.equal(finnishDate(new Date("2026-11-03T23:00:00Z")),"2026-11-04");
});
test("matches product words, but not unrelated category",()=>{
 assert.equal(matchesWatch({title:"Valio maustettu rahka"},"rahka"),true);
 assert.equal(matchesWatch({title:"Jauheliha",category:"Maitotuotteet"},"rahka"),false);
 assert.equal(matchesWatch({title:"Kahvipaketit"},"kahvi"),true);
});
test("only priced, valid matches; ascending price, dedupe, chain scope",()=>{
 const base={publicationChain:"LIDL:FI0218",publicationId:"2026-w45",title:"Kahvi",price:4.5};
 const offers=[{...base,id:"a"},{...base,id:"b"},{...base,id:"c",price:2.99},{...base,id:"d",price:0},{...base,id:"e",price:1,resolutionSanity:"fail"},{...base,id:"f",price:5,publicationChain:"K-Citymarket"}];
 assert.equal(currentOffer(offers[3]),false);
 assert.deepEqual(pickMatches(offers,{id:"1",query:"kahvi",store_scope:["LIDL:FI0218"]}).map(x=>x.price),[2.99,4.5]);
 assert.equal(pickMatches(offers,{id:"1",query:"maito",store_scope:[]}).length,0);
});
