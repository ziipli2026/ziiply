// Read-only upstream contract probe: no Ziiply APIs, DB writes or deployments.
const fs=require('node:fs');
const base='https://api.ruoanhinta.fi/api/items';
const probes=[];
async function fetchItems(query,take,skip=0,sort=''){
 const url=new URL(base);
 for(const [k,v] of Object.entries({search:query,storeIds:'3221',skip:String(skip),take:String(take)}))url.searchParams.set(k,v);
 if(sort)url.searchParams.set('sort',sort);
 const started=Date.now();
 try{
  const response=await fetch(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(9000)});
  const body=await response.json();
  const items=Array.isArray(body.items)?body.items:[];
  const ids=items.map(x=>String(x.id));
  const record={query,take,skip,sort,status:response.status,elapsedMs:Date.now()-started,count:ids.length,unique:new Set(ids).size,firstIds:ids.slice(0,5),lastIds:ids.slice(-5),ids};
  probes.push(record);
  console.log('PROBE',JSON.stringify({...record,ids:undefined}));
  return record;
 }catch(e){const record={query,take,skip,sort,error:String(e),elapsedMs:Date.now()-started,ids:[]};probes.push(record);console.log('PROBE',JSON.stringify(record));return record;}
}
(async()=>{
 for(const query of ['kala','muro']){
  const first=await fetchItems(query,100);
  const large=await fetchItems(query,300);
  const repeat=await fetchItems(query,100);
  const page=await fetchItems(query,100,100);
  const sorted=await fetchItems(query,100,0,'id');
  const set=(x)=>new Set(x.ids);
  const intersection=(x,y)=>x.ids.filter(id=>set(y).has(id)).length;
  console.log('COMPARISON',JSON.stringify({query,firstVsRepeat:intersection(first,repeat),firstVsLarge:intersection(first,large),firstVsSecondPage:intersection(first,page),firstVsSortId:intersection(first,sorted),largeCount:large.count,sortedChanged:sorted.ids.join(',')!==first.ids.join(',')}));
 }
 // Measure repeated identical first-page calls without changing the upstream.
 for(const query of ['kala','muro','suklaa','makkara']){
  const samples=[];
  for(let i=0;i<8;i++)samples.push(await fetchItems(query,100));
  const counts=new Map();
  for(const sample of samples)for(const id of new Set(sample.ids))counts.set(id,(counts.get(id)||0)+1);
  const union=counts.size,stable=[...counts.values()].filter(n=>n===samples.length).length;
  console.log('STABILITY',JSON.stringify({query,samples:samples.length,union,stable,variable:union-stable,counts:samples.map(x=>x.count),elapsedMs:samples.map(x=>x.elapsedMs)}));
 }
 fs.writeFileSync('ruoanhinta-pagination-contract.json',JSON.stringify({createdAt:new Date().toISOString(),probes},null,2));
 // A rejected experimental sort parameter is an expected contract finding, not a test failure.
 if(probes.some(p=>p.error||(p.status!==200&&!p.sort)))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
