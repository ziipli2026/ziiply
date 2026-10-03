// Read-only campaign membership audit, no price imports or production writes.
const storeId="666706775";
const eans=["2396257900001","6405857316207","6438460181269"];
const date=new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Helsinki",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const hash="f6d87786fda8fb5c233c4eaed08f37b0c5b87dc0d8d4c44c33c5529e446369d1";
const version="production-14a82a5b48cd1dd42c0592db0037514ed3c84de8";
for(const path of ["tuotteet/kampanjat","sivu/halvempi-hinta"]){
const variables={preview:false,storeId,skipProducts:false,availabilityDate:date,where:{storeId,path,platform:"WEB",availabilityDate:date,userConsent:{marketing:false,marketingId:"ziiply-gosta",useCustomerId:false,sessionId:"ziiply-gosta",loop54:true}}};
const url=new URL("https://api.s-kaupat.fi/");url.searchParams.set("operationName","RemoteGetPageContent");url.searchParams.set("variables",JSON.stringify(variables));url.searchParams.set("extensions",JSON.stringify({clientLibrary:{name:"@apollo/client",version:"4.2.12"},persistedQuery:{version:1,sha256Hash:hash}}));
try {
const response=await fetch(url,{headers:{accept:"application/json","accept-language":"fi",origin:"https://www.s-kaupat.fi",referer:"https://www.s-kaupat.fi/","x-client-name":"skaupat-web","x-client-version":version}});
const body=await response.json();const page=body?.data?.remoteGetPageContent??body?.data?.pageContent??body?.data;
const sections=page?.pageContent?.sections??page?.sections??[];
const serialized=JSON.stringify(body);
console.log(JSON.stringify({path,http:response.status,errors:body.errors?.map(e=>e.message),dataKeys:Object.keys(body.data??{}),sectionCount:sections.length,sections:sections.map(s=>({title:s.title,products:s.products?.length??0})),eanPresent:Object.fromEntries(eans.map(e=>[e,serialized.includes(e)])),sample:serialized.slice(0,350)}));
}catch(e){console.error(path,String(e));process.exitCode=1;}
}
