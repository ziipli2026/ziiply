const { chromium } = require("playwright");
(async () => {
 const browser = await chromium.launch({headless:true});
 const page = await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 await page.goto(process.env.TEST_BASE_URL||"http://127.0.0.1:3000",{waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForTimeout(4000);
 await page.evaluate(() => {
  localStorage.setItem("ziiply-gosta-offer-watches-v1", JSON.stringify(["kirjolohi"]));
  localStorage.setItem("ziiply-gosta-watch-results-v1", JSON.stringify({key:"kirjolohi",offers:[{query:"kirjolohi",title:"Kirjolohi tuore",price:"9,99",store:"Lidl Hyvinkää",source:"lidl-fi-public",chain:"Lidl",priceBasis:"per-kg",comparisonPrice:"9,99 €/kg",imageUrl:"/storelogos/lidl.png",validUntil:"2099-12-31"}],at:Date.now(),debug:"Browser fixture"}));
 });
 await page.reload({waitUntil:"domcontentloaded"});
 const watchButton=page.getByRole("button",{name:"Gösta: Tarjousvahti",exact:true});
 await watchButton.waitFor({state:"visible",timeout:15000});
 await watchButton.click({timeout:15000});
 await page.screenshot({path:"gosta-mobile-after-open.png",fullPage:true});
 console.log("GOSTA_OPEN_DEBUG",JSON.stringify(await page.evaluate(()=>({headings:[...document.querySelectorAll("h1,h2,h3")].map(x=>x.textContent),visibleText:document.body.innerText.slice(-4500)}))));
 await page.getByRole("heading",{name:"Göstan tarjoushaku"}).waitFor({timeout:15000});
 await page.getByText("Kirjolohi tuore",{exact:true}).first().waitFor({timeout:15000});
 const image=page.locator("article").filter({hasText:"Kirjolohi tuore"}).locator("img").first();
 if(await image.count()!==1)throw new Error("Watch offer image missing");
 await image.scrollIntoViewIfNeeded();
 await image.waitFor({state:"visible"});
 if(!await image.evaluate(i=>i.complete&&i.naturalWidth>0))throw new Error("Watch offer image did not load");
 await page.locator("article").filter({hasText:"Kirjolohi tuore"}).getByRole("button",{name:"Lisää ostoskoriin"}).click({timeout:15000});
 await page.getByText("Tarjous lisätty ostoskoriin.").first().waitFor({timeout:10000});
 console.log("GOSTA_CART_BROWSER_TEST_PASS: weighted offer added and offer image loaded");

 await page.screenshot({path:"gosta-mobile-smoke.png",fullPage:true});
 const data=await page.evaluate(()=>({title:document.title,images:[...document.images].map(i=>({src:i.currentSrc||i.src,loaded:i.complete&&i.naturalWidth>0,visible:!!(i.offsetWidth||i.offsetHeight||i.getClientRects().length)})),buttons:[...document.querySelectorAll("button")].map(b=>(b.textContent||b.getAttribute("aria-label")||"").trim()).filter(Boolean).slice(0,100)}));
 console.log(JSON.stringify({data,errors},null,2));
 const broken=data.images.filter(i=>i.visible&&!i.loaded&&!i.src.startsWith("data:"));
 if(errors.length||broken.length) throw new Error("UI errors or broken visible images: "+JSON.stringify({errors,broken}));
 if(!data.buttons.some(x=>/gösta|gosta|tarjous/i.test(x))) throw new Error("Gösta/watch UI control missing");
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
