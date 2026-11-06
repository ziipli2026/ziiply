import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);

test("all direct production dependencies are installed from the lockfile",()=>{
 const pkg=JSON.parse(readFileSync("package.json","utf8"));
 const lock=JSON.parse(readFileSync("package-lock.json","utf8"));
 for(const [name,range] of Object.entries(pkg.dependencies??{})){
  assert.equal(lock.packages[""].dependencies[name],range,`stale dependency ${name}`);
  const node=lock.packages[`node_modules/${name}`];
  assert.ok(node?.version,`missing locked version for ${name}`);
  assert.ok(node.integrity||node.link,`missing integrity for ${name}`);
 }
});
test("Nodemailer resolves from installed dependencies",()=>{
 assert.ok(require.resolve("nodemailer"));
});
