// Run outside serverless request lifetimes: node scripts/refresh-citymarket-tjek.cjs
const fs = require('node:fs');
const ts = require('typescript');
const path = require('node:path');
const originalJs = require.extensions['.js'];
function compile(module, filename) {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true }, fileName: filename,
  });
  module._compile(result.outputText, filename);
}
require.extensions['.ts'] = compile;
const project = path.resolve(__dirname, '..');
require.extensions['.js'] = (module, filename) => filename.startsWith(project + '/src/') ? compile(module, filename) : originalJs(module, filename);
// The repository's shared Actions secret selects aseappi_registry. The existing
// Coop importer uses the Ziiply neondb database on this same endpoint as well.
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL missing');
const targetUrl = new URL(process.env.DATABASE_URL);
targetUrl.pathname = '/neondb';
process.env.DATABASE_URL = targetUrl.toString();
const provider = require('../src/app/components/ziiply/offerSearch/providers/kCitymarketLocalTjekProvider.ts');
(async () => {
  const sql = require('@neondatabase/serverless').neon(process.env.DATABASE_URL);
  const checks = await sql`SELECT current_database() AS database_name,
    to_regclass('public.ziiply_ean_products') AS ean_table,
    to_regclass('public.ziiply_kcitymarket_tjek_snapshots') AS snapshot_table`;
  console.log(JSON.stringify({databaseHost:targetUrl.hostname,...checks[0]}));
  if (!checks[0]?.ean_table || !checks[0]?.snapshot_table) {
    throw new Error('Ziiply database preflight failed; no collection or writes attempted');
  }
  for (const store of process.argv.slice(2).length ? process.argv.slice(2) : ['K-Citymarket Hyvinkää']) {
    console.log(JSON.stringify({store,stage:'starting'}));
    const timer = setInterval(() => console.log(JSON.stringify(provider.getKCitymarketLocalTjekDebug(store))), 15000);
    let rows;
    try { rows = await provider.refreshKCitymarketSelectedStoreSnapshot(store); }
    catch (error) {
      console.error(JSON.stringify({store, debug:provider.getKCitymarketLocalTjekDebug(store), error:error.message, cause:error.cause?.code || error.cause?.message}));
      throw error;
    } finally { clearInterval(timer); }
    const collectionDebug = provider.getKCitymarketLocalTjekDebug(store);
    const readBack = await provider.fetchKCitymarketSelectedStoreOffers(store);
    console.log(JSON.stringify({ store, published: rows.length, readBack: readBack.length, debug: collectionDebug }));
    if (rows.length !== readBack.length) throw new Error('Snapshot read-back count mismatch');
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
