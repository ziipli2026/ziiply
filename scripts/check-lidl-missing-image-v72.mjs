#!/usr/bin/env node
/** Research-only targeted verification; never substitutes a generic or guessed image. */
const products=[
  {id:"10038292",name:/kuljanka.*gulassi|gulassi.*keitto/i,slug:"kuljanka-gulassikeitto"},
  {id:"10038313",name:/solevita.*appelsiini|appelsiini.*taysmehu/i,slug:"solevita-appelsiinitaysmehu"},
];
const fold=v=>String(v??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
let failed=false;
for(const product of products){
  const candidates=[
    `https://www.lidl.fi/p/${product.slug}/p${product.id}`,
    `https://www.lidl.fi/p/p${product.id}`,
  ];
  let best=null;
  for(const url of candidates){
    try{
      const response=await fetch(url,{headers:{accept:"text/html","user-agent":"ZiiplyLidlResearch/1.0"},redirect:"follow",signal:AbortSignal.timeout(15000)});
      const html=await response.text();
      const tag=key=>(html.match(/<meta\b[^>]*>/gi)||[]).find(t=>new RegExp('(?:property|name)\\s*=\\s*["\\x27]'+key+'["\\x27]','i').test(t))?.match(/content\s*=\s*(["'])(.*?)\1/i)?.[2]??null;
      const title=tag("og:title"),rawImage=tag("og:image");
      const canonical=(html.match(/<link\b[^>]*>/gi)||[]).find(t=>/rel\s*=\s*["']canonical["']/i.test(t))?.match(/href\s*=\s*(["'])(.*?)\1/i)?.[2]??null;
      const canonicalPath=canonical?new URL(canonical,response.url).pathname:"";
      const image=rawImage?new URL(rawImage,response.url):null;
      const allowed=image?.protocol==="https:"&&["imgproxy-retcat.assets.schwarz","www.lidl.fi","lidl.fi"].includes(image.hostname);
      const identity=response.ok&&canonicalPath.endsWith("/p"+product.id)&&product.name.test(fold(title));
      const candidate=identity&&allowed&&!/(?:placeholder|default|logo|social-share)/i.test(image.pathname)?image.href:null;
      const row={id:product.id,url,httpStatus:response.status,canonical,title,imageCandidate:candidate,identityConfirmed:identity};
      if(!best||candidate||response.ok)best=row;
      if(candidate)break;
    }catch(error){best={id:product.id,url,error:String(error)};}
  }
  console.log(JSON.stringify(best,null,2));
  if(!best?.imageCandidate) failed=true;
}
if(failed) process.exitCode=1;
