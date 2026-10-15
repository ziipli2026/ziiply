import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'kcm-image-review-'));
try {
 const planFile=path.join(tmp,'plan.json'),candidatesFile=path.join(tmp,'candidates.json'),outFile=path.join(tmp,'review.json');
 const publication='https://kcm-tarjouslehdet.k-ruoka.fi/84s5057_tarjouslehti_42LV_KCM/index.html';
 const pdfSha256='d4ed93636535e2d5aa929ce5f4e41ea6640ea9316857e97d6abfe791c3a1c3cd';
 const offerId='kcm:spatial:1:example:1.99';
 const plan={schemaVersion:1,mode:'offline-image-discovery',readOnly:true,autoApply:false,publication,pdfSha256,taskCount:1,tasks:[{offerId,page:1,query:'Example',publication,pdfSha256,requiresManualVerification:true,autoApply:false}]};
 const base={schemaVersion:1,publication,pdfSha256,items:[{offerId,images:[{url:'https://example.com/product.jpg',source:'Example publisher',ean:'6412345678901',productName:'Example product',brand:'Example brand'}]}]};
 const run=(p,c)=>{fs.writeFileSync(planFile,JSON.stringify(p));fs.writeFileSync(candidatesFile,JSON.stringify(c));return spawnSync(process.execPath,['scripts/citymarket/review-image-candidates.mjs',planFile,candidatesFile,outFile],{encoding:'utf8'});};
 assert.equal(run(plan,base).status,0,'valid candidate should produce review');
 const review=JSON.parse(fs.readFileSync(outFile,'utf8'));
 assert.equal(review.review[0].status,'manual-review');
 assert.equal(review.review[0].images[0].verified,false);
 assert.equal(review.autoApply,false);
 assert.equal(review.review[0].images[0].ean,'6412345678901');
 assert.equal(review.review[0].images[0].productName,'Example product');
 assert.equal(review.review[0].images[0].brand,'Example brand');
 assert.equal(review.review[0].images[0].identityVerified,false);
 const cases=[
  ['wrong publication',{...base,publication:'https://example.com/wrong'}],
  ['unknown offer',{...base,items:[{...base.items[0],offerId:'kcm:spatial:1:unknown:1.99'}]}],
  ['duplicate offer',{...base,items:[base.items[0],base.items[0]]}],
  ['insecure URL',{...base,items:[{offerId,images:[{url:'http://example.com/a.jpg',source:'Example'}]}]}],
  ['missing source',{...base,items:[{offerId,images:[{url:'https://example.com/a.jpg',source:''}]}]}],
 ];
 for(const [name,bad] of cases)assert.notEqual(run(plan,bad).status,0,name+' must be rejected');
 assert.notEqual(run({...plan,tasks:[{...plan.tasks[0],autoApply:true}]},base).status,0,'auto-apply task must be rejected');
 console.log('KCM_IMAGE_REVIEW_NEGATIVE_TESTS_OK',cases.length+1);
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
