const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync('src/app/api/fuel/stations/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
async function lookup(branch='br-weathered-meadow-b1bwpzst'){
  let selected;const exports={};
  const sql=async strings=>strings[0].includes('current_setting')?[{branch_id:branch}]:[{available:false}];
  sql.query=async()=>[];
  vm.runInNewContext(code,{exports,process:{env:{VERCEL_ENV:'production',TANKKAUS_TEST_DATABASE_URL:'test-fuel-connection',DATABASE_URL:'general-app-connection'}},require(name){
    if(name==='@neondatabase/serverless')return {neon(connection){selected=connection;return sql;}};
    if(name==='next/server')return {NextResponse:{json(body,init){return {body,status:init?.status??200};}}};
    throw new Error(name);
  }});
  const response=await exports.GET({nextUrl:new URL('https://ziiply.vercel.app/api/fuel/stations?lat=60.4939&lon=25.5413944')});
  return {selected,response};
}
test('production photo station lookup uses the configured fuel test registry',async()=>{
 const {selected,response}=await lookup();assert.equal(selected,'test-fuel-connection');assert.equal(response.status,200);
});
test('fuel registry rejects a connection to the wrong Neon branch',async()=>{
 const {response}=await lookup('wrong-branch');assert.equal(response.status,503);
});
