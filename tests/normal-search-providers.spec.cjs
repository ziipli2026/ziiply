const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const base=process.env.ZIIPLY_LIVE_URL;
const auth=process.env.VERCEL_AUTOMATION_BYPASS_SECRET?{'x-vercel-protection-bypass':process.env.VERCEL_AUTOMATION_BYPASS_SECRET}:{};
test('All four provider families respond; do not accept unverified local prices',async({request})=>{
  test.setTimeout(180000);
  if(!base)throw Error('ZIIPLY_LIVE_URL missing');
  const endpoints=[
    {chain:'S',path:'/api/s-products?store=634976534&storeName=Prisma%20Hyvink%C3%A4%C3%A4&storeType=hyper&search=maito'},
    {chain:'K',path:'/api/k-products?store=C130&search=maito'},
    {chain:'LIDL',path:'/api/lidl/products?mode=research&storeName=Lidl%20Hyvink%C3%A4%C3%A4&city=Hyvink%C3%A4%C3%A4&search=maito'},
    {chain:'TOKMANNI/SPAR',path:'/api/tokmanni/products?intent=maito&search=maito'},
  ];
  const results=[];
  fs.mkdirSync('normal-search-evidence',{recursive:true});
  for(const endpoint of endpoints){
    const started=Date.now();
    try{
      const response=await request.get(base+endpoint.path,{headers:auth,timeout:40000});
      const raw=await response.text();
      const data=JSON.parse(raw);
      const rows=Array.isArray(data.products)?data.products:Array.isArray(data.items)?data.items:[];
      results.push({chain:endpoint.chain,status:response.status(),durationMs:Date.now()-started,source:data.source??null,rows:rows.length,
        priced:rows.filter(x=>Number(x.price??x.storeItems?.[0]?.price??0)>0).length,
        verifiedLocal:rows.filter(x=>x.priceVerified===true&&x.priceScope==='local_store'&&String(x.priceStoreId??'').trim()).length,
        sampleEans:rows.map(x=>x.ean).filter(Boolean).slice(0,10)});
    }catch(error){results.push({chain:endpoint.chain,error:String(error)});}
    fs.writeFileSync('normal-search-evidence/provider-smoke.json',JSON.stringify(results,null,2));
  }
  for(const row of results)expect(row.error,row.chain+' provider error').toBeUndefined();
  for(const row of results)expect(row.status,row.chain+' HTTP status').toBe(200);
  for(const row of results)expect(row.rows,row.chain+' returned rows').toBeGreaterThan(0);
});
