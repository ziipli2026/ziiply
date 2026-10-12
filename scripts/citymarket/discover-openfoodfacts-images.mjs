import fs from "node:fs";
const queue=JSON.parse(fs.readFileSync("citymarket-image-review-queue.json","utf8"));
const known=queue.rows.filter(row=>/^\d{8,14}$/.test(row.candidateEan??""));
const results=[];
for(const row of known){
  const url="https://world.openfoodfacts.org/api/v2/product/"+encodeURIComponent(row.candidateEan)+".json?fields=code,product_name,brands,image_front_url,image_url";
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(url,{signal:controller.signal,headers:{"user-agent":"Ziiply-ImageResearch/0.1 (non-production research)"}});
    if(!response.ok){results.push({offerId:row.offerId,ean:row.candidateEan,status:"http-error",httpStatus:response.status,approved:false});continue;}
    const json=await response.json();
    const product=json.product??{};
    const images=[product.image_front_url,product.image_url].filter(value=>typeof value==="string"&&value.startsWith("https://"));
    results.push({offerId:row.offerId,ean:row.candidateEan,status:json.status===1&&images.length?"candidate-found":"no-image",productName:product.product_name??null,brand:product.brands??null,imageCandidates:[...new Set(images)],sourceUrl:url,reviewRequired:true,approved:false});
  }catch(error){results.push({offerId:row.offerId,ean:row.candidateEan,status:"fetch-failed",error:String(error),approved:false});}
  finally{clearTimeout(timer);}
}
const report={publication:"41LV",totalMissing:queue.missingImages,knownEanCount:known.length,unidentifiedEanCount:queue.missingImages-known.length,notice:"Open Food Facts candidates are unverified. Do not approve without visual match, rights and source verification.",results};
fs.writeFileSync("citymarket-openfoodfacts-discovery.json",JSON.stringify(report,null,2)+"\n");
console.log("Open Food Facts lookup:",known.length,"EANs,",results.filter(x=>x.status==="candidate-found").length,"unverified image candidates.");
