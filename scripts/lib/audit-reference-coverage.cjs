const {auditNamedProduct}=require('./named-audit-oracle.cjs');
const items=data=>Array.isArray(data)?data:data.products||data.items||[];
async function auditReferenceCoverage(reference,visible,request){
 const ean=reference.expectedNeonEan;
 if(!ean)return null;
 if(visible.some(p=>String(p.ean)===ean))return {state:'visible',ean};
 const exact=await request('/api/neon-first-search?q='+ean);
 const canonical=items(exact.data||exact).find(p=>String(p.ean)===ean);
 if(!canonical)return {state:'catalog_record_missing',ean};
 const identityIssue=auditNamedProduct(reference.query,canonical);
 if(identityIssue)return {state:'catalog_identity_unverified',ean,canonical,identityIssue};
 const probes=[];
 for(const store of [{chain:'s',id:'292',name:'Prisma Hyvinkää'},{chain:'k',id:'3221',name:'K-Citymarket Hyvinkää'}]){
  for(const search of [...new Set([canonical.name,canonical.brand,ean].filter(Boolean))]){
   const params=new URLSearchParams({search,store:store.id,...(store.chain==='s'?{storeName:store.name,storeType:'hyper'}:{})});
   const response=await request('/api/'+store.chain+'-products?'+params),data=response.data||response;
   const quotes=items(data).filter(p=>String(p.ean)===ean).map(p=>({ean,name:p.name,store:store.name,price:Number(p.storeItems?.[0]?.price??p.price??0)/(store.chain==='s'&&data.source==='s-kaupat-normal-v220'?1:100),identityIssue:auditNamedProduct(reference.query,p)}));
   probes.push({store:store.name,search,quotes});
   if(quotes.some(p=>p.price>0))break;
  }
 }
 const quotes=probes.flatMap(p=>p.quotes).filter(p=>p.price>0);
 return {state:quotes.some(p=>!p.identityIssue)?'known_quote_dropped':quotes.length?'current_shop_identity_conflict':'no_current_quote_obtained',ean,canonical,probes};
}
module.exports={auditReferenceCoverage};
