import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {createHash} from 'node:crypto';
const [entry,folder,parserPath='src/app/components/ziiply/offerSearch/providers/kCitymarketSpatialParser.js']=process.argv.slice(2);
if(!entry||!folder)throw Error('Usage: export-leaflet.mjs entry output-folder [parser-path]');
const requested=new URL(entry);
if(requested.protocol!=='https:'||!['kcm-lehdet.k-ruoka.fi','kcm-tarjouslehdet.k-ruoka.fi'].includes(requested.hostname))throw Error('Unexpected publication entry origin');
await fs.mkdir(folder,{recursive:true});
const {parseKCitymarketSpatialLeaflet}=await import(pathToFileURL(path.resolve(parserPath)));
// Freeze every publisher HTML/geometry response consumed by the parser.
// A PDF alone cannot reproduce the publisher's spatial text_position[] data.
const originalFetch=globalThis.fetch;
const responses={};
globalThis.fetch=async (input,options)=>{
 const response=await originalFetch(input,options);
 const url=String(input instanceof URL?input.href:input);
 if(response.ok && response.headers.get('content-type')?.includes('text') || response.ok && /(?:\.html|\.js)(?:\?|$)/i.test(url)){
   const body=await response.clone().text();
   responses[url]={url:response.url,status:response.status,body};
 }
 return response;
};
let parsed;
try{parsed=await parseKCitymarketSpatialLeaflet(entry)}
finally{globalThis.fetch=originalFetch}
await fs.writeFile(path.join(folder,'publisher-responses.json'),JSON.stringify({schemaVersion:1,entry,responses},null,2));

const leaflet=new URL(parsed.leaflet);
if(leaflet.protocol!=='https:'||leaflet.hostname!=='kcm-tarjouslehdet.k-ruoka.fi')throw Error('Unexpected publisher origin');
const configResponse=await fetch(new URL('javascript/config.js',leaflet),{signal:AbortSignal.timeout(30000)});
if(!configResponse.ok)throw Error('Publisher config unavailable');
const config=await configResponse.text();
const download=config.match(/"DownloadURL"\s*:\s*"([^"]+)"/)?.[1];
if(!download)throw Error('Publisher PDF URL unavailable');
const pdfUrl=new URL(download,leaflet);
if(pdfUrl.origin!==leaflet.origin||!pdfUrl.pathname.endsWith('.pdf'))throw Error('Unexpected PDF URL');
const pdfResponse=await fetch(pdfUrl,{signal:AbortSignal.timeout(60000)});
if(!pdfResponse.ok)throw Error('PDF HTTP '+pdfResponse.status);
const pdf=Buffer.from(await pdfResponse.arrayBuffer());
if(pdf.length>32*1024*1024||!pdf.subarray(0,5).equals(Buffer.from('%PDF-')))throw Error('Invalid or oversized PDF');
await fs.writeFile(path.join(folder,'leaflet.pdf'),pdf);
const pdfSha256=createHash('sha256').update(pdf).digest('hex');
const clean=s=>String(s??'').replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim();
const rows=parsed.rows.flatMap(row=>{
 const title=clean(row.title),resolved=row.spatialResolved,percent=Number(row.percentageOffer?.percent);
 if(!title||resolved?.displayOnlyUnitPrice)return [];
 const priced=resolved&&Number(resolved.value)>0;
 if(!priced&&!(percent>0&&percent<100))return [];
 return [{id:`kcm:spatial:${row.page}:${title.toLowerCase()}:${priced?Number(resolved.value):'percent:'+percent}`,
  page:row.page,title,anchor:row.imageAnchor??null,nearby:row.nearby??[]}];
});
await fs.writeFile(path.join(folder,'leaflet.json'),JSON.stringify({leaflet:leaflet.href,pdfUrl:pdfUrl.href,pdfSha256,pageCount:parsed.pageCount,rows},null,2));
// Retain the complete parser output (including geometry/price candidates) so
// future parser revisions can be diagnosed against the original PDF and evidence.
await fs.writeFile(path.join(folder,'parser-evidence.json'),JSON.stringify(parsed,null,2));
await fs.writeFile(path.join(folder,'archive-manifest.json'),JSON.stringify({schemaVersion:1,sourceUrl:entry,publisherUrl:leaflet.href,pdfUrl:pdfUrl.href,pdfSha256,pageCount:parsed.pageCount,offerCount:rows.length,archivedAt:new Date().toISOString(),files:['leaflet.pdf','leaflet.json','parser-evidence.json','publisher-responses.json']},null,2));
console.log('Exported',rows.length,'offers from',parsed.pageCount,'pages:',leaflet.href);
