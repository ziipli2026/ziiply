import { chromium } from 'playwright';
import fs from 'node:fs';
const terms=JSON.parse(fs.readFileSync('scripts/fixtures/generic-100-batch-2.json','utf8')).queries;
const base=process.env.DESKTOP_URL||'http://127.0.0.1:3000/desktop-preview';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const report={base,runAt:new Date().toISOString(),queries:[],offerRequests:[],errors:[],screenshots:[]};
const out='browser-test-results/gosta-villikortti';
fs.mkdirSync(out,{recursive:true});
page.on('response',r=>{if(r.url().includes('/api/offers/search'))report.offerRequests.push({status:r.status(),url:r.url().slice(0,350)});});
page.on('pageerror',e=>report.errors.push(String(e)));
try{
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:90000});
 await page.screenshot({path:out+'/initial.png'});
 const dialog=page.getByRole('dialog',{name:'Göstan tarjoushaku'});
 if(!await dialog.isVisible()){
  const candidates=page.getByRole('button',{name:/tarjoushaku|tarjoukset|gösta/i});
  const n=await candidates.count();
  for(let i=0;i<Math.min(n,15);i++){try{await candidates.nth(i).click({timeout:1500});if(await dialog.isVisible())break;}catch{}}
 }
 if(!await dialog.isVisible())throw Error('Göstan tarjoushaku -ikkuna ei avautunut UI:n kautta; screenshot initial.png');
 const input=dialog.getByRole('textbox',{name:'Etsi tarjouksia'});
 const submit=dialog.getByRole('button',{name:'Hae',exact:true});
 for(let i=0;i<terms.length;i++){
  const query=terms[i];await input.fill(query);await submit.click();
  await page.waitForTimeout(350);
  const text=await dialog.innerText();
  const loading=/Haetaan…/.test(text);
  const error=await dialog.locator('[role=status]').allInnerTexts();
  report.queries.push({query,loading,error,visibleText:text.slice(-550),passed:!loading&&!error.length});
  if(i%20===0)await page.screenshot({path:out+'/query-'+i+'.png'});
  console.log(i+1,query,loading?'LOADING':error.length?'ERROR '+error.join(';'):'UI RESPONDED');
 }
 report.summary={attempted:report.queries.length,failed:report.queries.filter(x=>!x.passed).length,offerRequests:report.offerRequests.length};
 if(report.summary.failed)process.exitCode=1;
}catch(e){report.errors.push(String(e));process.exitCode=1;await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({summary:report.summary,errors:report.errors}));await browser.close();}
if(report.errors.length)process.exitCode=1;
