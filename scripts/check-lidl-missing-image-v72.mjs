#!/usr/bin/env node
/** Research-only targeted verification; never substitutes a generic or guessed image. */
const id="10021478";
const url="https://www.lidl.fi/p/korvapuusticroissant/p10021478";
const response=await fetch(url,{headers:{accept:"text/html","user-agent":"ZiiplyLidlResearch/1.0"},redirect:"follow",signal:AbortSignal.timeout(15000)});
const html=await response.text();
const tag=(key)=>(html.match(/<meta\b[^>]*>/gi)||[]).find(t=>new RegExp('(?:property|name)\\s*=\\s*["\\x27]'+key+'["\\x27]','i').test(t))?.match(/content\s*=\s*(["'])(.*?)\1/i)?.[2]??null;
const title=tag("og:title"),rawImage=tag("og:image");
const canonical=(html.match(/<link\b[^>]*>/gi)||[]).find(t=>/rel\s*=\s*["']canonical["']/i.test(t))?.match(/href\s*=\s*(["'])(.*?)\1/i)?.[2]??null;
const canonicalPath=canonical?new URL(canonical,response.url).pathname:"";
const image=rawImage?new URL(rawImage,response.url):null;
const allowed=image?.protocol==="https:"&&["imgproxy-retcat.assets.schwarz","lidl.fi"].includes(image.hostname);
const identity=response.ok&&canonicalPath.endsWith("/p"+id)&&/korvapuusti.*croissant/i.test(String(title??"").normalize("NFD").replace(/[\u0300-\u036f]/g,""));
const candidate=identity&&allowed&&!/(?:placeholder|default|logo|social-share)/i.test(image.pathname)?image.href:null;
console.log(JSON.stringify({id,httpStatus:response.status,canonical,title,imageCandidate:candidate,identityConfirmed:identity,verifiedImage:false,priceEur:null},null,2));
// A 404 is a valid source-availability finding, not a broken research workflow.\n// Never automatically publish an image from a cached search result.\nif(response.status!==404&&!candidate)process.exitCode=1;
