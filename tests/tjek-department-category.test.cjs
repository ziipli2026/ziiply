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
