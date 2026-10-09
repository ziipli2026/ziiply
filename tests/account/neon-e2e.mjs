// Explicit development-only integration test. Creates two synthetic users and imports.
// Run: node --env-file=.env.account-test tests/account/neon-e2e.mjs
// Never use a production connection or real email address here.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { setTimeout as pause } from 'node:timers/promises';
import { isolatedAccountDatabase } from '../../src/lib/account/database.ts';
if (process.env.ZIIPLY_ACCOUNT_LAB !== 'true' || process.env.VERCEL_ENV !== 'preview') throw Error('Explicit preview configuration required');
isolatedAccountDatabase(process.env);
const endpoint = new URL(process.env.NEON_AUTH_BASE_URL);
const dbHost = new URL(process.env.ZIIPLY_ACCOUNT_DATABASE_URL).hostname.replace('-pooler.', '.');
assert.ok(endpoint.hostname.startsWith(dbHost.split('.')[0] + '.'), 'Auth and SQL must use same development endpoint');
const base = 'http://127.0.0.1:3222';
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', ...(process.env.ZIIPLY_TEST_DEV === '1' ? ['dev', '--webpack'] : ['start']), '-H', '127.0.0.1', '-p', '3222'], { env: process.env, stdio: ['ignore', 'ignore', 'ignore'] });
const jar = () => new Map();
async function request(path, { method = 'GET', body, cookies = jar(), origin = base } = {}) {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(45000), method, redirect: 'manual', headers: {
    origin, 'content-type': 'application/json', cookie: [...cookies].map(([k,v])=>`${k}=${v}`).join(';'),
  }, body: body === undefined ? undefined : JSON.stringify(body) });
  for (const cookie of response.headers.getSetCookie()) {
    const [kv] = cookie.split(';'); const i = kv.indexOf('=');
    const name = kv.slice(0,i), value = kv.slice(i+1);
    if (value) cookies.set(name,value); else cookies.delete(name);
  }
  const text = await response.text();
  let data; try { data = JSON.parse(text); } catch { data = null; }
  return { status: response.status, data, cacheControl: response.headers.get('cache-control') };
}
const snapshot = { version:1, values:{'ziiply-cart-v1':{version:2,savedAt:1,items:[{id:'e2e-item',name:'Integration test',quantity:2,price:null}]}} };
const secret = randomUUID() + '-A1';
const suffix = randomUUID();
const emailA = `ziiply-e2e-a-${suffix}@example.invalid`;
const emailB = `ziiply-e2e-b-${suffix}@example.invalid`;
const a = jar(), b = jar();
let passed = 0;
function ok(name) { passed++; console.log(`PASS ${name}`); }
try {
  let ready = false;
  for (let i=0;i<80;i++) {
    if (server.exitCode !== null) throw Error('Test server stopped');
    try { await request('/account-lab'); ready=true; break; } catch { await pause(250); }
  }
  assert.ok(ready, 'Server startup');
  assert.equal((await request('/api/account/import')).status,401); ok('anonymous read denied');
  assert.equal((await request('/api/account/import',{method:'POST',body:snapshot})).status,401); ok('anonymous write denied');
  assert.equal((await request('/api/account/import',{method:'POST',body:snapshot,origin:'https://other.example'})).status,403); ok('foreign-origin write denied');
  assert.equal((await request('/api/auth/sign-up/email',{method:'POST',cookies:a,body:{name:'Ziiply test A',email:emailA,password:secret}})).status,200); ok('email signup');
  const firstSession=await request('/api/auth/get-session',{cookies:a});
  assert.equal(firstSession.data?.user?.email,emailA); ok('session restored with cookies');
  const firstImport=await request('/api/account/import',{method:'POST',cookies:a,body:snapshot});
  assert.equal(firstImport.status,200); assert.ok(firstImport.data.id); ok('authenticated guest import');
  const retry=await request('/api/account/import',{method:'POST',cookies:a,body:snapshot});
  assert.equal(retry.data?.id,firstImport.data.id); ok('retry is idempotent');
  const listA=await request('/api/account/import',{cookies:a});
  assert.equal(listA.status,200); assert.equal(listA.data.imports.length,1); assert.deepEqual(listA.data.imports[0].snapshot,snapshot); assert.equal(listA.cacheControl, 'private, no-store'); ok('owner reads imported snapshot without shared caching');
  const tampered = new Map([...a].map(([key]) => [key, 'invalid-session']));
  assert.equal((await request('/api/account/import', {cookies:tampered})).status,401); ok('tampered cookies denied');
  assert.equal((await request('/api/account/import',{method:'POST',cookies:a,body:{version:1,values:{token:'no'}}})).status,400); ok('invalid import denied');
  assert.equal((await request('/api/account/import',{method:'POST',cookies:a,body:{version:1,values:{'ziiply-cart-v1':[{name:'x'.repeat(256_001)}]}}})).status,413); ok('oversized request denied');
  assert.equal((await request('/api/auth/sign-up/email',{method:'POST',cookies:b,body:{name:'Ziiply test B',email:emailB,password:secret}})).status,200);
  const listB=await request('/api/account/import?user_id='+encodeURIComponent(firstSession.data.user.id),{cookies:b});
  assert.equal(listB.data?.imports.length,0); ok('second account cannot select first account data');
  const sessionB = await request('/api/auth/get-session', {cookies:b});
  const forgedOwner = await request('/api/account/import', {method:'POST',cookies:a,body:{...snapshot,user_id:sessionB.data.user.id}});
  assert.equal(forgedOwner.data?.id,firstImport.data.id); ok('request cannot override authenticated owner');
  const importB=await request('/api/account/import',{method:'POST',cookies:b,body:snapshot});
  assert.equal(importB.status,200); assert.notEqual(importB.data.id,firstImport.data.id); ok('same snapshot is separately owned');
  assert.equal((await request('/api/account/import',{cookies:a})).data?.imports.length,1); ok('second account did not alter first');
  assert.equal((await request('/api/auth/sign-out',{method:'POST',cookies:a,body:{}})).status,200);
  assert.equal((await request('/api/account/import',{cookies:a})).status,401); ok('signout removes access');
  assert.equal((await request('/api/auth/sign-in/email',{method:'POST',cookies:a,body:{email:emailA,password:'wrong-password'}})).status,401); ok('wrong password denied');
  assert.equal((await request('/api/auth/sign-in/email',{method:'POST',cookies:a,body:{email:emailA,password:secret}})).status,200);
  assert.equal((await request('/api/account/import',{cookies:a})).data?.imports[0]?.id,firstImport.data.id); ok('signin restores same account data');
  const google=await request('/api/auth/sign-in/social',{method:'POST',body:{provider:'google',callbackURL:base+'/account-lab'}});
  assert.equal(google.status,200); const target=new URL(google.data.url); assert.equal(target.origin,endpoint.origin); assert.equal(target.pathname,endpoint.pathname+'/sign-in/social/init'); ok('Google OAuth initiation (consent not tested)');
  assert.equal((await request('/api/account/documents')).status,401); ok('anonymous document read denied');
  assert.equal((await request('/api/account/documents',{method:'POST',body:{}})).status,401); ok('anonymous document write denied');
  assert.equal((await request('/api/account/documents',{method:'POST',body:{},origin:'https://other.example'})).status,403); ok('foreign-origin document write denied');
  const docId=randomUUID(), mutationId=randomUUID();
  const create={id:docId,mutationId,expectedRevision:0,snapshot};
  const created=await request('/api/account/documents',{method:'POST',cookies:a,body:create});
  assert.equal(created.status,200); assert.equal(created.data.document.revision,1); ok('versioned document created');
  const replay=await request('/api/account/documents',{method:'POST',cookies:a,body:create});
  assert.equal(replay.data.document.revision,1); assert.equal(replay.data.replayed,true); ok('document retry does not increment revision');
  const secondDevice=jar();
  assert.equal((await request('/api/auth/sign-in/email',{method:'POST',cookies:secondDevice,body:{email:emailA,password:secret}})).status,200);
  const remote=await request('/api/account/documents?id='+docId,{cookies:secondDevice});
  assert.equal(remote.data.document.revision,1); assert.deepEqual(remote.data.document.snapshot,snapshot); ok('independent device session reads same document');
  const desktopSnapshot={version:1,values:{'ziiply-desktop-current-cart-v1':[{id:'desktop-item',name:'Desktop test',quantity:1,price:null}]}};
  const merged=await request('/api/account/documents',{method:'POST',cookies:secondDevice,body:{id:docId,mutationId:randomUUID(),expectedRevision:1,snapshot:desktopSnapshot}});
  assert.equal(merged.data.document.revision,2); assert.deepEqual(merged.data.document.snapshot.values['ziiply-cart-v1'],snapshot.values['ziiply-cart-v1']); assert.deepEqual(merged.data.document.snapshot.values['ziiply-desktop-current-cart-v1'],desktopSnapshot.values['ziiply-desktop-current-cart-v1']); ok('desktop save preserves absent mobile keys');
  assert.equal((await request('/api/account/documents',{method:'POST',cookies:a,body:{...create,mutationId:randomUUID(),expectedRevision:1}})).status,409); ok('stale device revision cannot overwrite');
  const changes=[3,4].map(quantity=>({id:docId,mutationId:randomUUID(),expectedRevision:2,snapshot:{version:1,values:{'ziiply-cart-v1':{version:2,items:[{id:'e2e-item',quantity,price:null}]}}}}));
  const racing=await Promise.all(changes.map((body,i)=>request('/api/account/documents',{method:'POST',cookies:i?secondDevice:a,body})));
  assert.deepEqual(racing.map(x=>x.status).sort(),[200,409]);
  const current=await request('/api/account/documents?id='+docId,{cookies:a});
  assert.equal(current.data.document.revision,3); const winner=racing.findIndex(x=>x.status===200); assert.equal(current.data.document.snapshot.values['ziiply-cart-v1'].items[0].quantity,changes[winner].snapshot.values['ziiply-cart-v1'].items[0].quantity); ok('concurrent writers have exactly one winner');
  const delayed=await request('/api/account/documents',{method:'POST',cookies:a,body:create});
  assert.equal(delayed.data.replayed,true); assert.equal(delayed.data.document.revision,1);
  assert.equal((await request('/api/account/documents?id='+docId,{cookies:a})).data.document.revision,3); ok('late retry acknowledges old operation without rollback');
  const reused=await request('/api/account/documents',{method:'POST',cookies:a,body:{...create,snapshot:desktopSnapshot}});
  assert.equal(reused.status,409); assert.equal(reused.data.outcome,'mutation_conflict'); ok('mutation identifier cannot be reused for different payload');
  assert.equal((await request('/api/account/documents?id='+docId,{cookies:b})).status,404); ok('other account cannot read selected document');
  assert.equal((await request('/api/account/documents',{method:'POST',cookies:b,body:{...create,mutationId:randomUUID(),expectedRevision:3}})).status,409); ok('other account cannot update selected document');
  const ownB=await request('/api/account/documents',{method:'POST',cookies:b,body:create});
  assert.equal(ownB.status,200); assert.equal(ownB.data.document.revision,1); assert.equal((await request('/api/account/documents?id='+docId,{cookies:a})).data.document.revision,3); ok('same document identifier remains separately owned');
  assert.equal((await request('/api/account/documents',{method:'POST',cookies:a,body:{...create,user_id:sessionB.data.user.id}})).status,400); ok('document owner override rejected');
  assert.equal((await request('/api/account/documents',{method:'POST',cookies:a,body:{...create,expectedRevision:-1}})).status,400); ok('invalid document revision rejected');
  const bigId=randomUUID(); const bigMobile={version:1,values:{'ziiply-cart-v1':[{name:'x'.repeat(140000)}]}};
  assert.equal((await request('/api/account/documents',{method:'POST',cookies:a,body:{id:bigId,mutationId:randomUUID(),expectedRevision:0,snapshot:bigMobile}})).status,200);
  const tooLarge=await request('/api/account/documents',{method:'POST',cookies:a,body:{id:bigId,mutationId:randomUUID(),expectedRevision:1,snapshot:{version:1,values:{'ziiply-desktop-current-cart-v1':[{name:'y'.repeat(140000)}]}}}});
  assert.equal(tooLarge.status,413); assert.equal((await request('/api/account/documents?id='+bigId,{cookies:a})).data.document.revision,1); ok('merged size limit rejects without partial save');
  console.log(`${passed} integration checks passed; no production writes`);
} catch (error) {
  // No raw responses, passwords, session cookies or tokens in diagnostics.
  console.error('Integration check failed:', error.message); process.exitCode=1;
} finally { server.kill(); }
