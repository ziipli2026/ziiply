"use client";

import { useEffect, useRef, useState } from "react";
import { resolveKWeightLabel, resolvePriceWeightLabel } from "../components/ziiply/kWeightLabelResolver";
import DesktopJustiinaSearchCard from "../components/ziiply/desktop/justiina/DesktopJustiinaSearchCard";
import ZiiplyDesktopScannerCard from "../components/ziiply/desktop/justiina/ZiiplyDesktopScannerCard";
import DesktopAssistantCards from "../components/ziiply/desktop/DesktopAssistantCards";
import ZiiplyDesktopNotebookCard from "../components/ziiply/cards/ZiiplyDesktopNotebookCard";
import ZiiplyMobileCompareCard from "../components/ziiply/cards/ZiiplyMobileCompareCardresponsive";
import { GOSTA_OFFER_CATEGORY_SUGGESTIONS_V147, mapZiiplyGostaOfferToCardOfferV147, searchZiiplyGostaOffersV146 } from "../components/ziiply/offerSearch/ziiplyOfferSearchCore";

type Assistant = "gosta" | "justiina" | "arvo";


export default function DesktopPreviewPage() {
  const [active, setActive] = useState<Assistant | null>(null);
  const [scannerMode, setScannerMode] = useState<"checking" | "camera" | "external">("checking");
  const [workspace, setWorkspace] = useState<Assistant | null>(null);
  const [gostaChainPicker, setGostaChainPicker] = useState(false);
  const [chooseStoresNoticeFor, setChooseStoresNoticeFor] = useState<Assistant|null>(null);
  const [gostaChain, setGostaChain] = useState<"S"|"K"|"LIDL"|"TOKMANNI"|"EUROSPAR"|null>(null);
  const [gostaOffers, setGostaOffers] = useState<any[]>([]);
  const [gostaTab, setGostaTab] = useState<"offers"|"campaigns">("offers");
  const [gostaCategory, setGostaCategory] = useState("");
  const [gostaLoading, setGostaLoading] = useState(false);
  const [location, setLocation] = useState("");
  const [gpsOn, setGpsOn] = useState(false);
  const [gpsCoords, setGpsCoords] = useState<{latitude:number;longitude:number}|null>(null);
  const [appliedLocation, setAppliedLocation] = useState("");
  const [locationResolved, setLocationResolved] = useState(false);
  const [userLocationAction, setUserLocationAction] = useState(false);
  const [locationStatus, setLocationStatus] = useState("Kirjoita paikkakunta tai käytä GPS:ää");
  const [gpsToast, setGpsToast] = useState("GPS ei päällä");
  const [mapOpen, setMapOpen] = useState(false);
  const [weather, setWeather] = useState({ value: "—", detail: "haetaan" });
  const [electricity, setElectricity] = useState({ value: "—", detail: "haetaan" });
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStores, setSelectedStores] = useState<Record<string, any>>({});
  const [lidlStores, setLidlStores] = useState<any[]>([]);
  const [sparStores, setSparStores] = useState<any[]>([]);
  const [storeMode, setStoreMode] = useState<"hyper" | "local">("hyper");
  const [storeModeChosen, setStoreModeChosen] = useState(false);
  const [storeCompareScope, setStoreCompareScope] = useState<"none" | "between_chains" | "within_chain">("none");
  const [betweenMode, setBetweenMode] = useState<"one" | "many">("one");
  const [withinChain, setWithinChain] = useState<"S" | "K" | null>(null);
  const [pickerChain, setPickerChain] = useState<"S"|"K"|"LIDL"|"SPAR"|null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartPaperReady,setCartPaperReady]=useState(false);
  useEffect(()=>{let active=true;const img=new Image();img.decoding="async";img.onload=()=>{const done=()=>{if(active)setCartPaperReady(true)};if(typeof img.decode==="function")void img.decode().catch(()=>undefined).finally(done);else done()};img.onerror=()=>{if(active)setCartPaperReady(true)};img.src="/ui/cart/vihkonen.webp";return()=>{active=false}},[]);

  const [desktopScannerOpen,setDesktopScannerOpen]=useState(false);
  const [desktopScannerCameraOn,setDesktopScannerCameraOn]=useState(false);
  const [desktopScannerEan,setDesktopScannerEan]=useState("");
  const [desktopScannerMessage,setDesktopScannerMessage]=useState("");
  const [desktopScannerIncrement,setDesktopScannerIncrement]=useState(false);
  const desktopScannerIncrementTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const [desktopScannerLoading,setDesktopScannerLoading]=useState(false);
  const [desktopScannerFlash,setDesktopScannerFlash]=useState<"idle"|"success"|"error">("idle");
  const desktopScannerFlashTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  function flashDesktopScanner(state:"success"|"error"){if(desktopScannerFlashTimer.current)clearTimeout(desktopScannerFlashTimer.current);setDesktopScannerFlash(state);desktopScannerFlashTimer.current=setTimeout(()=>{setDesktopScannerFlash("idle");setDesktopScannerMessage("")},1100)}
  const desktopHidBufferRef=useRef("");
  const desktopHidLastKeyRef=useRef(0);
  useEffect(()=>{
    if(!desktopScannerOpen)return;
    const handleKey=(event:KeyboardEvent)=>{
      if(event.ctrlKey||event.metaKey||event.altKey||event.repeat)return;
      if(event.key==="Escape"){setDesktopScannerCameraOn(false);setDesktopScannerOpen(false);return}
      if(event.key==="Enter"){
        const code=desktopHidBufferRef.current;
        desktopHidBufferRef.current="";
        if(/^\d{8,14}$/.test(code)){setDesktopScannerEan(code);setDesktopScannerMessage("");void runDesktopScannerEanSearch(code,true);event.preventDefault()}
        return;
      }
      if(!/^\d$/.test(event.key))return;
      const now=Date.now();
      desktopHidBufferRef.current=(now-desktopHidLastKeyRef.current>500?"":desktopHidBufferRef.current)+event.key;
      desktopHidLastKeyRef.current=now;
      if(desktopHidBufferRef.current.length>14)desktopHidBufferRef.current=event.key;
    };
    window.addEventListener("keydown",handleKey);
    return()=>{window.removeEventListener("keydown",handleKey);desktopHidBufferRef.current=""};
  },[desktopScannerOpen]);
  const pasteDesktopScannerEan=async()=>{
    try{
      const pasted=(await navigator.clipboard.readText()).trim();
      if(!/^\d{8,14}$/.test(pasted)){setDesktopScannerMessage("Leikepöydällä ei ole kelvollista EAN-koodia (8–14 numeroa).");return}
      setDesktopScannerEan(pasted);
      setDesktopScannerMessage("");
      setDesktopScannerMessage("EAN "+pasted+" luettu. Haetaan tuotetta…");
      void runDesktopScannerEanSearch(pasted);
    }catch{setDesktopScannerMessage("Leikepöydän lukeminen estetty. Salli leikepöydän käyttö selaimessa.")}
  };

  useEffect(()=>{if(!desktopScannerOpen||!desktopScannerCameraOn)return;let stream:MediaStream|null=null;let video:HTMLVideoElement|null=null;let stopped=false;let scanTimer:ReturnType<typeof setInterval>|null=null;const region=document.getElementById("ziiply-desktop-scanner-region");if(!region)return;video=document.createElement("video");video.autoplay=true;video.muted=true;video.playsInline=true;video.style.cssText="width:100%;height:100%;object-fit:cover;";region.appendChild(video);const el=video;void navigator.mediaDevices?.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false}).then(async media=>{if(stopped){media.getTracks().forEach(t=>t.stop());return}stream=media;el.srcObject=media;await el.play().catch(()=>{});const Detector=(window as any).BarcodeDetector;if(Detector){const detector=new Detector({formats:["ean_13","ean_8","upc_a","upc_e"]});let busy=false;scanTimer=setInterval(async()=>{if(busy||stopped||el.readyState<2)return;busy=true;try{const codes=await detector.detect(el);const code=String(codes?.[0]?.rawValue||"");if(code){setDesktopScannerEan(code);setDesktopScannerMessage("EAN tunnistettu: "+code);void runDesktopScannerEanSearch(code,true);if(scanTimer)clearInterval(scanTimer)}}catch{}finally{busy=false}},350)}else setDesktopScannerMessage("Kameran automaattinen EAN-tunnistus ei ole käytettävissä tässä selaimessa. Syötä EAN käsin.")}).catch(()=>setDesktopScannerMessage("Kameraa ei saatu käyttöön. Voit syöttää EAN-koodin käsin."));return()=>{stopped=true;if(scanTimer)clearInterval(scanTimer);stream?.getTracks().forEach(t=>t.stop());el.srcObject=null;el.remove()}},[desktopScannerOpen,desktopScannerCameraOn]);
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [desktopCheckedCartItems,setDesktopCheckedCartItems]=useState<Record<string,boolean>>({});
  const [reloadCartDecisionOpen,setReloadCartDecisionOpen]=useState(false);
  const desktopCartHydratedRef=useRef(false);
  useEffect(()=>{try{const raw=window.sessionStorage.getItem("ziiply-desktop-current-cart-v1");const items=raw?JSON.parse(raw):[];if(Array.isArray(items)&&items.length){setCartItems(items.map((item:any)=>{if(item?.ziiplyWeightLabel||item?.product?.ziiplyWeightLabel||String(item?.id||"").startsWith("weight-"))return {...item,price:null,product:{...(item.product||{}),price:null,ziiplyWeightLabel:true}};const value=Number(item?.price);return item?.storeName&&/^prisma|s[ -]?market/i.test(String(item.storeName))&&value>0&&value<0.1?{...item,price:null,priceNeedsRefresh:true}:item}));const nav=performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming|undefined;if(nav?.type==="reload")setReloadCartDecisionOpen(true)}}catch{}finally{desktopCartHydratedRef.current=true}},[]);
  useEffect(()=>{if(!desktopCartHydratedRef.current)return;try{window.sessionStorage.setItem("ziiply-desktop-current-cart-v1",JSON.stringify(cartItems))}catch{}},[cartItems]);
  const [desktopCheckoutOpen,setDesktopCheckoutOpen]=useState(false);
  const [desktopCompareNotice,setDesktopCompareNotice]=useState(false);
  const [desktopCompareLoading,setDesktopCompareLoading]=useState(false);
  const [desktopCompareResults,setDesktopCompareResults]=useState<Record<string,{store:any;rows:Array<{cartItemId:string;name:string;quantity:number;price:number|null;match:"ean"|"name"|"none"}>;total:number;missing:number}>>({});
  const [desktopCompareError,setDesktopCompareError]=useState("");
  const desktopCompareCache=useRef<Map<string,Record<string,{store:any;rows:Array<{cartItemId:string;name:string;quantity:number;price:number|null;match:"ean"|"name"|"none"}>;total:number;missing:number}>>>(new Map());
  const desktopCompareIdentity=JSON.stringify([betweenMode,storeCompareScope,Object.values(selectedStores).map((store:any)=>[store.id,store.externalId,store.name]),cartItems.map((item:any)=>[item.id,item.ean,item.name,item.quantity,item.source])]);
  const desktopCompareRunId=useRef(0);
  const desktopCompareRequestIdentity=useRef(desktopCompareIdentity);
  desktopCompareRequestIdentity.current=desktopCompareIdentity;
  useEffect(()=>{desktopCompareRunId.current+=1;desktopCompareCache.current.clear();setDesktopCompareResults({});setDesktopCompareNotice(false);setDesktopCompareLoading(false);setDesktopCompareError("");},[desktopCompareIdentity]);
  async function openDesktopComparison(){
    const requestIdentity=desktopCompareIdentity;
    const runId=++desktopCompareRunId.current;
    setDesktopCompareError("");
    const selected=(Object.values(selectedStores) as any[]).filter(x=>["sHyper","sLocal","kHyper","kLocal"].includes(storeKind(x)));
    if(betweenMode==="one"){
      setDesktopCompareNotice(false);
      if(selected.length!==1){flashCartNotice("Valitse yksi S- tai K-kauppa hintojen hakua varten.");return}
      const store=selected[0];const isS=["sHyper","sLocal"].includes(storeKind(store));
      setDesktopCompareLoading(true);
      try{
        const updates=await Promise.all(cartItems.map(async item=>{
          if(String(item.source||"").toLowerCase()==="offer"||item?.product?.ziiplyWeightLabel||Boolean(resolvePriceWeightLabel(String(item.ean||item.product?.ean||""))))return null;
          const name=String(item.name||item.title||"").trim();if(!name)return null;
          const ean=String(item.ean||item.product?.ean||"").trim();
          const params=new URLSearchParams({search:name,store:String(store.externalId||store.id)});
          if(isS)params.set("storeName",String(store.name||""));
          try{const response=await fetch((isS?"/api/s-products?":"/api/k-products?")+params.toString(),{cache:"no-store"});if(!response.ok)return null;
            const data=await response.json();const products=Array.isArray(data?.products)?data.products:Array.isArray(data?.items)?data.items:Array.isArray(data)?data:[];
            const exact=ean?products.find((p:any)=>[p.ean,p.gtin,p.eanCode,p.barcode].some(v=>String(v||"")===ean)):null;
            const byName=products.find((p:any)=>String(p.name||"").trim().toLocaleLowerCase("fi")===name.toLocaleLowerCase("fi"));
            const matched=exact||byName;const raw=Number((Array.isArray(matched?.storeItems)&&matched.storeItems.length?matched.storeItems.find((entry:any)=>String(entry.storeId??entry.store?.id??entry.store??"")===String(store.externalId||store.id))?.price:matched?.price)??0);
            return matched&&Number.isFinite(raw)&&raw>0?(isS&&data?.source==="s-kaupat-normal-v220"?raw:raw/100):null;
          }catch{return null}
        }));
        if(desktopCompareRequestIdentity.current!==requestIdentity||desktopCompareRunId.current!==runId)return;
        const eligibleCount=cartItems.filter(item=>String(item.source||"").toLowerCase()!=="offer"&&!item?.product?.ziiplyWeightLabel&&!resolvePriceWeightLabel(String(item.ean||item.product?.ean||""))).length;
        const pricedCount=updates.filter(price=>price!=null).length;
        if(eligibleCount>0&&pricedCount===0){flashCartNotice("Hintoja ei löytynyt valitusta kaupasta. Ostoskorin aiempia hintoja ei muutettu.");return;}
        setCartItems(current=>current.map((item,i)=>{
          if(String(item.source||"").toLowerCase()==="offer"||item?.product?.ziiplyWeightLabel||Boolean(resolvePriceWeightLabel(String(item.ean||item.product?.ean||""))))return item;
          return {...item,price:updates[i]??null,storeName:String(store.name||""),priceNeedsRefresh:updates[i]==null};
        }));
        flashCartNotice(`Valitun kaupan hinnat päivitetty: ${pricedCount}/${eligibleCount} tuotetta.${pricedCount<eligibleCount?" Puuttuvat hinnat merkitty tarkistettaviksi.":""}`);
      }finally{if(desktopCompareRunId.current===runId)setDesktopCompareLoading(false)}
      return;
    }
    setDesktopCompareNotice(true);
    if(selected.length<2){setDesktopCompareResults({});setDesktopCompareError("Vertailuun tarvitaan vähintään kaksi valittua S- tai K-kauppaa.");return}
    const eligible=cartItems.filter(x=>String(x.source||"").toLowerCase()!=="offer"&&!x?.product?.ziiplyWeightLabel&&!resolvePriceWeightLabel(String(x.ean||x.product?.ean||"")));
    if(!eligible.length){setDesktopCompareResults({});setDesktopCompareError("Ostoskorissa ei ole vertailukelpoisia tuotteita.");return}
    const key=JSON.stringify([selected.map(x=>[x.id,x.externalId,x.name]),eligible.map(x=>[x.ean,x.id,x.name,x.quantity,x.source])]);
    const cached=desktopCompareCache.current.get(key);
    if(cached){setDesktopCompareResults(cached);return}
    setDesktopCompareLoading(true);setDesktopCompareResults({});
    try{
      const results=await Promise.all(selected.map(async store=>{
        const kind=storeKind(store);const isS=kind==="sHyper"||kind==="sLocal";
        const rows=await Promise.all(eligible.map(async item=>{
          const name=String(item.name||item.title||"").trim();
          const ean=String(item.ean||item.product?.ean||"").trim();
          const params=new URLSearchParams({search:name,store:String(store.externalId||store.id)});
          if(isS)params.set("storeName",String(store.name||""));
          try{
            const response=await fetch((isS?"/api/s-products?":"/api/k-products?")+params.toString(),{cache:"no-store"});
            if(!response.ok)throw Error(String(response.status));
            const data=await response.json();
            const products=Array.isArray(data?.products)?data.products:Array.isArray(data?.items)?data.items:Array.isArray(data)?data:[];
            const exact=ean?products.find((p:any)=>[p.ean,p.gtin,p.eanCode,p.barcode].some(v=>String(v||"")===ean)):null;
            // No speculative substitutes: name match must be exact, not a loose keyword hit.
            const byName=products.find((p:any)=>String(p.name||"").trim().toLocaleLowerCase("fi")===name.toLocaleLowerCase("fi"));
            const matched=exact||byName;
            const raw=Number((Array.isArray(matched?.storeItems)&&matched.storeItems.length?matched.storeItems.find((entry:any)=>String(entry.storeId??entry.store?.id??entry.store??"")===String(store.externalId||store.id))?.price:matched?.price)??0);
            const price=matched&&Number.isFinite(raw)&&raw>0?(isS&&data?.source==="s-kaupat-normal-v220"?raw:raw/100):null;
            return {cartItemId:String(item.id||""),name,quantity:Number(item.quantity||1),price,match:(exact?"ean":byName?"name":"none") as "ean"|"name"|"none"};
          }catch{return {cartItemId:String(item.id||""),name,quantity:Number(item.quantity||1),price:null,match:"none" as const}}
        }));
        return [String(store.id),{store,rows,total:rows.reduce((n,r)=>n+(r.price??0)*r.quantity,0),missing:rows.filter(r=>r.price==null).length}] as const;
      }));
      if(desktopCompareRequestIdentity.current!==requestIdentity||desktopCompareRunId.current!==runId)return;
      const next=Object.fromEntries(results);desktopCompareCache.current.set(key,next);setDesktopCompareResults(next);
    }catch{if(desktopCompareRequestIdentity.current===requestIdentity&&desktopCompareRunId.current===runId)setDesktopCompareError("Vertailuhaku epäonnistui. Yritä uudelleen.")}finally{if(desktopCompareRunId.current===runId)setDesktopCompareLoading(false)}
  }

  const [cartNotice, setCartNotice] = useState("");
  const [cartIncrementKey, setCartIncrementKey] = useState("");
  const [notebookOpen, setNotebookOpen] = useState(false);
  const [savedLists, setSavedLists] = useState<any[]>([]);
  const [saveListOpen, setSaveListOpen] = useState(false);
  const [saveListName, setSaveListName] = useState("");
  const [openedSavedListId, setOpenedSavedListId] = useState<string|null>(null);
  const [justiinaQuery, setJustiinaQuery] = useState("");
  const [justiinaDelay, setJustiinaDelay] = useState<0|1|2>(2);
  const [justiinaLoading, setJustiinaLoading] = useState(false);
  const [justiinaResults, setJustiinaResults] = useState<any[]>([]);
  const [justiinaResultsOpen, setJustiinaResultsOpen] = useState(false);
  const justiinaUserEditedRef = useRef(false);
  const justiinaAddedDuringSelectionRef = useRef(false);
  const justiinaLastSearchedRef = useRef("");
  const justiinaSuppressedTermsRef = useRef(new Set<string>());
  const [justiinaMessage, setJustiinaMessage] = useState("");
  const now = new Date();
  const month = ["TAMMIKUU","HELMIKUU","MAALISKUU","HUHTIKUU","TOUKOKUU","KESÄKUU","HEINÄKUU","ELOKUU","SYYSKUU","LOKAKUU","MARRASKUU","JOULUKUU"][now.getMonth()];


  function distanceKm(s:any){ if(!gpsCoords)return Number(s?.distanceKm ?? Number.POSITIVE_INFINITY); const lat=Number(s?.latitude ?? s?.lat); const lon=Number(s?.longitude ?? s?.lon ?? s?.lng); if(!Number.isFinite(lat)||!Number.isFinite(lon))return Number(s?.distanceKm ?? Number.POSITIVE_INFINITY); const r=6371, p1=gpsCoords.latitude*Math.PI/180, p2=lat*Math.PI/180, dp=(lat-gpsCoords.latitude)*Math.PI/180, dl=(lon-gpsCoords.longitude)*Math.PI/180; const a=Math.sin(dp/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2; return 2*r*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); }
  function byDistance(items:any[]){return [...items].sort((a,b)=>distanceKm(a)-distanceKm(b));}
  function storeKind(s:any){const chain=String(s?.chain||s?.type||s?.brand||"").toLowerCase();const n=String(s?.name||"").toLowerCase();if(chain==="lidl")return "lidl";if(chain.includes("tokmanni")||chain.includes("spar"))return "spar";if(n.includes("prisma"))return "sHyper";if(n.includes("citymarket"))return "kHyper";if(n.includes("s-market")||n.includes("sale")||n.includes("alepa"))return "sLocal";if(n.includes("k-market")||n.includes("k-supermarket"))return "kLocal";if(n.includes("lidl"))return "lidl";if(n.includes("tokmanni")||n.includes("spar"))return "spar";return ""}
  function applyModeDefaults(nextMode:"hyper"|"local"){const wanted=[nextMode==="hyper"?"sHyper":"sLocal",nextMode==="hyper"?"kHyper":"kLocal","lidl","spar"];const defaults=wanted.map(k=>stores.find((s:any)=>storeKind(s)===k)).filter(Boolean);setSelectedStores(prev=>{const selectedKinds=new Set(Object.values(prev).map((s:any)=>storeKind(s)));const next:any={};for(const s of defaults as any[]){const k=storeKind(s);if(selectedKinds.has(k))next[String(s.id)]=s}return next})}

  function applyLocation() {
    const value = location.trim();
    if (!value) return;
    setAppliedLocation(value);
    setUserLocationAction(true);
    setLocationResolved(true);
    setGpsOn(false);
    setGpsCoords(null);
    setLocationStatus(`Valittu sijainti: ${value}`);
    loadIndependentStores(value); fetch(`/api/store-search?search=${encodeURIComponent(value)}`, {cache:"no-store"}).then(r=>r.json()).then(d=>{ const items=Array.isArray(d?.items)?d.items:[]; setStores(items) }).catch(()=>setStores([]));
  }

  useEffect(()=>{try{const raw=window.localStorage.getItem("ziiply-desktop-ostelusvihko-v1");if(raw)setSavedLists(JSON.parse(raw))}catch{}},[]);
  function persistSavedLists(next:any[]){setSavedLists(next);try{window.localStorage.setItem("ziiply-desktop-ostelusvihko-v1",JSON.stringify(next))}catch{}}
  function beginSaveCart(){if(!cartItems.length){flashCartNotice("Ostoskori on tyhjä");return}const d=new Date();setSaveListName(`Ostelusvihko ${d.toLocaleDateString("fi-FI")}`);setSaveListOpen(true)}
  function restoreSavedList(list:any){setCartItems((list.items||[]).map((x:any)=>({...x})));setNotebookOpen(false);setCartOpen(true);flashCartNotice("Ostelusvihko palautettu ostoskoriin")}
  function saveCartToNotebook(){const name=saveListName.trim()||"Ostelusvihko";persistSavedLists([{id:String(Date.now()),name,createdAt:new Date().toISOString(),items:cartItems.map(x=>({...x}))},...savedLists]);setSaveListOpen(false);flashCartNotice(`Tallennettu Ostelusvihkoon: ${name}`)}

  function desktopCartPrice(value:any):number|null{if(value==null||value==="")return null;const normalized=String(value).replace(/\s/g,"").replace("€","").replace(",",".");const price=Number(normalized);return Number.isFinite(price)&&price>=0?price:null}
  function isDesktopMemoItem(p:any){return p?.isMemo===true||p?.manual===true||p?.source==="manual"||p?.source==="memo"||(!p?.ean&&!p?.offerId&&!p?.storeName&&desktopCartPrice(p?.price)==null)}
  function desktopCartKey(p:any){return String(p?.ean||p?.id||p?.offerId||p?.title||p?.name||"").trim()}
  function flashCartNotice(message:string){setCartNotice(message);window.setTimeout(()=>setCartNotice(current=>current===message?"":current),2200)}
  function addDesktopCartItem(p:any){
    const key=desktopCartKey(p);if(!key)return;
    setCartItems(current=>{const found=current.find(x=>desktopCartKey(x)===key);if(found){setCartIncrementKey(key);window.setTimeout(()=>setCartIncrementKey(currentKey=>currentKey===key?"":currentKey),900);return isDesktopMemoItem(found)?current:current.map(x=>desktopCartKey(x)===key?{...x,quantity:Number(x.quantity||1)+1}:x)}flashCartNotice(`Lisätty ostoskoriin: ${p?.title||p?.name||"tuote"}`);return [...current,{...p,source:p?.source||"normal",quantity:1}]});
  }
  function changeDesktopCartQuantity(p:any,delta:number){const key=desktopCartKey(p);setCartItems(current=>current.flatMap(x=>desktopCartKey(x)!==key?[x]:Number(x.quantity||1)+delta<=0?[]:[{...x,quantity:Number(x.quantity||1)+delta}]))}
  function removeDesktopCartItem(p:any){const key=desktopCartKey(p);setCartItems(current=>current.filter(x=>desktopCartKey(x)!==key));flashCartNotice(`Poistettu ostoskorista: ${p?.title||p?.name||"tuote"}`)}
  async function shareDesktopCart(){const lines=cartItems.map((p:any)=>Number(p.quantity||1)+" × "+String(p.title||p.name||"Tuote")+(p.storeName?" — "+p.storeName:""));const message="Ziiply ostoskori\\n"+lines.join("\\n");try{if(navigator.share)await navigator.share({title:"Ziiply ostoskori",text:message});else if(navigator.clipboard){await navigator.clipboard.writeText(message);flashCartNotice("Ostoskori kopioitu leikepöydälle")}else flashCartNotice("Jakaminen ei ole käytettävissä")}catch(e:any){if(e?.name!=="AbortError")flashCartNotice("Jakaminen epäonnistui")}}
  function clearDesktopCart(){setCartItems([]);flashCartNotice("Ostoskori tyhjennetty")}
  const desktopCartCount=cartItems.reduce((sum:number,p:any)=>sum+Number(p.quantity||1),0);

  // One immutable result set per actual chain/store, independent of selector mode.
  const offerWarmCache=useRef<Map<string,{time:number;results:any[]}>>(new Map());
  const offerWarmPending=useRef<Map<string,Promise<any[]>>>(new Map());
  const offerRequestId=useRef(0);
  const offerViewState=useRef<Map<string,{tab:"offers"|"campaigns";category:string}>>(new Map());
  const activeOfferKey=useRef("");
  useEffect(()=>{try{const saved=JSON.parse(window.sessionStorage.getItem("ziiply-desktop-offers-cache-v1")||"[]");if(Array.isArray(saved))for(const [key,value] of saved){if(typeof key==="string"&&Array.isArray(value?.results))offerWarmCache.current.set(key,value)}}catch{}},[]);
  function offerContext(chain:string,store:any){const ctx:any={};if(chain==="S"){ctx.sStoreId=store?.externalId||store?.id;ctx.sStoreName=store?.name}if(chain==="K"){ctx.kStoreId=store?.externalId||store?.id;ctx.kStoreName=store?.name}if(chain==="LIDL"){ctx.lidlStoreKey=store?.storeKey||store?.externalId||store?.id;ctx.lidlStoreName=store?.name||"Lidl"}if(chain==="TOKMANNI"){ctx.tokmanniStoreId=store?.externalId||store?.id;ctx.tokmanniStoreName=store?.name||"Tokmanni"}if(chain==="EUROSPAR"){ctx.eurosparStoreId=store?.externalId||store?.id;ctx.eurosparStoreName=store?.name||"Eurospar";ctx.eurosparStoreChain=store?.chain}return ctx}
  function offerKey(chain:string,store:any){const ctx=offerContext(chain,store);return JSON.stringify([chain,ctx.sStoreId||ctx.kStoreId||ctx.lidlStoreKey||ctx.tokmanniStoreId||ctx.eurosparStoreId||store?.id||store?.name])}
  function warmOffers(chain:string,store:any){const ctx=offerContext(chain,store);const key=offerKey(chain,store);const hit=offerWarmCache.current.get(key);if(hit)return Promise.resolve(hit.results);const pending=offerWarmPending.current.get(key);if(pending)return pending;const promise=searchZiiplyGostaOffersV146({query:"",terms:[],context:ctx}).then(r=>{const results=(r.results||[]).map(mapZiiplyGostaOfferToCardOfferV147);offerWarmCache.current.set(key,{time:Date.now(),results});try{window.sessionStorage.setItem("ziiply-desktop-offers-cache-v1",JSON.stringify([...offerWarmCache.current]))}catch{}return results}).finally(()=>offerWarmPending.current.delete(key));offerWarmPending.current.set(key,promise);return promise}
  useEffect(()=>{for(const store of Object.values(selectedStores) as any[]){const kind=storeKind(store);const chain=kind==="sHyper"||kind==="sLocal"?"S":kind==="kHyper"||kind==="kLocal"?"K":kind==="lidl"?"LIDL":String(store?.chain||"").toUpperCase()==="EUROSPAR"?"EUROSPAR":"TOKMANNI";void warmOffers(chain,store).catch(()=>{})}},[selectedStores]);
  async function openDesktopGostaChain(chain:"S"|"K"|"LIDL"|"TOKMANNI"|"EUROSPAR", store:any) {
    const key=offerKey(chain,store);const request=++offerRequestId.current;
    if(activeOfferKey.current)offerViewState.current.set(activeOfferKey.current,{tab:gostaTab,category:gostaCategory});
    activeOfferKey.current=key;const previous=offerViewState.current.get(key);
    setGostaChainPicker(false);setGostaChain(chain);setGostaTab(previous?.tab||"offers");setGostaCategory(previous?.category||"");
    const cached=offerWarmCache.current.get(key);
    if(cached){setGostaOffers(cached.results);setGostaLoading(false);return}
    setGostaOffers([]);setGostaLoading(true);
    try{const results=await warmOffers(chain,store);if(request===offerRequestId.current)setGostaOffers(results)}
    catch{if(request===offerRequestId.current)setGostaOffers([])}
    finally{if(request===offerRequestId.current)setGostaLoading(false)}
  }
  async function runDesktopScannerEanSearch(code:string,physicalScan=false) {
    const weightLabel=resolvePriceWeightLabel(code);
    const kWeightLabel=resolveKWeightLabel(code);
    if(weightLabel){
      const scannedEan=weightLabel.scannedEan;
      const canonical=kWeightLabel?.canonicalEan||scannedEan;
      const bank=await fetch("/api/ean-bank?ean="+encodeURIComponent(canonical),{cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null);
      const name=String(bank?.product?.name||"").trim()||`Tuntematon punnittu tuote (PLU ${weightLabel.plu})`;
      const price=null; // Never use the encoded weight-label total as a cart item price.
      setCartItems(current=>{
        const found=current.find((x:any)=>{
          const other=resolvePriceWeightLabel(String(x.ean||x.product?.ean||""));
          return other?.plu===weightLabel.plu||String(x.ean||"")===scannedEan;
        });
        if(found){
          const key=String(found.id||"");
          const firstCollection=false; // HID scan alone does not establish in-store collection.
          if(firstCollection)setDesktopCheckedCartItems(previous=>({...previous,[key]:true}));
          return current.map((x:any)=>x!==found?x:{
            ...x,name,title:name,ean:scannedEan,price,quantity:firstCollection?Number(x.quantity||1):Number(x.quantity||1)+(physicalScan?1:0),
            product:{...(x.product||{}),name,ean:scannedEan,ziiplyWeightLabel:true},
            ziiplyWeightLabel:true,weightPlu:weightLabel.plu
          });
        }
        const id="weight-"+weightLabel.plu;
        // Do not auto-collect a weighed item merely because a HID reader was used.
        return [...current,{id,name,title:name,ean:scannedEan,price,
          quantity:1,source:"search",product:{name,ean:scannedEan,ziiplyWeightLabel:true},
          ziiplyWeightLabel:true,weightPlu:weightLabel.plu}];
      });
      setDesktopScannerLoading(false);
      setDesktopScannerMessage("Vaakatuote lisätty");
      if(physicalScan)flashDesktopScanner("success");
      return;
    }
    const alreadyInCart=cartItems.some(item=>String(item.ean||item.product?.ean||"")===code);
    if(alreadyInCart){
      if(desktopScannerFlashTimer.current)clearTimeout(desktopScannerFlashTimer.current);
      if(desktopScannerIncrementTimer.current)clearTimeout(desktopScannerIncrementTimer.current);
      setDesktopScannerLoading(false);
      setDesktopScannerFlash("idle");
      setDesktopScannerMessage("");
      setDesktopScannerIncrement(true);
      setCartItems(current=>current.map(item=>String(item.ean||item.product?.ean||"")===code?{...item,quantity:Number(item.quantity||1)+1}:item));
      desktopScannerIncrementTimer.current=setTimeout(()=>setDesktopScannerIncrement(false),900);
      return;
    }
    setDesktopScannerIncrement(false);
    setDesktopScannerFlash("idle");
    setDesktopScannerLoading(true);
    setDesktopScannerMessage("");
    const selected=Object.values(selectedStores) as any[];
    const stores=selected.filter(x=>["sHyper","sLocal","kHyper","kLocal"].includes(storeKind(x)));
    try {
      // Mobile scanner's first identity source: persistent EAN bank. The bank
      // identifies the product, not its price or store availability.
      const bankResponse=await fetch("/api/ean-bank?ean="+encodeURIComponent(code),{cache:"no-store"});
      const bankData=bankResponse.ok?await bankResponse.json().catch(()=>null):null;
      const bankProduct=bankData?.product;
      const knownName=String(bankProduct?.name||"").trim();
      // Known Neon EAN identity must never wait for chain price searches.
      if(knownName){
        addDesktopCartItem({id:code,ean:code,name:knownName,title:knownName,price:0,source:"justiina"});
        setDesktopScannerLoading(false);
        setDesktopScannerMessage("TUOTE LISÄTTY");
        flashDesktopScanner("success");
      }
      // Store-specific price discovery is independent and must not block recognition.
      const results=await Promise.all(stores.map(async store=>{
        const kind=storeKind(store);
        const sChain=kind==="sHyper"||kind==="sLocal";
        const params=new URLSearchParams({search:knownName||code,store:String(store.externalId||store.id)});
        if(sChain)params.set("storeName",String(store.name||""));
        const response=await fetch((sChain?"/api/s-products?":"/api/k-products?")+params.toString(),{cache:"no-store"});
        if(!response.ok)return [];
        const data=await response.json();
        const items=Array.isArray(data?.products)?data.products:Array.isArray(data?.items)?data.items:Array.isArray(data)?data:[];
        return items.filter((p:any)=>{
          const eans=[p.ean,p.eanCode,p.barcode,p.gtin,p.code,p.product?.ean].filter(Boolean).map(String);
          return eans.includes(code)||(knownName&&String(p.name||p.title||"").trim().toLocaleLowerCase("fi")===knownName.toLocaleLowerCase("fi"));
        }).map((p:any)=>({...p,__store:store.name,__price:Number(p.price??p.storeItems?.[0]?.price??0),__chain:sChain?"S":"K",__priceIsEuros:sChain&&data?.source==="s-kaupat-normal-v220"}));
      }));
      const matches=results.flat();
      if(matches.length){
        const matched=matches[0] as any;
        const name=String(matched.name||matched.title||knownName||"Tuote");
        const rawPrice=Number(matched.__price||0);
        const priceEur=rawPrice>0?(matched.__priceIsEuros?rawPrice:rawPrice/100):0;
        if(knownName){
          if(priceEur>0)setCartItems(current=>current.map(item=>String(item.ean||"")===code?{...item,price:priceEur,storeName:String(matched.__store||""),chain:matched.__chain}:item));
        }else{
          addDesktopCartItem({id:code,ean:code,name,title:name,price:priceEur,storeName:String(matched.__store||""),source:"justiina",chain:matched.__chain});
          setDesktopScannerMessage("TUOTE LISÄTTY");
          flashDesktopScanner("success");
        }
      }else if(!knownName){
        setDesktopScannerMessage("❌ Tuotetta ei tunnistettu — ei lisätty koriin");
        flashDesktopScanner("error");
      }
    }catch{setDesktopScannerMessage("Tuotehaku epäonnistui. Yritä uudelleen.");flashDesktopScanner("error")}finally{setDesktopScannerLoading(false)}
  }

  async function runDesktopJustiinaSearch(raw=justiinaQuery) {
    const query=String(raw||"").trim(); if(!query)return;
    const selected=Object.values(selectedStores) as any[];
    const s=selected.find(x=>{const k=storeKind(x);return k==="sHyper"||k==="sLocal"});
    const k=selected.find(x=>{const t=storeKind(x);return t==="kHyper"||t==="kLocal"});
    if(!s&&!k){setJustiinaMessage("Valitse ensin S- tai K-kauppa.");return}
    setJustiinaLoading(true);setJustiinaMessage("");setJustiinaResults([]);
    if(justiinaDelay) await new Promise(r=>window.setTimeout(r,justiinaDelay*1000));
    try{
      const calls:any[]=[];
      if(s)calls.push(fetch(`/api/s-products?search=${encodeURIComponent(query)}&store=${encodeURIComponent(String(s.externalId||s.id))}&storeName=${encodeURIComponent(String(s.name||""))}`,{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>({chain:"S",store:s,data:d})));
      if(k)calls.push(fetch(`/api/k-products?search=${encodeURIComponent(query)}&store=${encodeURIComponent(String(k.externalId||k.id))}`,{cache:"no-store"}).then(r=>r.ok?r.json():null).then(d=>({chain:"K",store:k,data:d})));
      const batches=await Promise.all(calls);const rows:any[]=[];
      for(const b of batches){const items=Array.isArray(b.data?.products)?b.data.products:Array.isArray(b.data?.items)?b.data.items:Array.isArray(b.data)?b.data:[];for(const x of items.slice(0,8)){const rawPrice=Number(x?.storeItems?.[0]?.price??x?.price??x?.storeItem?.price??0);const priceIsEuros=b.chain==="S"&&b.data?.source==="s-kaupat-normal-v220";const euro=Number.isFinite(rawPrice)&&rawPrice>0?(priceIsEuros?rawPrice:rawPrice/100):null;rows.push({...x,__chain:b.chain,__store:b.store?.name,__price:euro,__priceSource:b.data?.source||""})}}
      setJustiinaResults(rows);justiinaLastSearchedRef.current=query.trim();justiinaUserEditedRef.current=false;justiinaAddedDuringSelectionRef.current=false;setJustiinaResultsOpen(rows.length>0);if(!rows.length)setJustiinaMessage(`Hakemaasi "${query}" ei löydy.`);
    }catch{setJustiinaMessage("Haku ei onnistunut. Yritä uudelleen.")}finally{setJustiinaLoading(false)}
  }

  useEffect(()=>{
    if(workspace!=="justiina")return;
    if(justiinaQuery.trim().length<2)return;
    // Sama ehto kuin mobiilissa: pelkkä paluu/remount ei laukaise uutta hakua.
    if(!justiinaUserEditedRef.current || justiinaLastSearchedRef.current===justiinaQuery.trim() || justiinaSuppressedTermsRef.current.has(justiinaQuery.trim().toLowerCase()))return;
    const timer=window.setTimeout(()=>{void runDesktopJustiinaSearch(justiinaQuery)},550);
    return ()=>window.clearTimeout(timer);
  // Deliberately trigger only on user query edits, not result updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[justiinaQuery,workspace]);

  async function loadIndependentStores(search:string, coords?:{latitude:number;longitude:number}) { const lp=new URLSearchParams(); if(search) lp.set("search",search); if(coords){lp.set("lat",String(coords.latitude));lp.set("lon",String(coords.longitude));lp.set("gps","1")} try{const r=await fetch(`/api/lidl/store-search?${lp}`,{cache:"no-store"});const d=await r.json();setLidlStores(Array.isArray(d?.items)?d.items:[])}catch{setLidlStores([])} const sp=new URLSearchParams(); if(search)sp.set("search",search);if(coords){sp.set("lat",String(coords.latitude));sp.set("lon",String(coords.longitude))} try{const r=await fetch(`/api/eurospar-stores?${sp}`,{cache:"no-store"});const d=await r.json();setSparStores(Array.isArray(d?.items)?d.items:[])}catch{setSparStores([])} }

  function useGps() {
    if (!navigator.geolocation) {
      setLocationStatus("Sijaintia ei tueta tällä laitteella");
      return;
    }
    setLocationStatus("Haetaan sijaintia…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setGpsOn(true);
        setUserLocationAction(true);
        setLocationResolved(true);
        setGpsCoords({latitude:coords.latitude,longitude:coords.longitude});
        setGpsToast("GPS päällä"); window.setTimeout(()=>setGpsToast(""),1800);
        setAppliedLocation(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`);
        setLocationStatus("GPS-sijainti käytössä");
        loadIndependentStores("", {latitude:coords.latitude,longitude:coords.longitude});
        fetch(`/api/store-search?gps=1&lat=${coords.latitude}&lon=${coords.longitude}`, {cache:"no-store"}).then(r=>r.json()).then(d=>{ const items=Array.isArray(d?.items)?d.items:[]; setStores(items) }).catch(()=>setStores([]));
      },
      () => setLocationStatus("Sijainnin käyttö ei onnistunut"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }


  // GPS is the default on desktop; geolocation permission still belongs to the browser.
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationStatus("Sijaintia ei tueta tällä laitteella");
      return;
    }
    useGps();
    // Run once on mount; do not reset manually selected stores on subsequent renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/desktop-electricity", { cache: "no-store" }).then(r => r.json()).then(data => {
      const prices = Array.isArray(data?.prices) ? data.prices : [];
      const t = Date.now();
      const current = prices.find((p: any) => { const a = new Date(p.startDate ?? p.start).getTime(); const b = new Date(p.endDate ?? p.end).getTime(); return a <= t && t < b; });
      const n = Number(current?.price ?? current?.value ?? current?.priceWithTax);
      if (!cancelled && Number.isFinite(n)) setElectricity({ value: n.toLocaleString("fi-FI",{maximumFractionDigits:1}), detail: "c/kWh nyt" });
    }).catch(() => { if (!cancelled) setElectricity({value:"—",detail:"ei saatavilla"}); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async ({coords}) => {
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,weather_code&timezone=auto`, {cache:"no-store"});
        const d = await r.json(); const temp = Number(d?.current?.temperature_2m);
        if (Number.isFinite(temp)) setWeather({value:`${temp >= 0 ? "+" : ""}${Math.round(temp)}°`,detail: appliedLocation});
      } catch {}
    }, () => setWeather({value:"—",detail:appliedLocation}), {maximumAge:300000,timeout:5500});
  }, [appliedLocation]);

  useEffect(() => {
    const value = location.trim();
    if (!value || value === appliedLocation) return;
    const timer = window.setTimeout(() => applyLocation(), 1200);
    return () => window.clearTimeout(timer);
  }, [location]);

  useEffect(() => {
    const value = location.trim();
    if (!value || value === appliedLocation) return;
    const timer = window.setTimeout(() => applyLocation(), 1200);
    return () => window.clearTimeout(timer);
  }, [location]);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices?.enumerateDevices().then((devices) => {
      const cameras = devices.filter((d) => d.kind === "videoinput");
      const rear = cameras.some((d) => /(back|rear|environment|world|takakamera)/i.test(d.label));
      const touch = navigator.maxTouchPoints > 1;
      if (!cancelled) setScannerMode(rear || (touch && cameras.length > 0) ? "camera" : "external");
    }).catch(() => { if (!cancelled) setScannerMode("external"); });
    return () => { cancelled = true; };
  }, []);

  return (
    <main
      className="relative h-[100dvh] overflow-hidden text-[#050b2b] selection:bg-[#d9b96f]/35"
      style={{
        background:
          "radial-gradient(circle at 18% 5%, rgba(255,249,232,0.98) 0%, rgba(240,237,220,0.92) 25%, rgba(225,232,220,0.97) 52%, rgba(209,221,211,1) 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.11]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 16%, rgba(255,255,255,0.62) 0 1px, transparent 1.8px), radial-gradient(circle at 72% 42%, rgba(122,97,49,0.12) 0 1px, transparent 2px)",
          backgroundSize: "34px 34px, 48px 48px",
        }}
      />

      <div aria-hidden className="pointer-events-none absolute -left-32 top-24 h-[520px] w-[520px] rounded-full bg-[#f6e8b8]/35 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-40 bottom-[-80px] h-[620px] w-[620px] rounded-full bg-[#8ead91]/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute left-[44%] top-[10%] h-[190px] w-[190px] rotate-12 rounded-[44px] border border-[#8c7042]/10 bg-[#fff7df]/18 shadow-[0_30px_80px_rgba(70,60,35,0.05)]" />

      <div className="relative mx-auto flex h-[100dvh] w-full max-w-[1800px] flex-col px-8 py-5 xl:px-12 xl:py-6">
        <header className="grid grid-cols-[auto_minmax(360px,0.68fr)_minmax(650px,1fr)] items-center gap-5 border-b border-[#64745f]/20 pb-4">
          <div className="flex items-center gap-3">
            <img src="/ziiplylogo_mobile.png" alt="Ziiply" className="h-[66px] w-[66px] object-contain drop-shadow-[0_4px_10px_rgba(21,79,50,0.10)]" />
            <div>
              <div className="text-[12px] font-black uppercase tracking-[0.22em] text-[#6d765f]">Yksi haku. Kaikki hinnat.</div>
              <div className="mt-0.5 text-[17px] font-black text-[#314633]">Ziiply</div>
            </div>
          </div>

          <div className="relative grid h-[66px] min-w-0 grid-cols-[52px_minmax(180px,1fr)_64px] items-center gap-2 rounded-[22px] border-[2px] border-[#0b4638] bg-[linear-gradient(180deg,#fffdf5_0%,#f7edd2_100%)] p-[5px] shadow-[inset_0_1px_0_rgba(255,255,255,.75),0_4px_12px_rgba(34,54,43,.10)]">
            <div className="grid h-[52px] w-[52px] place-items-center"><button type="button" onClick={() => { if(gpsOn){setGpsOn(false);setGpsCoords(null);setUserLocationAction(false);setLocationResolved(false);setAppliedLocation("");setStores([]);setLidlStores([]);setSparStores([]);setSelectedStores({});setGpsToast("GPS ei päällä");window.setTimeout(()=>setGpsToast(""),1800)} else useGps(); }} title={gpsOn ? "GPS päällä" : "GPS pois"} className={`relative grid h-[52px] w-[52px] place-items-center rounded-[16px] border-2 shadow-[inset_0_1px_0_rgba(255,255,255,.72)] ${gpsOn ? "border-[#2f9f58] bg-gradient-to-b from-[#ebfff0] to-[#98dfad]" : "border-[#c77a7a] bg-gradient-to-b from-[#fff1f1] to-[#f0caca]"}`}>
              <span className="text-[23px]">📍</span>{gpsToast&&<span className="absolute left-1/2 top-[62px] z-50 w-max -translate-x-1/2 rounded-full border border-[#6f806a]/20 bg-[#fffaf0] px-3 py-1.5 text-[10px] font-black text-[#536252] shadow-lg">{gpsToast}</span>}
              <span className={`absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full border border-white shadow-sm ${gpsOn?"bg-[#159447]":"bg-[#a44f4f]"}`} />
            </button></div>
            <label className="relative min-w-0 rounded-[15px] border border-[#b89552] bg-gradient-to-b from-[#fff8e7] to-[#efd79d] px-3 py-1.5 shadow-inner">
              <span className="block text-[8px] font-black uppercase tracking-[0.12em] text-[#756848]">Paikkakunta tai postinumero</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") applyLocation(); }} aria-label="Paikkakunta tai postinumero" className="mt-0.5 block w-full bg-transparent text-[15px] font-black text-[#241b13] outline-none placeholder:text-[#766e5c]" placeholder="05510 tai Hyvinkää" />
            </label>
            <button type="button" onClick={() => setMapOpen(true)} title="Avaa kartta" className="group grid h-[52px] w-[64px] place-items-center rounded-[16px] border-2 border-[#65a99c] bg-gradient-to-b from-[#c8eee8] to-[#86cabf] shadow-[inset_0_1px_0_rgba(255,255,255,.65)]">
              <img src="/icons/ziiply-compass.png" alt="Avaa kartta" className="h-[43px] w-[43px] object-contain drop-shadow-[0_3px_6px_rgba(7,61,50,.24)] transition group-hover:scale-105" />
            </button>
          </div>

          <div className="ml-auto grid w-full max-w-[900px] grid-cols-4 gap-2.5">
            {[
              ["☀️", "SÄÄ", weather.value, "", "from-[#fffdf0] to-[#ffedb8] border-[#b5cbb4]"],
              ["⚡", "SÄHKÖ", electricity.value, electricity.detail, "from-[#fff6ce] to-[#ffdf75] border-[#d2b363]"],
              ["⛽", "AJOAINE", "—", "€/l", "from-[#fff1da] to-[#ffc795] border-[#c78b63]"],
            ].map(([icon, title, value, detail, theme]) => (
              <div key={title} className={`group relative flex h-[66px] items-center gap-3 rounded-[19px] border bg-gradient-to-b ${theme} px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_4px_10px_rgba(52,48,32,.10)] transition hover:-translate-y-0.5`}>
                <span className="text-[27px] drop-shadow-sm">{icon}</span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-black tracking-[0.12em] text-[#625b43]">{title}</span>
                  <span className="mt-0.5 block text-[19px] font-black leading-none text-[#102a24]">{value}</span>
                  <span className="mt-1 block truncate text-[9px] font-black text-[#706a58]">{detail}</span>
                </span>
              </div>
            ))}
            <button type="button" onClick={() => { window.open("https://calendar.google.com/calendar/u/0/r", "_blank", "noopener,noreferrer"); }} className="group relative flex h-[66px] items-center gap-3 rounded-[19px] border border-[#c9a86d] bg-gradient-to-b from-[#fffaf0] to-[#ffe39a] px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_4px_10px_rgba(52,48,32,.10)] transition hover:-translate-y-0.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-[11px] border-2 border-[#8a5b1d] bg-[#fff9e8] text-[21px] font-black text-[#17322a] shadow-sm">{now.getDate()}</span>
              <span>
                <span className="block text-[9px] font-black tracking-[0.12em] text-[#625b43]">{month}</span>
                <span className="mt-0.5 block text-[14px] font-black leading-none text-[#102a24]">Kalenteri</span>
                <span className="mt-1 block text-[9px] font-black text-[#8a5b1d]">Avaa kalenteri →</span>
              </span>
            </button>

          </div>
        </header>

        

        {saveListOpen&&<div className="fixed inset-0 z-[120] grid place-items-center bg-[#17352a]/35 p-10"><div className="w-full max-w-[560px] rounded-[26px] border-[3px] border-[#315d45] bg-[#fff6d9] p-6 shadow-2xl"><div className="font-serif text-[28px] font-black italic text-[#174c3a]">Tallenna Ostelusvihkoon</div><label className="mt-5 block text-[10px] font-black uppercase tracking-[.16em] text-[#756848]">Vihkon nimi</label><input autoFocus value={saveListName} onChange={e=>setSaveListName(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")saveCartToNotebook()}} className="mt-2 w-full rounded-[16px] border-2 border-[#b89552] bg-white px-4 py-3 text-[16px] font-black outline-none"/><div className="mt-5 flex justify-end gap-3"><button onClick={()=>setSaveListOpen(false)} className="rounded-full border-2 border-[#9b8051] px-5 py-2 font-black">Peru</button><button onClick={saveCartToNotebook} className="rounded-full border-2 border-[#315d45] bg-[#dfead4] px-6 py-2 font-black text-[#174c3a]">Tallenna</button></div></div></div>}
        {reloadCartDecisionOpen&&<div className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#1c271c]/65 px-4"><div role="dialog" aria-modal="true" aria-label="Säilytetäänkö ostoskori?" className="w-full max-w-[420px] rounded-[22px] border-[3px] border-[#b89552] bg-[#fff3d3] p-6 text-center text-[#174c35] shadow-2xl"><h2 className="font-serif text-[24px] font-black">Säilytetäänkö ostoskorin tavarat?</h2><p className="mt-3 text-[15px]">Ostoskori sisältää {cartItems.length} tuotetta.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><button type="button" onClick={()=>{setReloadCartDecisionOpen(false);setCartOpen(true)}} className="rounded-full border-2 border-[#17573c] bg-[#17573c] px-5 py-3 font-black text-white">Säilytä tavarat</button><button type="button" onClick={()=>{setCartItems([]);setReloadCartDecisionOpen(false);setCartOpen(false);try{window.sessionStorage.removeItem("ziiply-desktop-current-cart-v1")}catch{}}} className="rounded-full border-2 border-[#b58a46] bg-[#fff9e9] px-5 py-3 font-black">Tyhjennä kori</button></div></div></div>}
        {desktopScannerOpen&&<div className="fixed inset-0 z-[99998] flex items-center justify-center bg-black/65 p-4"><div className="relative h-[min(680px,92dvh)] w-[min(440px,95vw)] overflow-hidden rounded-[24px] bg-[#f4edda]">
<ZiiplyDesktopScannerCard className="[&>footer]:hidden" regionId="ziiply-desktop-scanner-region" loading={desktopScannerLoading} flashState={desktopScannerFlash} scannerMessage={desktopScannerMessage} onClose={()=>{setDesktopScannerCameraOn(false);setDesktopScannerOpen(false)}} />
{desktopScannerIncrement&&<div className="pointer-events-none absolute inset-0 z-[90] flex items-center justify-center"><span className="rounded-2xl border-[3px] border-[#245c28] bg-[#d7ffd2] px-12 py-6 text-[48px] font-black text-[#123d18] shadow-xl">+1</span></div>}
<div className="pointer-events-none absolute inset-x-0 bottom-[112px] z-[70] flex justify-center"><button type="button" className="pointer-events-auto rounded-full border-2 border-[#17573c] bg-[#e2edcf] px-5 py-3 font-black text-[#174c35]" onClick={()=>setDesktopScannerCameraOn(v=>!v)}>{desktopScannerCameraOn?"Sulje kamera":"Käynnistä kamera"}</button></div>
<div className="absolute bottom-3 left-3 right-3 z-[100] rounded-xl bg-[#fff5dc] p-3 shadow-xl"><div className="flex flex-wrap items-center justify-center gap-3"><button type="button" onClick={()=>{setDesktopScannerMessage("");void pasteDesktopScannerEan()}} className="flex min-h-[64px] flex-1 items-center justify-center rounded-[17px] border-[3px] border-[#8d6e3d] bg-[#f8ecd0] px-3 py-2 text-center text-[13px] font-black uppercase leading-tight text-[#28492f] shadow-[inset_0_2px_0_rgba(255,255,255,0.7)]">Liitä EAN</button><button type="button" aria-label="Avaa ostoskori" title="Avaa ostoskori" onClick={()=>{setDesktopScannerCameraOn(false);setDesktopScannerOpen(false);setCartOpen(true)}} className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border-[5px] border-[#7b6034] bg-[#d8c08c] shadow-[0_6px_16px_rgba(0,0,0,0.22),inset_0_2px_0_rgba(255,255,255,0.55)]"><span className="flex h-[54px] w-[54px] items-center justify-center rounded-full border-[3px] border-[#efe2b8] bg-[#16472c] text-[31px] leading-none text-[#fff6d9]">🧺</span></button><button type="button" onClick={()=>{setDesktopScannerCameraOn(false);setDesktopScannerOpen(false)}} className="flex min-h-[64px] flex-1 items-center justify-center rounded-[17px] border-[3px] border-[#7d2b1d] bg-[linear-gradient(180deg,#c64235_0%,#922016_100%)] px-3 py-2 text-center text-[13px] font-black uppercase leading-tight text-[#fff3dc] shadow-[inset_0_2px_0_rgba(255,255,255,0.20)]">Sulje kamera</button></div></div></div></div>}
        <ZiiplyDesktopNotebookCard open={notebookOpen} lists={savedLists} currentCartCount={cartItems.length} openedListId={openedSavedListId} onToggleList={(id)=>setOpenedSavedListId(openedSavedListId===id?null:id)} onSaveCurrentCart={beginSaveCart} onRestoreList={restoreSavedList} onDeleteList={(id)=>persistSavedLists(savedLists.filter((list:any)=>list.id!==id))} onClose={()=>setNotebookOpen(false)} />
        {cartNotice&&<div className="fixed left-1/2 top-[142px] z-[110] max-w-[760px] -translate-x-1/2 rounded-[18px] bg-[#08a36d] px-8 py-4 text-center text-[16px] font-black text-white shadow-2xl">{cartNotice}</div>}
        {cartOpen && cartPaperReady && <div className="fixed bottom-[24px] left-[24px] right-[24px] top-[128px] z-[90] flex overflow-hidden rounded-[30px] border-[3px] border-[#8a6c3d] bg-[#f7edcf] p-3 shadow-[0_30px_90px_rgba(20,40,31,.35)]">
<div className="relative mx-auto min-h-0 w-full max-w-[1600px] flex-1 overflow-hidden" style={{backgroundImage:"url('/ui/cart/desktop-virtanen.svg')",backgroundSize:"100% 100%",backgroundPosition:"center",backgroundRepeat:"no-repeat"}}>
 <div className="absolute left-[4%] right-[4%] top-[2.5%] z-10 flex items-start justify-between gap-4">
  <h2 className="px-2 font-serif text-[clamp(25px,2.5vw,40px)] font-black italic text-[#174c3a]">Tavarainkeruu</h2>

 </div>
 <div className="absolute inset-x-[4.5%] bottom-[22%] top-[28%] overflow-y-auto">
 {cartItems.length===0?<p className="py-8 text-center font-serif text-[24px] font-bold text-[#503d2a]">Ostoskori on tyhjä</p>:cartItems.map((p:any,i:number)=><div key={desktopCartKey(p)||i} className="grid min-h-[112px] grid-cols-[6.2%_59.6%_15%_19.2%] items-center border-b border-[#8f744f]/25 text-[#3c2c1b]">
  <span className="text-center font-serif text-[20px]">{i+1}</span>
  <div className="flex min-w-0 items-center gap-3 px-3">{p.pictureUrl&&<img src={p.pictureUrl} alt="" className="h-[78px] w-[78px] shrink-0 rounded-lg bg-[#fffaf0] object-contain" />}<div className="min-w-0"><div className="line-clamp-2 text-[clamp(16px,1.2vw,21px)] font-bold">{p.title||p.name}</div><div className="text-[15px] text-[#66543d]">{p.storeName||""}</div>{p.discountText&&<div className="truncate text-[14px] italic text-[#77513c]">{p.discountText}</div>}{p.unitPrice&&<div className="text-[14px] text-[#66543d]">{p.unitPrice}</div>}{p.validityText&&<div className="text-[14px] text-[#66543d]">{p.validityText}</div>}</div></div>
  <div className="flex items-center justify-center gap-2">{!isDesktopMemoItem(p)&&<><button onClick={()=>changeDesktopCartQuantity(p,-1)} aria-label="Vähennä määrää" className="grid h-10 w-10 place-items-center rounded-full border border-[#315d45] bg-[#fff8df] font-bold">−</button><span className="min-w-6 text-center text-[19px] font-bold">{Number(p.quantity||1)}</span><button onClick={()=>changeDesktopCartQuantity(p,1)} aria-label="Lisää määrää" className="grid h-10 w-10 place-items-center rounded-full border border-[#315d45] bg-[#fff8df] font-bold">+</button></>}</div>
  <div className="flex items-center justify-center px-2">{!isDesktopMemoItem(p)&&<span className="whitespace-nowrap font-serif text-[clamp(17px,1.35vw,23px)] font-bold">{desktopCartPrice(p.price)!=null?desktopCartPrice(p.price)!.toFixed(2).replace(".",",")+" €":"—"}</span>}</div>
 </div>)}
 </div>
 <div className="absolute bottom-[3%] left-1/2 z-10 w-max max-w-[94%] -translate-x-1/2 rounded-[20px] border-2 border-[#ad8650] bg-[#fff3d3]/95 px-4 py-3 shadow-[0_4px_12px_#614a3022]">
 <div className="flex flex-wrap items-center justify-center gap-4">
  <div className="flex flex-wrap items-center justify-center gap-4">
   <button onClick={()=>{setCartOpen(false);setNotebookOpen(true)}} title="Ostoslistat" aria-label="Ostoslistat" className="grid h-[64px] w-[84px] place-items-center rounded-[16px] border-[3px] border-[#9c763b] bg-[linear-gradient(150deg,#fff9df_0%,#f0d59c_52%,#b98d4b_100%)] text-[#543b20] shadow-[inset_0_2px_2px_#ffffffaa,0_5px_0_#8c6a39,0_9px_16px_#46351b44] transition hover:-translate-y-1 hover:brightness-105 active:translate-y-[2px] active:shadow-sm"><svg aria-hidden="true" viewBox="0 0 64 64" className="h-[49px] w-[49px] drop-shadow-[1px_2px_1px_#5b411f66]" fill="none" stroke="#624522" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><rect x="12" y="9" width="39" height="48" rx="5" fill="#fff4d3"/><path d="M22 9v48M27 20h17M27 30h17M27 40h13" stroke="#906b3d"/><rect x="7" y="16" width="10" height="35" rx="3" fill="#d4ae69"/><path d="M9 24h7M9 33h7M9 42h7" stroke="#fff1cb"/></svg></button>
   
   <button disabled={!cartItems.length} onClick={shareDesktopCart} title="Lähetä ostoskori" className="grid h-[64px] w-[84px] place-items-center rounded-[16px] border-[3px] border-[#9c763b] bg-[linear-gradient(150deg,#fff9df_0%,#f0d59c_52%,#b98d4b_100%)] text-[#543b20] shadow-[inset_0_2px_2px_#ffffffaa,0_5px_0_#8c6a39,0_9px_16px_#46351b44] transition hover:-translate-y-1 hover:brightness-105 active:translate-y-[2px] active:shadow-sm disabled:opacity-40"><svg aria-hidden="true" viewBox="0 0 64 64" className="h-[49px] w-[49px] drop-shadow-[1px_2px_1px_#5b411f66]" fill="none" stroke="#624522" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><rect x="7" y="16" width="50" height="34" rx="5" fill="#fff3d1"/><path d="m9 19 23 18 23-18" strokeWidth="3"/><path d="m10 47 17-15m27 15L37 32" stroke="#b18a4d"/><path d="M40 8h15m-5-5 5 5-5 5" stroke="#28644b" strokeWidth="3"/></svg></button>
   <button disabled={!cartItems.length} onClick={()=>setDesktopCheckoutOpen(true)} title="Osta" className="grid h-[64px] w-[84px] place-items-center rounded-[16px] border-[3px] border-[#9c763b] bg-[linear-gradient(150deg,#fff9df_0%,#f0d59c_52%,#b98d4b_100%)] text-[#543b20] shadow-[inset_0_2px_2px_#ffffffaa,0_5px_0_#8c6a39,0_9px_16px_#46351b44] transition hover:-translate-y-1 hover:brightness-105 active:translate-y-[2px] active:shadow-sm disabled:opacity-40"><svg aria-hidden="true" viewBox="0 0 64 64" className="h-[52px] w-[52px] drop-shadow-[1px_2px_1px_#5b411f66]" fill="none" stroke="#58381b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 26 Q9 13 22 12 H45 Q55 13 55 26 V49 H9Z" fill="#c99b51"/><path d="M11 27 Q12 17 23 16 H44 Q52 17 53 27" fill="#e6c17d"/><rect x="21" y="6" width="26" height="12" rx="3" fill="#a97735"/><rect x="25" y="8" width="18" height="7" rx="1" fill="#fff0b6"/><path d="M29 12h10" stroke="#68451f"/><path d="M12 28H52" strokeWidth="2.5"/><rect x="15" y="32" width="34" height="15" rx="3" fill="#e6bc72"/><g fill="#8b5d2a" stroke="#553617" strokeWidth="1"><circle cx="21" cy="36" r="2.2"/><circle cx="30" cy="36" r="2.2"/><circle cx="39" cy="36" r="2.2"/><circle cx="21" cy="43" r="2.2"/><circle cx="30" cy="43" r="2.2"/><circle cx="39" cy="43" r="2.2"/></g><path d="M8 49h48v9H8z" fill="#91632f"/><rect x="13" y="51" width="38" height="4" rx="1" fill="#dcb878"/><path d="M13 22h38" stroke="#fff0b5" strokeWidth="1.4"/><path d="M9 49h46" stroke="#5a391c" strokeWidth="2.5"/></svg></button>
   <button disabled={!cartItems.length} onClick={()=>{void openDesktopComparison()}} className="rounded-[18px] border-[4px] border-[#548067] bg-gradient-to-b from-[#fff7df] to-[#dfc999] px-8 py-2 font-serif text-[clamp(19px,1.7vw,29px)] font-black italic text-[#24543c] shadow-md disabled:opacity-40">Halpuusvertailu</button>
  </div>
  <button onClick={clearDesktopCart} disabled={!cartItems.length} title="Tyhjennä kori" aria-label="Tyhjennä kori" className="grid h-[56px] w-[60px] place-items-center rounded-[16px] border-2 border-[#a26950] bg-gradient-to-b from-[#fff3dd] to-[#e4c29f] text-[#844632] shadow-[0_4px_0_#ad8063,0_7px_12px_#46351b33] transition hover:-translate-y-1 disabled:opacity-40"><svg aria-hidden="true" viewBox="0 0 32 32" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 9h18M12 9V6h8v3M9 9l1.5 18h11L23 9M14 14v9M18 14v9"/></svg></button>
  <button onClick={()=>setCartOpen(false)} title="Sulje ostoskori" aria-label="Sulje ostoskori" className="grid h-[56px] w-[60px] place-items-center rounded-[16px] border-2 border-[#916b45] bg-gradient-to-b from-[#fff1cf] to-[#c99458] text-[33px] font-black leading-none text-[#58361f] shadow-[0_4px_0_#9c744b,0_7px_12px_#46351b33] transition hover:-translate-y-1">×</button>
  <div className="whitespace-nowrap text-center font-serif text-[clamp(20px,1.6vw,27px)] font-black text-[#174c3a]" aria-label="Ostoskorin yhteishinta">Yhteensä {cartItems.reduce((sum:number,p:any)=>sum+(desktopCartPrice(p.price)||0)*Number(p.quantity||1),0).toFixed(2).replace(".",",")} €{cartItems.some((p:any)=>desktopCartPrice(p.price)==null)&&<div className="text-[11px] font-bold text-[#8b4e35]">Osa ilman hintaa</div>}</div>

 </div>
 </div>
</div>
</div>}
{desktopCheckoutOpen&&<div className="fixed inset-0 z-[140] grid place-items-center bg-[#172e23]/65 p-5"><div className="w-full max-w-[530px] rounded-[25px] border-[3px] border-[#967344] bg-[#fff4d6] p-7 text-center shadow-2xl"><h2 className="font-serif text-[30px] font-black italic text-[#174c3a]">Osta</h2><p className="mt-4 text-[17px] text-[#59482f]">Ostotoiminto ei ole vielä käytettävissä desktop-esikatselussa. Ostoskori säilyy tallessa.</p><button onClick={()=>setDesktopCheckoutOpen(false)} className="mt-6 rounded-full bg-[#315d45] px-7 py-3 font-bold text-white">Takaisin ostoskoriin</button></div></div>}
{desktopCompareNotice&&<div className="fixed inset-0 z-[140] overflow-auto bg-[#172e23]/70 p-3"><div className="mx-auto w-full max-w-[1250px]"><ZiiplyMobileCompareCard
  className="sm:!flex sm:!z-[150]"
  open
  stores={Object.entries(desktopCompareResults).map(([id,result])=>({id,name:String(result.store?.name||"Kauppa"),chain:(["sHyper","sLocal"].includes(storeKind(result.store))?"S":"K") as "S"|"K",totalPrice:Math.round(result.total*100),itemCount:result.rows.length-result.missing,missingItems:result.missing,matches:result.rows.map((row,i)=>({id:String(i),cartItemId:row.cartItemId,name:row.name,quantity:row.quantity,price:row.price==null?null:Math.round(row.price*100),isMissingComparisonItem:row.price==null}))}))}
  loading={desktopCompareLoading}
  title="Halpuusvertailu"
  subtitle={desktopCompareError||"Kauppakohtaiset hinnat ja ostoskorit"}
  onBack={()=>setDesktopCompareNotice(false)}
  onBackToCart={()=>setDesktopCompareNotice(false)}
  onClose={()=>setDesktopCompareNotice(false)}
  onSelectStore={(id)=>{const chosen=desktopCompareResults[id];if(!chosen)return;const byId=new Map(chosen.rows.map(row=>[row.cartItemId,row]));setCartItems(current=>current.map(item=>{const row=byId.get(String(item.id||""));return row?{...item,price:row.price,storeName:String(chosen.store?.name||""),priceNeedsRefresh:row.price==null}:item}));setDesktopCompareNotice(false);setCartOpen(true);flashCartNotice(`Vertailukori valittu: ${String(chosen.store?.name||"kauppa")}`)}}
 /></div></div>}


        {mapOpen && (
          <div className="absolute inset-0 z-[80] grid place-items-center bg-[#17352a]/35 p-10 backdrop-blur-[3px]">
            <div className="w-full max-w-[900px] rounded-[30px] border border-[#6e7d68]/25 bg-[#f8f3e7] p-6 shadow-[0_30px_90px_rgba(20,40,31,.35)]">
              <div className="flex items-center justify-between">
                <div><div className="text-[11px] font-black uppercase tracking-[.15em] text-[#7d745e]">Ziiply · kartta</div><div className="mt-1 text-[27px] font-black text-[#17352a]">{appliedLocation}</div></div>
                <button onClick={() => setMapOpen(false)} className="rounded-full border border-[#6f806a]/25 bg-white px-4 py-2 text-[13px] font-black">Sulje ×</button>
              </div>
              <div className="relative mt-5 grid h-[430px] place-items-center overflow-hidden rounded-[24px] border border-[#7b8b75]/25 bg-[linear-gradient(30deg,#dce8cf_25%,#f1e7c9_25%,#f1e7c9_50%,#d5e3cf_50%,#d5e3cf_75%,#efe1bd_75%)] bg-[length:90px_90px]">
                <div className="text-center"><img src="/icons/ziiply-compass.png" alt="" className="mx-auto h-24 w-24"/><div className="mt-4 text-[18px] font-black text-[#244b38]">Kauppakartta</div><div className="mt-1 text-[13px] font-bold text-[#687267]">Sijainti: {appliedLocation}</div><div className="mt-4 text-[12px] font-bold text-[#7b745f]">Seuraavaksi tähän kytketään Ziiplyn kauppapisteet ja etäisyydet.</div></div>
              </div>
            </div>
          </div>
        )}

        <section data-desktop-card-row className="grid min-h-0 flex-1 items-stretch gap-4 py-5 lg:grid-cols-[minmax(0,0.95fr)_136px_minmax(0,1.05fr)] xl:gap-5">
          <div className="relative max-w-none flex h-full flex-col justify-start self-stretch">
            <div className="relative h-full min-h-0 overflow-visible rounded-[28px] border-[3px] border-[#b38a4a] bg-[#fcf5de] p-4 shadow-[0_5px_0_rgba(105,72,28,.14),inset_0_0_0_2px_rgba(255,255,255,.48)]">
<div className="grid grid-cols-[1fr_46px_1fr] items-center gap-3"><button disabled={storeCompareScope==="within_chain"} onClick={()=>{setStoreMode("hyper");setStoreModeChosen(true);applyModeDefaults("hyper")}} className={`h-[64px] rounded-[17px] border-2 px-3 text-[clamp(15px,1.1vw,19px)] font-black ${storeModeChosen&&storeMode==="hyper"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df] text-[#5a4424]"}`}><span className="inline-flex items-center justify-center gap-2"><svg aria-hidden="true" viewBox="0 0 64 64" className="h-11 w-11 shrink-0 drop-shadow-[1px_2px_1px_#70513755]" fill="none" strokeLinejoin="round"><path d="M8 55V19L32 7l24 12v36Z" fill="#d8b57b" stroke="#684a2d" strokeWidth="3"/><path d="M14 23h36v32H14Z" fill="#f7e8c8" stroke="#88643e" strokeWidth="2"/><path d="M8 19 32 7l24 12" stroke="#9e6b43" strokeWidth="5"/><path d="M25 12h14v11H25Z" fill="#b78854"/><path d="M20 28h9v10h-9zm15 0h9v10h-9zm-15 15h9v10h-9zm15 0h9v10h-9z" fill="#8db9b0" stroke="#526d67" strokeWidth="1.5"/><path d="M5 56h54" stroke="#684a2d" strokeWidth="4"/><path d="M16 23h32" stroke="#c79660" strokeWidth="2"/></svg><span>Tavaratalot</span></span></button><div className="flex flex-col items-center justify-center gap-1"><span title="Yksi kauppa" className="flex h-7 items-center justify-center"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18l-1.5-6h-15L3 10Z"/><path d="M5 10v11h14V10M9 21v-7h6v7M3 10c0 2 3 3 4.5 0 1.5 3 4.5 3 4.5 0 1.5 3 4.5 3 4.5 0"/></svg></span><button type="button" aria-label="Vaihda yhden ja monen kaupan välillä" aria-pressed={betweenMode==="many"} onClick={()=>{if(betweenMode==="many"&&Object.keys(selectedStores).length>1)setSelectedStores({});setBetweenMode(v=>v==="one"?"many":"one")}} className={`relative mx-auto h-[36px] w-[22px] shrink-0 rounded-full ${betweenMode==="many"?"bg-[#0a6d39]":"bg-[#d8c69d]"}`}><span className={`absolute left-[2px] h-[15px] w-[15px] rounded-full bg-white ${betweenMode==="many"?"top-[19px]":"top-[2px]"}`}/></button><span title="Monta kauppaa" className="flex h-7 items-center justify-center gap-[1px]"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18l-1.5-6h-15L3 10Z"/><path d="M5 10v11h14V10M9 21v-7h6v7M3 10c0 2 3 3 4.5 0 1.5 3 4.5 3 4.5 0 1.5 3 4.5 3 4.5 0"/></svg><svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18l-1.5-6h-15L3 10Z"/><path d="M5 10v11h14V10M9 21v-7h6v7M3 10c0 2 3 3 4.5 0 1.5 3 4.5 3 4.5 0 1.5 3 4.5 3 4.5 0"/></svg><svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h18l-1.5-6h-15L3 10Z"/><path d="M5 10v11h14V10M9 21v-7h6v7M3 10c0 2 3 3 4.5 0 1.5 3 4.5 3 4.5 0 1.5 3 4.5 3 4.5 0"/></svg></span></div><button disabled={storeCompareScope==="within_chain"} onClick={()=>{setStoreMode("local");setStoreModeChosen(true);applyModeDefaults("local")}} className={`h-[58px] rounded-[17px] border-2 px-3 text-[clamp(15px,1.1vw,19px)] font-black ${storeModeChosen&&storeMode==="local"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df] text-[#5a4424]"}`}><span className="inline-flex items-center justify-center gap-2"><svg aria-hidden="true" viewBox="0 0 64 64" className="h-11 w-11 shrink-0 drop-shadow-[1px_2px_1px_#70513755]" fill="none" strokeLinejoin="round"><path d="M10 26h44v30H10Z" fill="#e9c994" stroke="#745039" strokeWidth="3"/><path d="M7 26 14 12h36l7 14Z" fill="#b96e52" stroke="#745039" strokeWidth="3"/><path d="M11 26h42v10H11Z" fill="#f9e8ce"/><path d="M19 26v10m13-10v10m13-10v10" stroke="#bd7657" strokeWidth="5"/><path d="M17 41h17v15H17Z" fill="#90b5a7" stroke="#70543e" strokeWidth="2"/><path d="M40 41h9v9h-9Z" fill="#9dc5b7" stroke="#70543e" strokeWidth="2"/><path d="M6 57h52" stroke="#745039" strokeWidth="4"/><path d="M16 12h32" stroke="#e3b37a" strokeWidth="2"/></svg><span>Lähikaupat</span></span></button></div>
<div className="my-1 text-center text-[14px] font-black uppercase tracking-[.14em] text-[#66543a]">Hakutapa</div><div className="grid grid-cols-[1fr_46px_1fr] gap-3"><button onClick={()=>{setStoreCompareScope("between_chains");setWithinChain(null)}} className={`h-[52px] rounded-[17px] border-2 px-3 text-[clamp(14px,1vw,18px)] font-black ${storeCompareScope==="between_chains"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df]"}`}>Ketjujen väliltä</button><div aria-hidden /><button onClick={()=>{setStoreCompareScope("within_chain");setWithinChain(null);setStoreModeChosen(false)}} className={`h-[52px] rounded-[17px] border-2 px-3 text-[clamp(14px,1vw,18px)] font-black ${storeCompareScope==="within_chain"?"border-[#07502c] bg-[#0a6d39] text-white":"border-[#d2ad68] bg-[#fff8df]"}`}>Ketjun sisältä</button></div>
<div className="mt-4 grid grid-cols-2 gap-4">{["S","K","LIDL","SPAR"].map(chain=>{const pool=chain==="LIDL"?lidlStores:chain==="SPAR"?sparStores:stores;const matches=byDistance(pool.filter((s:any)=>{const k=storeKind(s);return chain==="S"?(k==="sHyper"||k==="sLocal"):chain==="K"?(k==="kHyper"||k==="kLocal"):chain==="LIDL"?k==="lidl":k==="spar"}));const candidate=matches.find((s:any)=>{const k=storeKind(s);return chain==="S"?k===(storeMode==="hyper"?"sHyper":"sLocal"):chain==="K"?k===(storeMode==="hyper"?"kHyper":"kLocal"):chain==="LIDL"?k==="lidl":k==="spar"});const manuallySelected=Object.values(selectedStores).find((s:any)=>{const k=storeKind(s);return chain==="S"?(k==="sHyper"||k==="sLocal"):chain==="K"?(k==="kHyper"||k==="kLocal"):chain==="LIDL"?k==="lidl":k==="spar"});const store=manuallySelected||candidate||null;const selected=Boolean(store&&selectedStores[String(store.id)]);const bg=chain==="S"?(storeMode==="hyper"?"/ui/store-backgrounds/store-bg-prisma-v3.svg":"/ui/store-backgrounds/store-bg-alepa-v3.svg"):chain==="K"?(storeMode==="hyper"?"/ui/store-backgrounds/store-bg-kcitymarket-v3.svg":"/ui/store-backgrounds/store-bg-kmarket-v3.svg"):chain==="LIDL"?"/ui/store-backgrounds/store-bg-lidl-v3.svg":"/ui/store-backgrounds/store-bg-spar-v3.svg";const logo=chain==="S"?"/storelogos/s-group.png":chain==="K"?"/storelogos/k-group.png":chain==="LIDL"?"/storelogos/lidl.png":"/storelogos/spar.png";return <button key={chain} onClick={()=>{if(!store)return;setSelectedStores(prev=>{const key=String(store.id);if(betweenMode==="one")return {[key]:store};const next={...prev};if(next[key])delete next[key];else next[key]=store;return next})}} className={`relative h-[155px] overflow-visible rounded-[20px] border-[2.5px] text-center shadow-[0_5px_10px_rgba(52,38,14,.08),inset_0_0_0_1px_rgba(255,255,255,.9)] ${selected?"border-[#5c7858] bg-[#edf0d2]":"border-[#d9c18e] bg-[#fffaf0]"}`}><img src={bg} alt="" className="pointer-events-none absolute bottom-[-34px] left-[-20px] h-[172px] w-[calc(100%+40px)] object-cover object-bottom opacity-60"/><span className="absolute left-2 top-2 z-20 block h-12 w-14 overflow-hidden rounded-lg border border-[#b89552] bg-[#fffef9]/90">{chain==="SPAR"?<img src={logo} alt={chain} className="absolute block h-[44px] w-[44px] max-w-none object-contain" style={{left:"2.25px",top:"-1px"}}/>:<img src={logo} alt={chain} className="absolute left-1/2 top-1/2 block h-10 w-10 max-w-none object-contain" style={{transform:`translate(-50%, -50%) translate(${chain==="LIDL"?"-1px":"0px"}, ${chain==="LIDL"?"-2px":chain==="K"?"-1px":"0px"}) scale(${chain==="S"?1.12:chain==="K"?1.14:1.1})`,transformOrigin:"center center"}}/>}</span><span className={`absolute right-2 top-2 z-20 grid h-9 w-9 place-items-center rounded-full border font-black ${selected?"border-[#536d4f] bg-[#648060] text-white":"border-[#d0ad68] bg-[#fff8dc] text-transparent"}`}>✓</span><span className="absolute left-3 right-3 top-[56px] z-20 block text-[clamp(16px,1.12vw,21px)] leading-tight font-black text-[#171713]">{store?.name||`${chain} ei löytynyt`}</span>{store&&Number.isFinite(distanceKm(store))?<span className="absolute left-3 right-3 bottom-[43px] z-20 block text-[14px] font-black text-[#667064]">{distanceKm(store).toFixed(1)} km</span>:null}<span onClick={(e)=>{e.stopPropagation();setPickerChain(pickerChain===chain?null:chain as any)}} className="absolute bottom-2 left-1/2 z-30 -translate-x-1/2 rounded-full border border-[#d4c18e] bg-white/95 px-5 py-1 text-[15px] font-black">{selected?"Valittu":"Vaihda"}</span>{pickerChain===chain&&<span onClick={(e)=>e.stopPropagation()} className="absolute left-2 right-2 top-[145px] z-50 max-h-[210px] overflow-auto rounded-[16px] border-2 border-[#b89552] bg-[#fffaf0] p-2 text-left shadow-2xl">{byDistance((chain==="LIDL"?lidlStores:chain==="SPAR"?sparStores:stores).filter((s:any)=>{const k=storeKind(s);return chain==="S"?k===(storeMode==="hyper"?"sHyper":"sLocal"):chain==="K"?k===(storeMode==="hyper"?"kHyper":"kLocal"):chain==="LIDL"?k==="lidl":k==="spar"})).map((s:any)=><span key={String(s.id)} onClick={()=>{setSelectedStores(prev=>{const next:any={};for(const [id,x] of Object.entries(prev)){const k=storeKind(x);if(chain==="S"?(k!=="sHyper"&&k!=="sLocal"):chain==="K"?(k!=="kHyper"&&k!=="kLocal"):chain==="LIDL"?k!=="lidl":k!=="spar")next[id]=x}next[String(s.id)]=s;return next});setPickerChain(null)}} className="block cursor-pointer rounded-xl px-3 py-2 text-[15px] font-black hover:bg-[#e9f2dd]">{s.name}{Number.isFinite(distanceKm(s))?<small className="ml-2 font-bold text-[#6d7468]">{distanceKm(s).toFixed(1)} km</small>:null}</span>)}</span>}</button>})}</div>
</div>
                      </div>

          <nav aria-label="Ostokset ja vertailu" className="relative z-20 flex flex-col h-full min-h-0 items-stretch justify-between gap-4 py-1">
            <button type="button" onClick={()=>setNotebookOpen(true)} className="relative flex h-[clamp(112px,16vh,154px)] min-h-0 flex-col items-center justify-center rounded-[25px] border-[3px] border-[#8d663f] bg-gradient-to-b from-[#fff2c8] to-[#d8b77b] p-2 text-[#51391f] shadow-[0_8px_0_#987c50,0_16px_26px_#5e4c2929] transition hover:-translate-y-1"><span className="text-[52px] drop-shadow-md">📜</span><span className="text-[14px] font-black">Ostelusvihko</span>{savedLists.length>0&&<span className="absolute right-2 top-2 rounded-full bg-[#79552d] px-2 py-1 text-[11px] font-black text-white">{savedLists.length}</span>}</button>
            <button type="button" onClick={()=>setCartOpen(true)} className="group relative flex h-[clamp(112px,16vh,154px)] min-h-0 flex-col items-center justify-center rounded-[25px] border-[3px] border-[#4b815e] bg-gradient-to-b from-[#f0ffe4] to-[#b9ddb2] p-2 text-[#174c35] shadow-[0_8px_0_#6d9270,0_16px_26px_#254d3529] transition hover:-translate-y-1"><svg aria-hidden="true" viewBox="0 0 96 80" className="h-[65px] w-[83px] drop-shadow-[1px_3px_2px_#36563b55]" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M24 31C27 9 69 9 72 31" stroke="#86532e" strokeWidth="6"/><path d="M24 31C27 9 69 9 72 31" stroke="#d6a66a" strokeWidth="2.5"/><path d="M12 33h72l-9 36c-1 4-5 6-10 6H31c-5 0-9-2-10-6L12 33Z" fill="#bb8650" stroke="#704829" strokeWidth="3"/><path d="M17 39h62M20 50h56M23 61h50" stroke="#e4bb7d" strokeWidth="4"/><path d="m22 34 10 38m1-38 7 39m8-39v40m8-40-7 39m18-39-10 38m17-38-10 36" stroke="#7b522e" strokeWidth="3"/><path d="M12 33h72" stroke="#684329" strokeWidth="6"/><path d="M16 34h64" stroke="#e4b77d" strokeWidth="2"/></svg><span className="text-[14px] font-black">Kori</span>{desktopCartCount>0&&<span className="absolute right-2 top-2 rounded-full bg-[#147a49] px-2 py-1 text-[11px] font-black text-white">{desktopCartCount}</span>}</button>
            <button type="button" onClick={()=>setWorkspace("justiina")} className="flex h-[clamp(112px,16vh,154px)] min-h-0 flex-col items-center justify-center rounded-[25px] border-[3px] border-[#c39b50] bg-gradient-to-b from-[#fff8df] to-[#eed49c] p-2 text-[#59411f] shadow-[0_8px_0_#b49a68,0_16px_26px_#5e4c2929] transition hover:-translate-y-1"><svg aria-hidden="true" viewBox="0 0 104 88" className="h-[68px] w-[83px] drop-shadow-[1px_3px_2px_#70533b55]" fill="none" strokeLinejoin="round" strokeLinecap="round"><path d="M31 14Q52 3 73 14L81 49Q52 60 23 49Z" fill="#32617a" stroke="#233e4b" strokeWidth="4"/><path d="M31 16Q52 7 73 16L75 35Q52 41 29 35Z" fill="#eee0b8" stroke="#9c7d5b" strokeWidth="2"/><path d="M34 29Q52 19 70 29" stroke="#8b7355" strokeWidth="1.5"/><path d="M52 35 65 24" stroke="#b34836" strokeWidth="2.5"/><circle cx="52" cy="35" r="2.5" fill="#b34836"/><path d="M30 17h4m35 0h4M25 45l5 2m44 0 5-2" stroke="#b96e49" strokeWidth="3"/><path d="M12 60h80l-6 13H18Z" fill="#32536a" stroke="#253e4a" strokeWidth="3"/><path d="M4 51h31l-4 11H8Z" fill="#b7aaa0" stroke="#655c55" strokeWidth="2"/><path d="M69 51h31l-4 11H73Z" fill="#b7aaa0" stroke="#655c55" strokeWidth="2"/><path d="M12 49h16m48 0h16" stroke="#6d6056" strokeWidth="3"/><path d="M23 73v5m58-5v5" stroke="#3b3633" strokeWidth="5"/><path d="M33 13Q52 6 71 13" stroke="#c76f56" strokeWidth="2" strokeDasharray="4 5"/></svg><span className="text-[13px] font-black">Vertailu</span></button>
          </nav>
          <div className="relative max-h-[calc(100dvh-150px)] rounded-[42px] border border-[#756443]/15 bg-[#f8f5ed]/92 p-3 shadow-[0_34px_90px_rgba(34,54,43,0.22)] ring-1 ring-[#fffaf0]/95 xl:p-4">
            <DesktopAssistantCards
              active={active}
              hasSelectedStores={Object.values(selectedStores).some(Boolean)}
              chooseStoresNoticeFor={chooseStoresNoticeFor}
              onSelect={(key) => {
                if((key==="gosta" || key==="justiina") && !Object.values(selectedStores).some(Boolean)){
                  setChooseStoresNoticeFor(key);
                  setGostaChainPicker(false);
                  setWorkspace(null);
                  return;
                }
                setChooseStoresNoticeFor(null);
                setActive(key);
                if(key==="gosta"){setWorkspace(null);setGostaChainPicker(true)}
                else{setGostaChainPicker(false);setWorkspace(key)}
              }}
            />

            {gostaChainPicker && <div className="fixed bottom-0 left-0 right-0 top-[112px] z-[49] bg-[#e8eadf]/95" onClick={e=>e.stopPropagation()} />}
            {gostaChainPicker && (()=>{const chainOf=(s:any)=>{const k=storeKind(s);const raw=String(s?.chain||s?.type||s?.brand||s?.name||"").toLowerCase();if(k==="spar"||raw.includes("tokmanni")||raw.includes("spar"))return "SPAR";if(k==="lidl"||raw.includes("lidl"))return "LIDL";if(k.startsWith("s"))return "S";if(k.startsWith("k"))return "K";return ""};const selectedByChain=new Map<string,any>();Object.values(selectedStores).forEach((s:any)=>selectedByChain.set(chainOf(s),s));const order=["S","K","SPAR","LIDL"];const visible=order.map(ch=>selectedByChain.get(ch)).filter(Boolean) as any[];const meta:any={S:["/storelogos/s-group.png","S-ryhmä"],K:["/storelogos/k-group.png","K-ryhmä"],SPAR:["/storelogos/spar.png","Tokmanni / Spar"],LIDL:["/storelogos/lidl.png","Lidl"]};return <div className="fixed bottom-[24px] left-1/2 top-[128px] z-50 flex w-[min(1040px,calc(100vw-48px))] -translate-x-1/2 flex-col overflow-hidden rounded-[28px] border-[3px] border-[#5a321b] bg-[#efe0bd] p-4 shadow-[0_28px_80px_rgba(34,54,43,.28)]"><div className="relative rounded-[20px] border-2 border-[#caa15d] bg-[#f7e7bd] px-4 py-2.5 text-center"><div className="font-serif text-[22px] font-black italic text-[#174c35]">Tarjous- ja kampanjahaku</div></div><div className="mx-auto mt-3 flex min-h-0 w-full flex-1 flex-col rounded-[22px] border-2 border-[#b58a46] bg-[#fff4cf] p-4"><div className="text-center font-serif text-[23px] font-black italic text-[#174c35]">Valitse kaupparyhmä</div><div className="mt-1 text-center text-[13px] font-black text-[#6d604c]">Mistä kaupparyhmästä haetaan tarjoukset?</div><div className="mx-auto mt-3 grid min-h-0 w-full max-w-[860px] flex-1 grid-cols-2 gap-3">{visible.map((store:any)=>{const ch=chainOf(store);const m=meta[ch];const offerChain:any=ch==="SPAR"?(String(store?.chain||"").toUpperCase()==="EUROSPAR"?"EUROSPAR":"TOKMANNI"):ch;return <button key={ch} onClick={()=>void openDesktopGostaChain(offerChain,store)} className="grid min-h-0 place-items-center rounded-[20px] border-[3px] border-[#17573c] bg-[#fff8d9] p-3 shadow-[0_7px_0_rgba(72,73,48,.18)]"><img src={m[0]} alt="" className="h-[116px] w-[164px] max-w-full object-contain"/><div className="mt-1 text-[16px] font-black text-[#17573c]">{m[1]}</div></button>})}</div>{visible.length===0&&<div className="m-auto rounded-[20px] border-2 border-[#b58a46] bg-[#fff9e7] p-6 text-center text-[15px] font-black">Valitse ensin kauppaketju pääruudulta.</div>}</div></div>})()}

            {gostaChain && <div className="fixed bottom-0 left-0 right-0 top-[112px] z-[49] bg-[#e8eadf]/95" onClick={e=>e.stopPropagation()} />}
            {gostaChain && (()=>{const campaigns=gostaOffers.filter((x:any)=>x.campaignType==="campaign");const offers=gostaOffers.filter((x:any)=>x.campaignType!=="campaign");const showCampaigns=campaigns.length>0;const source=gostaTab==="campaigns"?campaigns:offers;const cats=Array.from(new Set(source.map((x:any)=>String(x.category||"Muu")).filter(Boolean)));const visible=gostaCategory?source.filter((x:any)=>String(x.category||"Muu")===gostaCategory):[];return <div className="fixed bottom-[24px] left-[24px] right-[24px] top-[128px] z-50 flex flex-col overflow-hidden rounded-[28px] border-[3px] border-[#5a321b] bg-[#efe0bd] p-4 shadow-[0_28px_80px_rgba(34,54,43,.28)]"><div className="relative mx-auto flex h-[48px] w-[min(100%,410px)] shrink-0 items-center justify-center rounded-[20px] border-2 border-[#caa15d] bg-[#f7e7bd] px-2"><button type="button" onClick={()=>{setGostaChain(null);setGostaCategory("")}} aria-label="Sulje Göstan tarjousnäkymä" title="Sulje" className="absolute left-1/2 top-[3px] z-30 grid h-3 w-3 -translate-x-1/2 place-items-center rounded-full border-2 border-[#17573c] bg-[#fff4cf] text-[10px] font-black leading-none text-[#17573c] shadow-[0_2px_5px_#634a2a30] hover:bg-[#e2edcf]">×</button><div className="flex h-full min-w-0 items-center justify-center">{gostaCategory?<div className="flex min-w-0 items-center justify-center gap-12 border-0 bg-transparent shadow-none"><button type="button" onClick={()=>setGostaCategory("")} aria-label="Takaisin kategorioihin" title="Takaisin kategorioihin" className="grid h-8 w-8 place-items-center rounded-full border-[3px] border-[#17573c] bg-[#fff9dd] text-[18px] font-black text-[#174c35] shadow-sm">←</button><span role="img" title={gostaCategory} aria-label={gostaCategory} className="grid h-8 w-8 place-items-center rounded-[14px] border-2 border-[#c9aa6c] bg-gradient-to-br from-[#fffdf0] to-[#e5c78d] text-[20px] shadow-sm">{String(gostaCategory).toLowerCase().includes("kahvi")?"☕":String(gostaCategory).toLowerCase().includes("maito")?"🥛":String(gostaCategory).toLowerCase().includes("kala")?"🐟":String(gostaCategory).toLowerCase().includes("leip")?"🥐":String(gostaCategory).toLowerCase().includes("hevi")?"🍎":String(gostaCategory).toLowerCase().includes("juoma")?"🥤":String(gostaCategory).toLowerCase().includes("valmis")?"🍽️":String(gostaCategory).toLowerCase().includes("kuiva")?"🥣":String(gostaCategory).toLowerCase().includes("make")?"🍬":String(gostaCategory).toLowerCase().includes("lasten")?"🏷️":String(gostaCategory).toLowerCase().includes("lemm")?"🐾":String(gostaCategory).toLowerCase().includes("hyg")?"🧴":String(gostaCategory).toLowerCase().includes("koti")?"🏠":"🏷️"}</span><button type="button" onClick={()=>setCartOpen(true)} className="rounded-full border-2 border-[#17573c] bg-[#e2edcf] px-2 py-0.5 text-[11px] font-black text-[#174c35] shadow-sm">🛒 Ostoskori</button></div>:<div className="flex min-w-0 items-center justify-center gap-2">{!gostaLoading&&<button onClick={()=>{setGostaTab("offers");setGostaCategory("")}} className={`shrink-0 rounded-full border-2 px-1.5 py-1 text-[11px] font-black ${gostaTab==="offers"?"border-[#17573c] bg-[#17573c] text-white":"border-[#b58a46] bg-[#fff4cf] text-[#174c35]"}`}>Tarjoukset</button>}{!gostaCategory&&<div className="shrink-0 whitespace-nowrap text-center font-serif text-[clamp(11px,0.75vw,13px)] font-black italic text-[#174c35]">Tarjous- ja kampanjahaku</div>}{!gostaLoading&&showCampaigns&&<button onClick={()=>{setGostaTab("campaigns");setGostaCategory("")}} className={`shrink-0 rounded-full border-2 px-1.5 py-1 text-[11px] font-black ${gostaTab==="campaigns"?"border-[#17573c] bg-[#17573c] text-white":"border-[#b58a46] bg-[#fff4cf] text-[#174c35]"}`}>Kampanjat</button>}</div>}</div></div><div className={`mt-3 min-h-0 flex-1 overflow-y-auto rounded-[22px] border-2 border-[#b58a46] bg-[#fff4cf] p-4 ${gostaCategory?"invisible pointer-events-none":""}`}><div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">{cats.map((cat:any)=>{const count=source.filter((x:any)=>String(x.category||"Muu")===cat).length;const icon=String(cat).toLowerCase().includes("kahvi")?"☕":String(cat).toLowerCase().includes("maito")?"🥛":String(cat).toLowerCase().includes("kala")?"🐟":String(cat).toLowerCase().includes("leip")?"🥐":String(cat).toLowerCase().includes("hevi")?"🍎":String(cat).toLowerCase().includes("juoma")?"🥤":String(cat).toLowerCase().includes("valmis")?"🍽️":String(cat).toLowerCase().includes("kuiva")?"🥣":String(cat).toLowerCase().includes("make")?"🍬":String(cat).toLowerCase().includes("lasten")?"🏷️":String(cat).toLowerCase().includes("lemm")?"🐾":String(cat).toLowerCase().includes("hyg")?"🧴":String(cat).toLowerCase().includes("koti")?"🏠":"🏷️";return <button key={cat} onClick={()=>setGostaCategory(cat)} className="group flex min-h-[94px] items-center gap-4 rounded-[20px] border-[3px] border-[#17573c] bg-[#fff9dd] px-5 py-3 text-left text-[#174c35] shadow-[0_4px_0_rgba(72,73,48,.12)] transition hover:-translate-y-0.5 hover:bg-[#f1f0c9]"><span aria-hidden="true" className="grid h-[64px] w-[64px] shrink-0 place-items-center rounded-[19px] border-2 border-[#c9aa6c] bg-gradient-to-br from-[#fffdf0] via-[#f7e6b8] to-[#e5c78d] text-[39px] leading-none shadow-[0_5px_0_#b8a074,0_9px_16px_rgba(72,55,27,.16),inset_0_2px_3px_rgba(255,255,255,.9)] transition-transform group-hover:scale-105">{icon}</span><span className="min-w-0 flex-1 text-[15px] font-black leading-tight">{cat} <span className="whitespace-nowrap">({count})</span></span></button>})}</div></div>{gostaCategory&&<><div className="absolute inset-x-4 bottom-4 top-[76px] z-10 overflow-y-auto rounded-[22px] border-2 border-[#b58a46] bg-[#fff4cf] p-4 shadow-[0_12px_35px_rgba(34,54,43,.18)]">{gostaLoading?<div className="grid h-full place-items-center text-[16px] font-black text-[#174c35]">Haetaan tarjouksia…</div>:visible.length===0?<div className="grid h-full place-items-center text-[15px] font-black text-[#6d604c]">Ei tuloksia.</div>:<div className="grid grid-cols-2 gap-3 xl:grid-cols-3">{visible.map((p:any,i:number)=><div key={String(p.id||i)} className="grid min-h-[230px] grid-cols-[minmax(108px,35%)_minmax(0,1fr)] gap-4 rounded-[24px] border-[3px] border-[#a99a75] bg-[#fff3d5] p-4 shadow-[0_5px_0_rgba(72,73,48,.12)]">
<div className="flex min-w-0 flex-col gap-3">
  <div className="grid min-h-[125px] flex-1 place-items-center rounded-[18px] border-2 border-[#9a713a] bg-[#fffdf5] p-2 shadow-[0_3px_5px_rgba(55,37,18,.15)]">{p.pictureUrl?<img src={p.pictureUrl} alt="" className="max-h-[142px] w-full object-contain" loading="lazy"/>:<span className="text-[38px]">🛍️</span>}</div>
  <button type="button" onClick={()=>addDesktopCartItem(p)} aria-label="Lisää ostoskoriin" className="relative flex min-h-[76px] w-full cursor-pointer flex-col items-center justify-center rounded-[18px] border-[3px] border-[#477350] bg-[#e2edcf] px-2 py-2 text-center text-[#126a39] hover:bg-[#d3e9bc] focus-visible:outline focus-visible:outline-4 focus-visible:outline-[#17573c]">
    <div className="font-serif text-[clamp(18px,1.5vw,27px)] font-black leading-tight">{p.price!=null?String(p.price).replace(".",",")+(typeof p.price==="number"?" €":""):"—"}</div>
    <span className="mt-1 text-[12px] font-black text-[#264e32]">🛒 Lisää koriin</span>
    {cartIncrementKey===desktopCartKey(p)&&<span className="absolute -right-2 -top-2 grid h-8 min-w-8 place-items-center rounded-full bg-[#08a36d] px-2 text-[13px] font-black text-white shadow-lg">+1</span>}
  </button>
</div>
<div className="min-w-0 self-start py-1">
  <div className="text-[clamp(15px,1.2vw,21px)] font-black leading-snug text-[#26352b]">{p.title||p.name}</div>
  <div className="mt-3 text-[11px] font-black uppercase tracking-wide text-[#6f735b]">{p.storeName||""} <span className="ml-1 rounded-full bg-[#e3e5c9] px-2 py-1 text-[#27583d]">{p.category||""}</span></div>
  {p.ean&&<div className="mt-2 text-[11px] font-bold text-[#82745a]">EAN {p.ean}</div>}
  {p.unitPrice&&<div className="mt-2 text-[12px] font-bold text-[#82745a]">{p.unitPrice}</div>}
  {p.discountText&&<div className="mt-3 font-serif text-[13px] font-bold italic text-[#796b4d]">{p.discountText}</div>}
  {(p.validUntil||p.validityText)&&<div className="mt-2 text-[12px] font-bold text-[#796b4d]">{p.validityText||("Voimassa "+p.validUntil)}</div>}
</div>
</div>)}</div>}</div></>}</div>})()}

            {workspace==="justiina" && justiinaResultsOpen && <div className="fixed inset-x-6 bottom-6 top-[127px] z-[65] flex flex-col overflow-hidden rounded-[28px] border-[3px] border-[#5a321b] bg-[#efe0bd] p-4 shadow-[0_28px_80px_rgba(34,54,43,.28)]"><div className="relative mx-auto flex h-[58px] w-[min(100%,620px)] shrink-0 items-center justify-center gap-3 rounded-[20px] border-2 border-[#caa15d] bg-[#f7e7bd] px-3"><button type="button" onClick={()=>{justiinaUserEditedRef.current=false;if(justiinaAddedDuringSelectionRef.current){setJustiinaResults([]);setJustiinaMessage("");setJustiinaQuery("");justiinaLastSearchedRef.current="";justiinaAddedDuringSelectionRef.current=false}setJustiinaResultsOpen(false)}} aria-label="Takaisin hakuun" className="rounded-full border-[3px] border-[#17573c] bg-[#fff9dd] px-3 py-1 text-[22px] font-black text-[#174c35]">←</button><span className="font-serif text-[21px] font-black italic text-[#174c35]">Tuotevalinta · {justiinaQuery}</span><button type="button" onClick={()=>{setJustiinaResultsOpen(false);setWorkspace(null)}} aria-label="Sulje tuotevalinta" className="rounded-full border-2 border-[#17573c] bg-[#fff9dd] px-2 font-black text-[#174c35]">×</button></div><div className="mt-3 min-h-0 flex-1 overflow-y-auto rounded-[22px] border-2 border-[#b58a46] bg-[#fff4cf] p-4"><div className="grid grid-cols-2 gap-3 xl:grid-cols-3">{justiinaResults.map((p:any,i:number)=><div key={String(p.id||p.ean||i)} className="grid min-h-[230px] grid-cols-[minmax(108px,35%)_minmax(0,1fr)] gap-4 rounded-[24px] border-[3px] border-[#a99a75] bg-[#fff3d5] p-4"><div className="flex min-w-0 flex-col gap-3"><div className="grid min-h-[125px] flex-1 place-items-center rounded-[18px] border-2 border-[#9a713a] bg-[#fffdf5] p-2">{(p.pictureUrl||p.imageUrl||p.image)?<img src={p.pictureUrl||p.imageUrl||p.image} alt="" className="max-h-[142px] w-full object-contain" loading="lazy"/>:<span className="text-[38px]">🛍️</span>}</div><button type="button" onClick={()=>{addDesktopCartItem({...p,source:"justiina",title:p.name||p.title||p.productName,price:p.__price,storeName:p.__store});justiinaAddedDuringSelectionRef.current=true}} className="flex min-h-[76px] w-full flex-col items-center justify-center rounded-[18px] border-[3px] border-[#477350] bg-[#e2edcf] px-2 py-2 text-[#126a39]"><span className="font-serif text-[25px] font-black">{p.__price!=null?Number(p.__price).toFixed(2).replace(".",",")+" €":"—"}</span><span className="text-[12px] font-black">🛒 Lisää koriin</span></button></div><div className="min-w-0 py-1"><div className="text-[clamp(15px,1.2vw,21px)] font-black leading-snug text-[#26352b]">{p.name||p.title||p.productName}</div><div className="mt-3 text-[11px] font-black uppercase text-[#6f735b]">{p.__store||p.storeName||""}</div>{p.ean&&<div className="mt-2 text-[11px] font-bold text-[#82745a]">EAN {p.ean}</div>}{p.unitPrice&&<div className="mt-2 text-[12px] font-bold text-[#82745a]">{p.unitPrice}</div>}</div></div>)}</div></div></div>}
            {workspace==="justiina" && !justiinaResultsOpen && <DesktopJustiinaSearchCard onOpenScanner={()=>{setDesktopScannerEan("");setDesktopScannerMessage("");setDesktopScannerCameraOn(false);setDesktopScannerOpen(true)}} onClose={()=>setWorkspace(null)} onOpenCart={()=>setCartOpen(true)} query={justiinaQuery} onQueryChange={(value)=>{justiinaUserEditedRef.current=true;justiinaSuppressedTermsRef.current.delete(value.trim().toLowerCase());setJustiinaQuery(value);if(!value.trim()){justiinaLastSearchedRef.current="";setJustiinaResults([]);setJustiinaMessage("")}}} loading={justiinaLoading} onSearch={()=>{void runDesktopJustiinaSearch()}} message={justiinaMessage} results={justiinaResults} delay={justiinaDelay} onDelayChange={()=>setJustiinaDelay(v=>v===2?1:v===1?0:2)} onAddToCart={(p)=>addDesktopCartItem({...p,source:"justiina",title:p.name||p.title||p.productName,price:p.__price})} onReopenResults={()=>{if(justiinaResults.length>0){justiinaUserEditedRef.current=false;setJustiinaResultsOpen(true)}}} onAddInputToCart={(text)=>{justiinaUserEditedRef.current=false;justiinaSuppressedTermsRef.current.add(text.trim().toLowerCase());text.split(/[,\.\n]+/).map(x=>x.trim()).filter(Boolean).forEach(title=>addDesktopCartItem({title,name:title,source:"justiina",price:0,quantity:1}));}} />}
            {workspace && workspace!=="justiina" && (
              <div className="absolute inset-5 z-40 flex flex-col rounded-[32px] border border-[#756443]/20 bg-[#f8f5ed]/[0.99] p-6 shadow-[0_28px_80px_rgba(34,54,43,.28)] xl:inset-8">
                <div className="flex items-center justify-between"><div className="text-[26px] font-black text-[#14291f]">{({ gosta: "Gösta", justiina: "Justiina", arvo: "Arvo" } as const)[workspace]}</div><button onClick={()=>setWorkspace(null)} className="rounded-full bg-white px-4 py-2 font-black">← Takaisin</button></div>
              </div>
            )}

          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-[#64745f]/15 pt-3 text-[12px] font-bold text-[#747d6e]">
          <span>Ziiply Oy</span>
          <span>One search. All prices. · {scannerMode === "camera" ? "📷 Tablet-skannaus valmis" : scannerMode === "external" ? "⌨ HID/EAN-lukija valmis" : "Skanneria tarkistetaan…"}</span>
        </footer>
      </div>
    </main>
  );
}
