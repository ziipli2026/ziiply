const { chromium } = require("playwright");
(async () => {
 const browser = await chromium.launch({headless:true});
 const page = await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
 const errors=[];
 page.on("pageerror",e=>errors.push(e.message));
 await page.goto(process.env.TEST_BASE_URL||"http://127.0.0.1:3000",{waitUntil:"domcontentloaded",timeout:60000});
 await page.waitForTimeout(4000);
 await page.screenshot({path:"gosta-mobile-smoke.png",fullPage:true});
 const data=await page.evaluate(()=>({title:document.title,images:[...document.images].map(i=>({src:i.currentSrc||i.src,loaded:i.complete&&i.naturalWidth>0,visible:!!(i.offsetWidth||i.offsetHeight||i.getClientRects().length)})),buttons:[...document.querySelectorAll("button")].map(b=>(b.textContent||b.getAttribute("aria-label")||"").trim()).filter(Boolean).slice(0,100)}));
 console.log(JSON.stringify({data,errors},null,2));
 const broken=data.images.filter(i=>i.visible&&!i.loaded&&!i.src.startsWith("data:"));
 if(errors.length||broken.length) throw new Error("UI errors or broken visible images: "+JSON.stringify({errors,broken}));
 if(!data.buttons.some(x=>/gösta|gosta|tarjous/i.test(x))) throw new Error("Gösta/watch UI control missing");
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
