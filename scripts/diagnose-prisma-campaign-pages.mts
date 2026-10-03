// Read-only Prisma campaign page diagnostics; no production imports.
const storeId="666706775";
const date=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const targets=["2396257900001","6405857316207","6438460181269"];
const hash="f6d87786fda8fb5c233c4eaed08f37b0c5b87dc0d8d4c44c33c5529e446369d1";
for(const path of ["tuotteet/kampanjat","sivu/halvempi-hinta","halvempi-hinta"]){
 const variables={preview:false,storeId,skipProducts:false,availabilityDate:date,where:{storeId,path,platform:"WEB",availabilityDate:date,userConsent:{marketing:false,marketingId:"ziiply-gosta",useCustomerId:false,sessionId:"ziiply-gosta",loop54:true}}};
 const u=new URL("https://api.s-kaupat.fi/");u.searchParams.set("operationName","RemoteGetPageContent");u.searchParams.set("variables",JSON.stringify(variables));u.searchParams.set("extensions",JSON.stringify({clientLibrary:{name:"@apollo/client",version:"4.2.12"},persistedQuery:{version:1,sha256Hash:hash}}));
 try {
 const response=await fetch(u,{headers:{accept:"application/json","accept-language":"fi",origin:"https://www.s-kaupat.fi",referer:"https://www.s-kaupat.fi/","x-client-name":"skaupat-web","x-client-version":"production-14a82a5b48cd1dd42c0592db0037514ed3c84de8"}});
 const data=await response.json();const page=data?.data?.remoteGetPageContent??data?.data?.RemoteGetPageContent??data?.data;
 const sections: Array<{title?:string;products?:Array<{ean?:string;name?:string;pricing?:unknown}>}>=page?.sections??page?.pageContent?.sections??[];
 const products=sections.flatMap(s=>s.products??[]);const matches=products.filter(p=>targets.some(e=>JSON.stringify(p).includes(e)));
 console.log(JSON.stringify({path,status:response.status,errors:data.errors,rootKeys:Object.keys(data.data??{}),pageKeys:Object.keys(page??{}),sectionCount:sections.length,sectionTitles:sections.map(s=>s.title),productCount:products.length,matches:matches.map(p=>({ean:p.ean,name:p.name,pricing:p.pricing})),targetPresentInWholeResponse:targets.map(e=>({ean:e,present:JSON.stringify(data).includes(e)}))}));
 }catch(e){console.error(path,String(e));process.exitCode=1;}
}
