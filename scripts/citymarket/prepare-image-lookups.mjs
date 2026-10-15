import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Offline preparation only. No HTTP requests and no writes to product or image manifests.
const input=process.argv[2];
const output=process.argv[3];
if(!input||!output)throw Error('Usage: node scripts/citymarket/prepare-image-lookups.mjs <lookup-only.json> <output.json>');
const source=JSON.parse(fs.readFileSync(input,'utf8'));
if(source.schemaVersion!==1||source.readOnly!==true||!Array.isArray(source.items)||!source.pdfSha256)throw Error('Invalid read-only lookup source');
const expectedHash='d4ed93636535e2d5aa929ce5f4e41ea6640ea9316857e97d6abfe791c3a1c3cd';
const expectedPublication='https://kcm-tarjouslehdet.k-ruoka.fi/84s5057_tarjouslehti_42LV_KCM/index.html';
if(source.pdfSha256!==expectedHash||source.publication!==expectedPublication)throw Error('Wrong 42LV image lookup publication');
if(source.items.length>94)throw Error('Too many 42LV image lookup tasks');
const seen=new Set();
const tasks=source.items.map(item=>{
 if(item.status!=='lookup-needed'||item.publicationSha256!==source.pdfSha256||!item.offerId?.startsWith('kcm:spatial:')||!Number.isInteger(item.page)||item.page<1||!item.title?.trim()||!(item.price>0))throw Error('Unsafe image lookup item');
 if(seen.has(item.offerId))throw Error('Duplicate image lookup: '+item.offerId);
 seen.add(item.offerId);
 return {offerId:item.offerId,page:item.page,query:item.title.trim(),publication:source.publication,pdfSha256:source.pdfSha256,priceForIdentityOnly:item.price,requiresManualVerification:true,autoApply:false};
}).sort((a,b)=>a.page-b.page||a.offerId.localeCompare(b.offerId,'fi'));
const sourceDigest=createHash('sha256').update(JSON.stringify(source.items)).digest('hex');
const plan={sourceDigest,sourceTaskCount:source.items.length,schemaVersion:1,mode:'offline-image-discovery',readOnly:true,autoApply:false,publication:source.publication,pdfSha256:source.pdfSha256,taskCount:tasks.length,tasks};
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(plan,null,2)+'\n');
console.log('KCM_IMAGE_DISCOVERY_PLAN',JSON.stringify({tasks:tasks.length,output}));
