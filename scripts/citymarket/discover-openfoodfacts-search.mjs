import fs from "node:fs";
const queue=JSON.parse(fs.readFileSync("citymarket-image-review-queue.json","utf8"));
const results=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
for(const row of queue.rows){
  if(row.candidateEan || row.reviewPriority==="manual-multi-product"){
    results.push({offerId:row.offerId,status:row.candidateEan?"known-ean-handled-separately":"ambiguous-multi-product",approved:false});
    continue;
  }
  const query=row.identity.replace(/\\([^)]*\\)/g," ").replace(/\\b\\d+(?:[.,]\\d+)?\\s*(?:g|kg|ml|l|kpl|rl|pkt)\\b/gi," ").replace(/\\s+/g," ").trim().slice(0,100);
  if(query.length<5){results.push({offerId:row.offerId,status:"query-too-short",approved:false});continue;}
  const url="https://world.openfoodfacts.org/cgi/search.pl?search_terms="+encodeURIComponent(query)+"&search_simple=1&action=process&json=1&page_size=5&fields=code,product_name,brands,quantity,image_front_url,image_url";
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(url,{signal:controller.signal,headers:{"user-agent":"Ziiply-ImageResearch/0.1 (non-production research)","accept":"application/json"}});
    if(!response.ok){results.push({offerId:row.offerId,query,status:"http-error",httpStatus:response.status,approved:false});continue;}
    const json=await response.json();
    const candidates=(json.products??[]).map(product=>({
      ean:product.code??null,productName:product.product_name??null,brand:product.brands??null,quantity:product.quantity??null,
      imageCandidates:[...new Set([product.image_front_url,product.image_url].filter(value=>typeof value==="string"&&value.startsWith("https://")))]
    })).filter(product=>product.imageCandidates.length);
    results.push({offerId:row.offerId,query,status:candidates.length?"unverified-search-candidates":"no-image",candidates,reviewRequired:true,approved:false});
  }catch(error){results.push({offerId:row.offerId,query,status:"fetch-failed",error:String(error),approved:false});}
  finally{clearTimeout(timer);}
  await sleep(1200);
}
const report={publication:"41LV",totalMissing:queue.missingImages,notice:"Search matches are NOT product identity matches. Verify EAN, brand, size, leaflet packshot and rights before approval.",results};
fs.writeFileSync("citymarket-openfoodfacts-search.json",JSON.stringify(report,null,2)+"\\n");
console.log("Bulk product-name search:",results.length,"rows,",results.filter(x=>x.status==="unverified-search-candidates").length,"rows with unverified image candidates.");
