import fs from "node:fs";
const queue=JSON.parse(fs.readFileSync("citymarket-image-review-queue.json","utf8"));
const results=[];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const MAX_SEARCHES=Number(process.env.IMAGE_RESEARCH_MAX_SEARCHES??80);
if(!Number.isInteger(MAX_SEARCHES)||MAX_SEARCHES<0||MAX_SEARCHES>100)throw Error("IMAGE_RESEARCH_MAX_SEARCHES must be an integer from 0 to 100");
let searches=0;
const tokens=value=>new Set(String(value??"").toLocaleLowerCase("fi").normalize("NFKC").match(/[a-zåäö0-9]{3,}/g)??[]);
const overlap=(query,name,brand)=>{const requested=tokens(query);const found=tokens([name,brand].filter(Boolean).join(" "));return requested.size?[...requested].filter(token=>found.has(token)).length/requested.size:0;};
for(const row of queue.rows){
  if(row.candidateEan || row.reviewPriority==="manual-multi-product"){
    results.push({offerId:row.offerId,status:row.candidateEan?"known-ean-handled-separately":"ambiguous-multi-product",approved:false});
    continue;
  }
  const query=row.identity.replace(/\([^)]*\)/g," ").replace(/\b\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l|kpl|rl|pkt)\b/gi," ").replace(/\s+/g," ").trim().slice(0,100);
  if(query.length<5){results.push({offerId:row.offerId,status:"query-too-short",approved:false});continue;}
  if(searches>=MAX_SEARCHES){results.push({offerId:row.offerId,status:"search-budget-exhausted",approved:false});continue;}
  searches++;
  const url="https://world.openfoodfacts.org/cgi/search.pl?search_terms="+encodeURIComponent(query)+"&search_simple=1&action=process&json=1&page_size=5&fields=code,product_name,brands,quantity,image_front_url,image_url";
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const response=await fetch(url,{signal:controller.signal,headers:{"user-agent":"Ziiply-ImageResearch/0.1 (non-production research)","accept":"application/json"}});
    if(!response.ok){results.push({offerId:row.offerId,query,status:"http-error",httpStatus:response.status,approved:false});continue;}
    const json=await response.json();
    if(!Array.isArray(json.products)){
      results.push({offerId:row.offerId,query,status:"invalid-search-response",approved:false});
      continue;
    }
    const candidates=json.products.map(product=>({
      ean:product.code??null,productName:product.product_name??null,brand:product.brands??null,quantity:product.quantity??null,
      queryTokenOverlap:overlap(query,product.product_name,product.brands),
      imageCandidates:[...new Set([product.image_front_url,product.image_url].filter(value=>typeof value==="string"&&value.startsWith("https://")))]
    })).filter(product=>product.imageCandidates.length&&product.queryTokenOverlap>0).sort((a,b)=>b.queryTokenOverlap-a.queryTokenOverlap);
    results.push({offerId:row.offerId,query,status:candidates.length?"unverified-search-candidates":"no-image",candidates,reviewRequired:true,approved:false});
  }catch(error){results.push({offerId:row.offerId,query,status:"fetch-failed",error:String(error),approved:false});}
  finally{clearTimeout(timer);}
  await sleep(1200);
}
const report={publication:"41LV",totalMissing:queue.missingImages,searchesPerformed:searches,searchBudget:MAX_SEARCHES,notice:"Only candidates with shared product-name or brand tokens are shown, ordered by overlap. Search matches are NOT product identity matches. Verify EAN, brand, size, leaflet packshot and rights before approval.",results};
fs.writeFileSync("citymarket-openfoodfacts-search.json",JSON.stringify(report,null,2)+"\n");
console.log("Bulk product-name search:",results.length,"rows,",results.filter(x=>x.status==="unverified-search-candidates").length,"rows with unverified image candidates.");
