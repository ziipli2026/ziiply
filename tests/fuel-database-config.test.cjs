const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const exp={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/fuelDatabase.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exp,process:{env:{}}});
const production='br-lucky-fog-b1hwz641',preview='br-weathered-meadow-b1bwpzst';
const test=exp.fuelDatabaseConfig({TANKKAUS_TEST_DATABASE_URL:'test',DATABASE_URL:'prod'});assert.equal(test.connection,'test');assert.equal(test.expectedBranch,preview);
assert.equal(exp.fuelDatabaseConfig({DATABASE_URL:'prod'}).connection,undefined,'No implicit production report writes');
const live=exp.fuelDatabaseConfig({FUEL_PRODUCTION_ENABLED:'true',TANKKAUS_TEST_DATABASE_URL:'test',DATABASE_URL:'new-arvo-db',FUEL_DATABASE_URL:'original-fuel-db'});assert.equal(live.connection,'original-fuel-db');assert.equal(live.expectedBranch,production);
assert.equal(exp.fuelDatabaseConfig({FUEL_PRODUCTION_ENABLED:'true',TANKKAUS_TEST_DATABASE_URL:'test',DATABASE_URL:'new-arvo-db'}).connection,undefined,'No fallback into test or changed default database when production is enabled');
assert.equal(exp.fuelDatabaseConfig({FUEL_PRODUCTION_ENABLED:'false',TANKKAUS_TEST_DATABASE_URL:'test',DATABASE_URL:'prod'}).connection,'test');
console.log('Fuel production switch checks passed');
