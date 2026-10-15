import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Read-only candidate review. Never writes to image manifests or product data.
const [planFile,candidatesFile,outputFile]=process.argv.slice(2);
if(!planFile||!candidatesFile||!outputFile)throw Error('Usage: node scripts/citymarket/review-image-candidates.mjs <plan.json> <candidates.json> <review.json>');
const plan=JSON.parse(fs.readFileSync(planFile,'utf8'));
const candidates=JSON.parse(fs.readFileSync(candidatesFile,'utf8'));
if(plan.schemaVersion!==1||plan.mode!=='offline-image-discovery'||plan.readOnly!==true||plan.autoApply!==false||!Array.isArray(plan.tasks)||plan.taskCount!==plan.tasks.length||!plan.pdfSha256||!plan.publication)throw Error('Unsafe discovery plan');
if(candidates.schemaVersion!==1||!Array.isArray(candidates.items)||candidates.pdfSha256!==plan.pdfSha256||candidates.publication!==plan.publication)throw Error('Candidate publication mismatch');
const byId=new Map(plan.tasks.map(task=>{
 if(task.autoApply!==false||task.requiresManualVerification!==true||task.pdfSha256!==plan.pdfSha256||task.publication!==plan.publication||!task.offerId?.startsWith('kcm:spatial:'))throw Error('Unsafe discovery task');
 return [task.offerId,task];
}));
if(byId.size!==plan.tasks.length)throw Error('Duplicate discovery plan tasks');
const seen=new Set();
const review=candidates.items.map(item=>{
 if(!byId.has(item.offerId)||seen.has(item.offerId))throw Error('Unknown or duplicate candidate offer ID');
 seen.add(item.offerId);
 const task=byId.get(item.offerId);
 if(!Array.isArray(item.images)||item.images.length>20)throw Error('Invalid image candidates');
 const images=item.images.map(candidate=>{
  if(typeof candidate.url!=='string'||!/^https:\/\/[^\s]+$/i.test(candidate.url)||typeof candidate.source!=='string'||!candidate.source.trim()||candidate.url.length>2048||candidate.source.length>512)throw Error('Invalid candidate image URL or source');
  return {url:candidate.url,source:candidate.source,verified:false,autoApply:false};
 });
 return {offerId:item.offerId,title:task.query,page:task.page,status:images.length?'manual-review':'no-candidate',images};
}).sort((a,b)=>a.page-b.page||a.offerId.localeCompare(b.offerId,'fi'));
const report={schemaVersion:1,publication:plan.publication,pdfSha256:plan.pdfSha256,planDigest:createHash('sha256').update(JSON.stringify(plan)).digest('hex'),readOnly:true,autoApply:false,reviewCount:review.length,review};
fs.mkdirSync(path.dirname(outputFile),{recursive:true});
fs.writeFileSync(outputFile,JSON.stringify(report,null,2)+'\n');
console.log('KCM_IMAGE_CANDIDATE_REVIEW',JSON.stringify({reviewCount:review.length,output:outputFile}));
