import fs from 'node:fs';
import path from 'node:path';

// Offline preparation only. No HTTP requests and no writes to product or image manifests.
const input=process.argv[2];
const output=process.argv[3];
if(!input||!output)throw Error('Usage: node scripts/citymarket/prepare-image-lookups.mjs <lookup-only.json> <output.json>');
const source=JSON.parse(fs.readFileSync(input,'utf8'));
if(source.schemaVersion!==1||source.readOnly!==true||!Array.isArray(source.items)||!source.pdfSha256)throw Error('Invalid read-only lookup source');
const seen=new Set();
const tasks=source.items.map(item=>{
 if(item.status!=='lookup-needed'||item.publicationSha256!==source.pdfSha256||!item.offerId?.startsWith('kcm:spatial:')||!Number.isInteger(item.page)||item.page<1||!item.title?.trim()||!(item.price>0))throw Error('Unsafe image lookup item');
 if(seen.has(item.offerId))throw Error('Duplicate image lookup: '+item.offerId);
 seen.add(item.offerId);
 return {offerId:item.offerId,page:item.page,query:item.title.trim(),publication:source.publication,pdfSha256:source.pdfSha256,priceForIdentityOnly:item.price,requiresManualVerification:true,autoApply:false};
}).sort((a,b)=>a.page-b.page||a.offerId.localeCompare(b.offerId,'fi'));
const plan={schemaVersion:1,mode:'offline-image-discovery',readOnly:true,autoApply:false,publication:source.publication,pdfSha256:source.pdfSha256,taskCount:tasks.length,tasks};
fs.mkdirSync(path.dirname(output),{recursive:true});
fs.writeFileSync(output,JSON.stringify(plan,null,2)+'\n');
console.log('KCM_IMAGE_DISCOVERY_PLAN',JSON.stringify({tasks:tasks.length,output}));
