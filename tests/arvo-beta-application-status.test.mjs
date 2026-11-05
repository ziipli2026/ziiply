import assert from "node:assert/strict";
import test from "node:test";
import {createArvoNeonSessionLookup} from "../src/app/components/ziiply/arvo/arvoNeonSessionLookup.server.ts";
import {createArvoNeonConsentSessionLookup} from "../src/app/components/ziiply/arvo/arvoNeonConsentSessionLookup.server.ts";
const hash="a".repeat(64);
for(const [name,factory] of [["cloud meal access",createArvoNeonSessionLookup],["first consent",createArvoNeonConsentSessionLookup]]){
 test(name+" requires eligible beta application status",async()=>{
  let query,params;
  const lookup=factory({query:async(sql,bound)=>{query=sql;params=bound;return {rows:[]};}});
  assert.equal(await lookup(hash),null);
  assert.match(query,/JOIN public\.ziiply_beta_applications a ON a\.id=u\.application_id/);
  assert.match(query,/a\.status IN \('invited','active'\)/);
  assert.deepEqual(params,[hash]);
 });
}
