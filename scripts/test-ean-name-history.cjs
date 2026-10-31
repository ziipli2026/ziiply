// Exercise both real upsert statements on a transaction-local table. The
// production catalogue is never written by this test; the table drops on commit.
require('./recipe-audit-runtime.cjs');
const assert=require('node:assert/strict');
const Module=require('node:module');
const {neon}=require('@neondatabase/serverless');
const {NextRequest}=require('next/server');
const captured=[];
const originalLoad=Module._load;
Module._load=function(id,...args){
 if(id==='@neondatabase/serverless')return {neon:()=>async(strings,...values)=>{if(strings.join('?').includes('INSERT INTO'))captured.push({strings,values});return [];}};
 return originalLoad.call(this,id,...args);
};
const {observeEanProductsBestEffort}=require('../src/lib/eanBank.ts');
const {POST}=require('../src/app/api/ean-bank/route.ts');
Module._load=originalLoad;
(async()=>{
 assert.ok(process.env.DATABASE_URL,'Missing DATABASE_URL');
 const ean='9999999999901';
 await observeEanProductsBestEffort([{ean,name:'Täydellinen tuotteen nimi 500g',source:'test'}]);
 await observeEanProductsBestEffort([{ean,name:'Tuote 500g',source:'test'}]);
 const response=await POST(new NextRequest('http://localhost/api/ean-bank',{method:'POST',body:JSON.stringify({ean,name:'Uusin nimi 500g',aliases:['Lisänimi','Tuote 500g']})}));
 assert.equal(response.status,200);
 for(let i=0;i<30;i++)await observeEanProductsBestEffort([{ean:'9999999999902',name:'Tuote '+i,source:'test'}]);
 const sql=neon(process.env.DATABASE_URL);
 const result=await sql.transaction([
  sql`CREATE TEMP TABLE ziiply_ean_products (LIKE public.ziiply_ean_products INCLUDING ALL) ON COMMIT DROP`,
  ...captured.map(q=>sql(q.strings,...q.values)),
  sql`SELECT ean,name,aliases FROM ziiply_ean_products ORDER BY ean`,
 ]);
 const rows=result.at(-1);
 assert.equal(rows.length,2);
 assert.equal(rows[0].name,'Uusin nimi 500g');
 for(const name of ['Täydellinen tuotteen nimi 500g','Tuote 500g','Uusin nimi 500g','Lisänimi'])assert.ok(rows[0].aliases.includes(name),'Lost observed name: '+name);
 assert.equal(new Set(rows[0].aliases).size,rows[0].aliases.length);
 assert.equal(rows[1].aliases.length,24,'name history must stay bounded');
 assert.equal(rows[1].aliases[0],'Tuote 29');
 console.log('PASS both EAN upserts retain distinct names, newest first, maximum 24; transaction-local table dropped');
})().catch(error=>{console.error(error);process.exitCode=1});
