import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const root="src/app/api/arvo/";
const routes=[
 {file:"meals/route.ts",method:"GET",mutation:false},
 {file:"consent/route.ts",method:"POST",mutation:true},
 {file:"meals/write/route.ts",method:"POST",mutation:true},
 {file:"meals/delete/route.ts",method:"POST",mutation:true},
];
for(const route of routes){
 test(`Arvo ${route.file} is fail-closed and beta-cookie bound`,()=>{
  const code=readFileSync(root+route.file,"utf8");
  assert.match(code,/ZIIPLY_ARVO_CLOUD_API_ENABLED\s*!==\s*"true"/);
  assert.match(code,/process\.env\.DATABASE_URL/);
  assert.match(code,/request\.cookies\.get\(ARVO_BETA_COOKIE_NAME\)/);
  assert.match(code,/executeArvoCloudOperation\(token,/);
  assert.match(code,/export async function (?:GET|POST)\(/);
  assert.match(code,/Cache-Control.*no-store/);
  assert.doesNotMatch(code,/request\.nextUrl\.searchParams\.get\(["'](?:userId|token)/);
  if(route.mutation){
   assert.match(code,/request\.headers\.get\("origin"\)\s*!==\s*process\.env\.ZIIPLY_PUBLIC_ORIGIN/);
   assert.match(code,/request\.json\(\)/);
  }
 });
}
