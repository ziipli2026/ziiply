import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';
const base = 'http://127.0.0.1:3233';
let checks = 0;
for (const [name, flag, deployment] of [['default-disabled','false','preview'],['production-opt-in-blocked','true','production']]) {
  const env = { ...process.env, ZIIPLY_ACCOUNT_LAB:flag, VERCEL_ENV:deployment };
  for (const key of ['NEON_AUTH_BASE_URL','NEON_AUTH_COOKIE_SECRET','ZIIPLY_ACCOUNT_DATABASE_URL','ZIIPLY_ACCOUNT_DATABASE_HOST']) delete env[key];
  const server = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','-H','127.0.0.1','-p','3233'], { env, stdio:'ignore' });
  try {
    let ready = false;
    for (let i=0;i<60;i++) {
      if (server.exitCode !== null) throw Error('Test server stopped');
      try { await fetch(base+'/api/auth/get-session'); ready=true; break; } catch { await pause(250); }
    }
    assert.ok(ready,'Server startup');
    for (const [path,method,status] of [['/','GET',200],['/manifest.webmanifest','GET',200],['/account-lab','GET',404],['/api/auth/get-session','GET',404],['/api/account/import','GET',404],['/api/account/import','POST',404],['/api/account/documents','GET',404],['/api/account/documents','POST',404]]) {
      const response = await fetch(base+path,{method,redirect:'manual',signal:AbortSignal.timeout(15000)});
      assert.equal(response.status,status,`${name}: ${method} ${path}`);
      checks++;
    }
    console.log(`PASS ${name}: main app/PWA public, account routes disabled`);
  } finally {
    server.kill();
    if (server.exitCode === null) await new Promise(resolve=>server.once('exit',resolve));
  }
}
console.log(`${checks} HTTP guards passed without Auth/database configuration`);
