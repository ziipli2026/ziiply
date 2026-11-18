import { writeFileSync, mkdirSync } from 'node:fs';
import baseline from './fixtures/hyvinkaa-tjek-offer-baseline-20261117.mjs';
// Read-only comparison of the previously saved Neon snapshot with public Tjek
// source department metadata. This is a source-data audit, not an EAN match.
const mapping = {'fruits-and-vegetables':'Hevi','beverages':'Juomat','frozen':'Pakasteet','household':'Kodinhoito','beauty':'Hygienia & kosmetiikka'};
const stable = v => JSON.stringify(v, (_k,x) => x && Object.prototype.toString.call(x)==='[object Object]' ? Object.keys(x).sort().reduce((a,k)=>(a[k]=x[k],a),{}) : x);
const counts={total:baseline.length,matched:0,missing:0,failed:0,mapped:0,changed:0,unchanged:0,ambiguous:0};
const transitions={};const departments={};const failures=[];
const baselineByDepartment={};const excludedByDepartment={};const excludedByOldCategory={};
const remainingByDepartment={};const remainingByOldCategory={};
const reviewRows=[];
const verifiedDepartments=[];
for(let i=0;i<baseline.length;i+=8){
 const batch=baseline.slice(i,i+8);
 await Promise.all(batch.map(async row=>{
  try{
   const key=Buffer.from(stable(['offer',{publicId:row.id}]),'utf8').toString('base64');
   let payload=null;
   // A transient source miss must not abort the browser suite. Retry the same
   // exact publicId, but never invent metadata or count an absent row as verified.
   for(let attempt=0;attempt<3;attempt++){
     try{
       const response=await fetch('https://etarjouslehdet.fi/',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/plain, */*',Referer:'https://etarjouslehdet.fi/K-Citymarket'},body:JSON.stringify({data:[key]}),signal:AbortSignal.timeout(15000)});
       if(!response.ok)throw Error('HTTP '+response.status);
       payload=(await response.text()).split(/\r?\n/).filter(Boolean).map(x=>{try{return JSON.parse(x)}catch{return null}}).find(x=>x?.key===key)?.value??null;
       if(payload && typeof payload==='object')break;
     }catch(error){if(attempt===2)throw error;}
     if(attempt<2)await new Promise(resolve=>setTimeout(resolve,300*(attempt+1)));
   }
   if(!payload || typeof payload!=='object'){counts.missing++;console.error('TJEK_AUDIT_SOURCE_MISSING',row.id);return;}
   counts.matched++;
   const department=typeof payload.departmentSlug==='string'?payload.departmentSlug:'(missing)';
   departments[department]=(departments[department]||0)+1;
   verifiedDepartments.push({offerId:row.id,departmentSlug:department,sourceName:String(payload.name??'')});
   if(['electronics','apparel','entertainment','automotive','outdoor','sports','pharmacy','home'].includes(department)){
     excludedByDepartment[department]=(excludedByDepartment[department]||0)+1;
     excludedByOldCategory[row.category]=(excludedByOldCategory[row.category]||0)+1;
   } else {
     remainingByDepartment[department]=(remainingByDepartment[department]||0)+1;
     remainingByOldCategory[row.category]=(remainingByOldCategory[row.category]||0)+1;
     if(['home','garden','baby','pharmacy','outdoor','automotive','sports'].includes(department))reviewRows.push({id:row.id,department,oldCategory:row.category,title:String(payload.name||'').slice(0,100)});
   }
   const pair=department+' :: '+row.category;
   baselineByDepartment[pair]=(baselineByDepartment[pair]||0)+1;
   const target=Object.prototype.hasOwnProperty.call(mapping,department)?mapping[department]:null;
   if(!target){counts.ambiguous++;return;}
   counts.mapped++;
   if(target===row.category)counts.unchanged++;else counts.changed++;
   const keyTransition=row.category+' => '+target;
   transitions[keyTransition]=(transitions[keyTransition]||0)+1;
  }catch(error){counts.failed++;failures.push({id:row.id,error:String(error.message||error)});}
 }));
}
console.log('TJEK_AUDIT_COUNTS',JSON.stringify(counts));
console.log('TJEK_AUDIT_DEPARTMENTS',JSON.stringify(Object.entries(departments).sort((a,b)=>b[1]-a[1])));
console.log('TJEK_AUDIT_TRANSITIONS',JSON.stringify(Object.entries(transitions).sort((a,b)=>b[1]-a[1])));
console.log('TJEK_AUDIT_BASELINE_BY_DEPARTMENT',JSON.stringify(Object.entries(baselineByDepartment).sort((a,b)=>b[1]-a[1])));
console.log('TJEK_AUDIT_EXCLUDED',JSON.stringify({byDepartment:excludedByDepartment,byOldCategory:excludedByOldCategory,total:Object.values(excludedByDepartment).reduce((a,b)=>a+b,0),remaining:counts.matched-Object.values(excludedByDepartment).reduce((a,b)=>a+b,0)}));
console.log('TJEK_AUDIT_REMAINING',JSON.stringify({byDepartment:Object.entries(remainingByDepartment).sort((a,b)=>b[1]-a[1]),byOldCategory:Object.entries(remainingByOldCategory).sort((a,b)=>b[1]-a[1])}));
console.log('TJEK_AUDIT_REVIEW_ROWS',JSON.stringify(reviewRows.sort((a,b)=>a.department.localeCompare(b.department)).slice(0,80)));
console.log('TJEK_AUDIT_FAILURES',JSON.stringify(failures.slice(0,20)));
if(counts.matched!==counts.total || counts.missing!==0 || counts.failed!==0){
 console.error('TJEK_AUDIT_INCOMPLETE: source coverage must be 100%; no partial success');
 process.exitCode=1;
}

// Produce a reviewable, source-verified manifest. Never mutate Neon in CI.
if(process.exitCode!==1 && verifiedDepartments.length===baseline.length && verifiedDepartments.every(x=>x.departmentSlug!=='(missing)')){
 mkdirSync('artifacts',{recursive:true});
 writeFileSync('artifacts/hyvinkaa-tjek-departments-verified.json',JSON.stringify({baselineCount:baseline.length,source:'Tjek offer API',verifiedAt:new Date().toISOString(),offers:verifiedDepartments.sort((a,b)=>a.offerId.localeCompare(b.offerId))},null,2)+'\n');
 console.log('TJEK_AUDIT_MANIFEST_READY',verifiedDepartments.length);
}else{
 console.error('TJEK_AUDIT_MANIFEST_BLOCKED: incomplete or missing department metadata');
 process.exitCode=1;
}
