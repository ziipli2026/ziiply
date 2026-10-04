import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const manifest=JSON.parse(fs.readFileSync('src/app/components/ziiply/offerSearch/providers/data/kCitymarketLeafletImages.json','utf8'));
const images=Object.values(manifest.publications).flatMap(p=>Object.values(p.images));
assert.ok(images.length>0);
const html='<!doctype html><style>body{margin:0;display:grid;grid-template-columns:repeat(6,150px)}img{width:150px;height:150px;object-fit:contain}</style>'+images.map(url=>'<img src="'+url+'">').join('');
const server=http.createServer((req,res)=>{
 if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
 const filename=path.resolve('public','.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
 if(!filename.startsWith(path.resolve('public')+path.sep)||!fs.existsSync(filename)){res.statusCode=404;res.end();return;}
 res.setHeader('Content-Type','image/svg+xml');res.end(fs.readFileSync(filename));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:900,height:Math.ceil(images.length/6)*150}});
 await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'networkidle'});
 await page.waitForFunction(()=>[...document.images].every(img=>img.complete&&img.naturalWidth>0));
 const signatures=await page.evaluate(()=>[...document.images].map(img=>{
  const c=document.createElement('canvas');c.width=64;c.height=64;const ctx=c.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,64,64);ctx.drawImage(img,0,0,64,64);
  const data=ctx.getImageData(0,0,64,64).data;let hash=2166136261,ink=0;
  for(let i=0;i<data.length;i+=4){hash=Math.imul(hash^data[i]^data[i+1]<<8^data[i+2]<<16,16777619)>>>0;if(data[i]+data[i+1]+data[i+2]<690)ink++;}
  return {hash,ink};
 }));
 assert.ok(signatures.every(s=>s.ink>10),'Every fragment must render a real image');
 // Same image may intentionally serve a campaign and its priced example.
 if(images.length>=40)assert.ok(new Set(signatures.map(s=>s.hash)).size>=35,'Fragment URLs must render their own images, not the first sprite cell');
 fs.mkdirSync('artifacts/citymarket-images',{recursive:true});await page.screenshot({path:'artifacts/citymarket-images/browser-images.png',fullPage:true});
 console.log('Browser rendered',images.length,'publisher images;',new Set(signatures.map(s=>s.hash)).size,'distinct pixel signatures');
}finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
