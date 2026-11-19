const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const vm=require('node:vm');
const source=fs.readFileSync('src/app/api/offers/watch/route.ts','utf8');
const start=source.indexOf('function norm(');
const end=source.indexOf('// Normalize a few verified same-product',start);
assert.ok(start>=0&&end>start);
const isolated=source.slice(start,end);
const js=ts.transpileModule(isolated+'\nexports.matches=matches;', {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const exportsObject={};
vm.runInNewContext(js,{exports:exportsObject,desktopSearchDecision:()=>({accepted:false})});
const matches=(q,title)=>exportsObject.matches(q,{title});
test('verified Colgate hammastahnarasiat is found by generic hammastahna',()=>{
 assert.equal(matches('hammastahna','Colgate HAMMASTAHNARASIAT 75 ml, TWISTER HAMMASHARJA 4 kpl/pkt'),true);
 assert.equal(matches('hammastahnarasiat','Colgate HAMMASTAHNARASIAT 75 ml'),true);
});
test('unrelated compound and substring are not accepted',()=>{
 assert.equal(matches('hammastahna','HAMMASTAHNATELINE'),false);
 assert.equal(matches('spagetti','SPAGETTIKURPITSA'),false);
 assert.equal(matches('hammastahna','Lasten TALVIKENGÄT'),false);
});
