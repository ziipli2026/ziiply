const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../src/app/components/ziiply/offerSearch/tjekDepartmentCategory.ts'),'utf8');
const compiled=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleExports={};vm.runInNewContext(compiled,{exports:moduleExports});
const map=moduleExports.tjekDepartmentCategory;
test('source department maps broad grocery groups',()=>{
  for(const [slug,expected] of Object.entries({'fruits-and-vegetables':'Hevi','beverages':'Juomat','frozen':'Pakasteet','household':'Kodinhoito','beauty':'Hygienia & kosmetiikka'}))assert.equal(map(slug),expected);
});
test('ambiguous departments never receive guessed categories',()=>{
  for(const slug of ['meat-and-fish','dairy-and-cold','colonial','bread-and-cakes','electronics','apparel','unknown',null])assert.equal(map(slug),null);
});
test('only local Tjek parser uses department mapper',()=>{
  const provider=fs.readFileSync(path.join(__dirname,'../src/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider.ts'),'utf8');
  assert.match(provider,/const sourceDepartment = typeof offer\.departmentSlug/);
  assert.match(provider,/category:sourceCategory \?\? classifyCitymarketCategory\(title\)/);
  assert.match(provider,/categorySource:sourceCategory \? "tjek-department" : "legacy-title"/);
});

test('Gosta respects verified local Tjek category after EAN priority',()=>{
 const core=fs.readFileSync(path.join(__dirname,'../src/app/components/ziiply/offerSearch/ziiplyOfferCategoryCore.ts'),'utf8');
 const ean=core.indexOf('if (localCitymarketTjek && (eanMatch');
 const dept=core.indexOf('tjekDebug?.categorySource === "tjek-department"');
 const title=core.indexOf('const verifiedCategory = getVerifiedOfferCategory(item);');
 assert.ok(ean>=0&&dept>ean&&title>dept,'verified source must precede title overrides, but follow exact EAN');
 assert.match(core,/localCitymarketTjek && tjekDebug\?\.categorySource === "tjek-department"/);
});

test('only explicitly non-grocery Tjek departments are excluded',()=>{
 const excluded=moduleExports.isTjekNonGroceryDepartment;
 for(const slug of ['electronics','apparel','entertainment','automotive','outdoor','sports','pharmacy'])assert.equal(excluded(slug),true);
 for(const slug of ['home','garden','household','beauty','baby','meat-and-fish','dairy-and-cold','unknown',null])assert.equal(excluded(slug),false);
 const provider=fs.readFileSync(path.join(__dirname,'../src/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider.ts'),'utf8');
 assert.match(provider,/if \(isTjekNonGroceryDepartment\(sourceDepartment\)\)/);
 assert.match(provider,/reject\("non-grocery-source-department"\)/);
});

test('read-only Tjek audit exclusions match the production parser allowlist',()=>{
 const audit=fs.readFileSync(path.join(__dirname,'../scripts/audit-hyvinkaa-tjek-departments.mjs'),'utf8');
 const match=audit.match(/if\(\[([^\]]+)\]\.includes\(department\)\)/);
 assert.ok(match,'audit must declare its excluded source departments');
 const auditDepartments=match[1].split(',').map(x=>x.trim().replace(/^['"]|['"]$/g,''));
 const parserDepartments=Array.from(moduleExports.TJEK_NON_GROCERY_DEPARTMENTS);
 assert.deepEqual(auditDepartments.slice().sort(),parserDepartments.slice().sort());
 for(const department of auditDepartments)assert.equal(moduleExports.isTjekNonGroceryDepartment(department),true);
});
