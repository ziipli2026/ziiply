import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as guest from '../../src/lib/account/guest.ts';
import { readAccountJson } from '../../src/lib/account/body.ts';
const module={exports:{}};
const compiled=ts.transpileModule(readFileSync(new URL('../../src/lib/account/document.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(compiled,{exports:module.exports,require:()=>guest});
const {validateDocumentWrite}=module.exports;
const valid={id:'D158A868-EB12-4369-8DB3-0EAA0F3BC9CF',mutationId:'9a116c2c-3f7c-456c-89c3-50b0b337424c',expectedRevision:0,snapshot:{version:1,values:{'ziiply-cart-v1':{items:[{id:'weight-1',ziiplyPricePendingWeight:true,price:null}]}}}};
test('document identifiers normalized; cart metadata preserved',()=>{
 const result=validateDocumentWrite(valid);
 assert.equal(result.id,valid.id.toLowerCase());
 assert.equal(result.snapshot.values['ziiply-cart-v1'].items[0].ziiplyPricePendingWeight,true);
});
test('document owner, malformed ids and invalid revisions rejected',()=>{
 for(const change of [{user_id:'other'},{id:'bad'},{mutationId:'bad'},{expectedRevision:-1},{expectedRevision:1.5},{expectedRevision:Number.MAX_SAFE_INTEGER}]) assert.throws(()=>validateDocumentWrite({...valid,...change}));
});
test('request parser rejects malformed JSON',async()=>{
 await assert.rejects(readAccountJson(new Request('http://example.test',{method:'POST',body:'{'})),e=>e.status===400);
});
test('streaming byte limit cancels oversized input',async()=>{
 let cancelled=false;
 const body=new ReadableStream({start(controller){controller.enqueue(new Uint8Array(200000));controller.enqueue(new Uint8Array(60001));},cancel(){cancelled=true;}});
 await assert.rejects(readAccountJson(new Request('http://example.test',{method:'POST',body,duplex:'half'})),e=>e.status===413);
 assert.equal(cancelled,true);
});
test('request parser returns valid JSON without modifying input',async()=>{
 const body=JSON.stringify(valid);
 const result=await readAccountJson(new Request('http://example.test',{method:'POST',body}));
 assert.deepEqual(result,valid);
});
