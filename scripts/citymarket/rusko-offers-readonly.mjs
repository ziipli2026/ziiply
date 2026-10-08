// Oulu Rusko read-only audit using Ziiply's existing Tjek store/publication API.
// No database writes and no changes to the production offer pipeline.
import assert from "node:assert/strict";
const ORIGIN="https://etarjouslehdet.fi/";
const BUSINESS="38d088";
const wanted="k citymarket oulu rusko";
const normalize=v=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const stable=v=>JSON.stringify(v,(_k,x)=>x&&Object.prototype.toString.call(x)==="[object Object]"?Object.keys(x).sort().reduce((o,k)=>(o[k]=x[k],o),{}):x);
async function tjek(name,params){
  const key=Buffer.from(stable([name,params]),"utf8").toString("base64");
  const r=await fetch(ORIGIN,{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json, text/plain, */*",Referer:ORIGIN+"K-Citymarket"},body:JSON.stringify({data:[key]}),signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error(name+" HTTP "+r.status);
  for(const line of (await r.text()).split(/\r?\n/).filter(Boolean)){try{const p=JSON.parse(line);if(p.key===key)return p.value}catch{}}
  throw Error(name+" response missing");
}
const rows=x=>Array.isArray(x?.data)?x.data:[];
try{
  const stores=rows(await tjek("stores",{businessId:BUSINESS,pagination:{offset:0,limit:1000}}));
  const matches=stores.filter(s=>normalize(s.name)===wanted);
  assert.equal(matches.length,1,"Oulu Rusko must match exactly once");
  const store=matches[0];assert.ok(store.id&&store.coordinates,"store identity/coordinates missing");
  const fronts=await tjek("fronts",{businessIds:[BUSINESS],localBusinessIds:[String(store.id)],coordinates:store.coordinates});
  const now=Date.now();
  const pubs=(Array.isArray(fronts)?fronts:[]).flatMap(x=>x?.publications||[]).filter(p=>{const a=Date.parse(p.validFrom),b=Date.parse(p.validUntil);return Number.isFinite(a)&&Number.isFinite(b)&&a<=now&&now<=b});
  const output=[];let pages=0,hotspots=0,rejectedForeign=0;const seen=new Set();
  for(const pub of pubs.slice(0,5)){
    assert.ok(pub.id,"publication id missing");
    for(let page=1;page<=20;page++){
      const r=await fetch("https://publication-viewer.tjek.com/api/paged-publications/"+encodeURIComponent(pub.id)+"/"+page,{signal:AbortSignal.timeout(15000)});
      if(!r.ok){if(page>1&&[400,404].includes(r.status))break;throw Error("publication page HTTP "+r.status)}
      const payload=await r.json();pages++;
      const hs=Array.isArray(payload.hotspots)?payload.hotspots:[];hotspots+=hs.length;
      const ids=[...new Set(hs.map(h=>String(h?.offer?.id??"")).filter(Boolean))].filter(id=>!seen.has(id));ids.forEach(id=>seen.add(id));
      for(let i=0;i<ids.length;i+=8){
        const offers=await Promise.all(ids.slice(i,i+8).map(async id=>{try{return {id,offer:await tjek("offer",{publicId:id})}}catch(e){return {id,error:String(e)}}}));
        for(const item of offers){
          if(item.error){output.push({id:item.id,error:item.error});continue}
          const o=item.offer;
          if(String(o?.publicationPublicId??pub.id)!==String(pub.id)){rejectedForeign++;continue}
          const a=Date.parse(o.validFrom??pub.validFrom),b=Date.parse(o.validUntil??pub.validUntil);
          if(!o?.name||!Number.isFinite(a)||!Number.isFinite(b)||a>now||b<now)continue;
          output.push({id:item.id,name:o.name,publicationId:pub.id,price:o.appPrice??o.membershipPrice??o.price??o.fromPrice,validFrom:o.validFrom??pub.validFrom,validUntil:o.validUntil??pub.validUntil});
        }
      }
      if(!hs.length)break;
    }
  }
  const unique=[...new Map(output.filter(x=>!x.error).map(x=>[x.id,x])).values()];
  const failures=output.filter(x=>x.error);
  console.log(JSON.stringify({status:failures.length?"PARTIAL":"OK",storeId:store.id,storeName:store.name,publications:pubs.map(p=>({id:p.id,validFrom:p.validFrom,validUntil:p.validUntil})),pages,hotspots,uniqueOffers:unique.length,rejectedForeign,fetchFailures:failures.length,offers:unique,failures},null,2));
  if(failures.length)process.exitCode=1;
}catch(e){console.error("AUDIT_FAILED",String(e));process.exitCode=1}
