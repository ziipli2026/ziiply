const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const ts=require('typescript');const vm=require('node:vm');
const src=fs.readFileSync(path.join(__dirname,'../src/app/components/ziiply/offerSearch/tjekDepartmentCategory.ts'),'utf8');
const compiled=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleExports={};vm.runInNewContext(compiled,{exports:moduleExports});
const map=moduleExports.tjekDepartmentCategory;
test('source department maps broad grocery groups',()=>{
  for(const [slug,expected] of Object.entries({'fruits-and-vegetables':'Hevi','beverages':'Juomat','frozen':'Pakasteet','household':'Kodinhoito','beauty':'Hygienia & kosmetiikka','cold-cuts':'Liha & makkarat'}))assert.equal(map(slug),expected);
});
test('ambiguous departments never receive guessed categories',()=>{
  for(const slug of ['meat-and-fish','dairy-and-cold','colonial','bread-and-cakes','snacks-and-candies','electronics','apparel','unknown',null])assert.equal(map(slug),null);
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
 for(const slug of ['electronics','apparel','entertainment','automotive','outdoor','sports','pharmacy','home','do-it-yourself'])assert.equal(excluded(slug),true);
 for(const slug of ['garden','household','beauty','baby','meat-and-fish','dairy-and-cold','unknown',null])assert.equal(excluded(slug),false);
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

test('local Tjek non-grocery rejection happens before offer acceptance',()=>{
 const provider=fs.readFileSync(path.join(__dirname,'../src/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider.ts'),'utf8');
 const reject=provider.indexOf('if (isTjekNonGroceryDepartment(sourceDepartment))');
 const accepted=provider.indexOf('acceptedOfferKeys.add(offerKey)',reject);
 const pushed=provider.indexOf('entry.rows.push(',reject);
 assert.ok(reject>0 && accepted>reject && pushed>accepted,'excluded source departments must never enter accepted rows');
});

test('stored Tjek snapshots are screened using source department metadata',()=>{
 const provider=fs.readFileSync(path.join(__dirname,'../src/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider.ts'),'utf8');
 assert.match(provider,/const fallback = normalizeTjekGroceryCategories\(\(await readPublishedSnapshot\(fallbackKey\) \?\? \[\]\)\)/);
});

test('shared filter removes non-grocery rows from real-shaped persisted snapshots',()=>{
 const filter=moduleExports.filterTjekGroceryRows;
 const rows=[{offerId:'a',price:5,debug:{tjekDepartmentSlug:'home'}},{offerId:'b',price:3,debug:{tjekDepartmentSlug:'dairy-and-cold'}},{offerId:'c',price:2,tjekDepartmentSlug:'electronics'},{offerId:'d',price:1,debug:{tjekDepartmentSlug:'garden'}}];
 const kept=filter(rows);
 assert.deepEqual(kept.map(x=>x.offerId),['b','d']);
 assert.equal(kept[0],rows[1]);assert.equal(kept[1],rows[3]);
});

test('live and stored Tjek offers use the same grocery-only filter',()=>{
 const provider=fs.readFileSync(path.join(__dirname,'../src/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider.ts'),'utf8');
 assert.match(provider,/const fallback = normalizeTjekGroceryCategories\(\(await readPublishedSnapshot\(fallbackKey\) \?\? \[\]\)\)/);
 assert.match(provider,/const live = normalizeTjekGroceryCategories\(entry\?\.rows \?\? \[\]\)\.filter\(row => isActiveOffer\(row, Date\.now\(\)\)\)/);
});

test('persisted snapshot and live Tjek rows use the same verified category without mutating source',()=>{
  const row={title:'PIRKKA Parhaat SALAME MILANO',category:'Muut',
    categoryPath:'Muut',productGroup:'Muut',mainCategory:'Muut',
    debug:{tjekDepartmentSlug:'cold-cuts',categorySource:'legacy-title'}};
  const mixed={title:'Santa Maria TORTILLA CHIPSIT',category:'Kuivatuotteet',
    debug:{tjekDepartmentSlug:'snacks-and-candies',categorySource:'legacy-title'}};
  const excluded={title:'Tarmo PORRASJAKKARA',category:'Muut',
    debug:{tjekDepartmentSlug:'do-it-yourself'}};
  const result=moduleExports.normalizeTjekGroceryCategories([row,mixed,excluded]);
  assert.equal(result.length,2);
  for(const field of ['category','categoryPath','productGroup','mainCategory'])
    assert.equal(result[0][field],'Liha & makkarat');
  assert.equal(result[0].debug.categorySource,'tjek-department');
  assert.equal(result[1],mixed);
  assert.equal(row.category,'Muut');
  assert.equal(row.debug.categorySource,'legacy-title');
  assert.notEqual(result[0],row);
});

test('verified other-department hygiene products are categorized and nightwear is excluded',()=>{
  const rows=[
    {title:"L'ORÉAL PARIS Infaillible 3-Second MEIKINKIINNITYSSUIHKE",category:'Muut',debug:{tjekDepartmentSlug:'other'}},
    {title:'bliw NESTESAIPPUOIDEN TÄYTTÖPUSSIT',category:'Muut',debug:{tjekDepartmentSlug:'other'}},
    {title:'Aikuisten YÖASUJA',category:'Muut',debug:{tjekDepartmentSlug:'other'}},
    {title:'Tuntematon tuote',category:'Muut',debug:{tjekDepartmentSlug:'other'}}
  ];
  const result=moduleExports.normalizeTjekGroceryCategories(rows);
  assert.equal(result.length,3);
  assert.equal(result[0].category,'Hygienia & kosmetiikka');
  assert.equal(result[1].category,'Hygienia & kosmetiikka');
  assert.equal(result[2].category,'Muut');
  assert.equal(rows[0].category,'Muut');
});
