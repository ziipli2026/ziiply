"use client";

import React, { useEffect, useRef, useState } from "react";
import ZiiplyMobileScannerCard from "../cards/ZiiplyMobileScannerCard";
import posthog from "posthog-js";
import {arvoNutrientValues, saveArvoMeal} from "./arvoStatistics";

/**
 * Arvon ravintoskannerin ensimmäinen käyttöliittymäversio.
 * Käyttää samaa kameranäkymäkomponenttia kuin tavallinen skanneri.
 * EAN-tunnistus, ravintohaku ja päiväkirjaan tallennus kytketään myöhemmin.
 */
export type ArvoCartProduct = { ean: string; name: string; grams: number; nutrition: Record<string, unknown> | null };
export default function ArvoNutritionScannerPreview({ onClose, onAddToCart }: { onClose?: () => void; onAddToCart?: (product: ArvoCartProduct) => void | Promise<void> } = {}) {
  const [open, setOpen] = useState(true);
  const [ean, setEan] = useState("");
  const [productName, setProductName] = useState("");
  const [nutrition, setNutrition] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState("");
  const [torch, setTorch] = useState(false);
  const [mealSaved, setMealSaved] = useState(false);
  const [cartSaving, setCartSaving] = useState(false);
  const [cartSaved, setCartSaved] = useState(false);
  const cameraRef = useRef<MediaStream | null>(null);
  const trackEvent = (event: string) => { try { if (posthog.__loaded) posthog.capture(event); } catch {} };
  useEffect(() => { trackEvent("arvo_scanner_opened"); }, []);
  const lastEanRef = useRef("");
  const regionId = "arvo-nutrition-scanner-camera";
  useEffect(() => {
    if (!open) return;
    let disposed = false;
    let scanner: any = null;
    const onDecoded = (raw: string) => {
      const code = String(raw || "").replace(/\D/g, "");
      if (!/^\d{8,14}$/.test(code) || code === lastEanRef.current || disposed) return;
      lastEanRef.current = code;
      setEan(code);
      trackEvent("arvo_scan_success");
      setMealSaved(false);
      setCartSaved(false);
      setTab("nutrition");
    };
    async function start() {
      try {
        // Reuse the exact html5-qrcode library used by Ziiply's ordinary scanner.
        const { HTML5_QRCODE_SCRIPT_URL } = await import("../ziiplyCore");
        if (!(window as any).Html5Qrcode) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector('script[data-ziiply-html5qr="true"]') as HTMLScriptElement | null;
            const script = existing || document.createElement("script");
            if (!existing) {
              script.src = HTML5_QRCODE_SCRIPT_URL;
              script.dataset.ziiplyHtml5qr = "true";
              script.onload = () => resolve();
              script.onerror = () => reject(new Error("scanner-script"));
              document.head.appendChild(script);
            } else if ((window as any).Html5Qrcode) resolve();
            else {
              script.addEventListener("load", () => resolve(), {once:true});
              script.addEventListener("error", () => reject(new Error("scanner-script")), {once:true});
            }
          });
        }
        if (disposed) return;
        const Reader = (window as any).Html5Qrcode;
        if (!Reader) throw new Error("scanner-unavailable");
        scanner = new Reader(regionId, {verbose:false});
        await scanner.start({facingMode:"environment"}, {fps:12, qrbox: {width:270,height:155}, aspectRatio:1.7778}, onDecoded, () => undefined);
        if (disposed) { await scanner.stop().catch(() => undefined); return; }
        const video = document.querySelector("#" + regionId + " video") as HTMLVideoElement | null;
        cameraRef.current = video?.srcObject as MediaStream | null;
        setStatus("Kohdista EAN-viivakoodi kameran keskelle.");
      } catch (error) {
        if (!disposed) setStatus("Skannerin käynnistys epäonnistui. Tarkista kameran käyttöoikeus.");
      }
    }
    void start();
    return () => {
      disposed = true;
      cameraRef.current = null;
      if (scanner) {
        void Promise.resolve(scanner.stop()).catch(() => undefined).then(() => scanner.clear()).catch(() => undefined);
      }
    };
  }, [open]);
  useEffect(() => {
    if (!ean) return;
    const controller = new AbortController();
    setProductName("");
    setNutrition(null);
    setStatus("Haetaan EAN-tuotetta Neonista…");
    fetch("/api/ean-bank?ean=" + encodeURIComponent(ean), {signal:controller.signal})
      .then(response => response.json())
      .then(data => {
        if (!data?.product) { trackEvent("arvo_product_not_found"); setStatus("EAN-tuotetta ei löytynyt."); return; }
        trackEvent("arvo_product_found");
        setProductName(data.product.name || "Tuntematon tuotenimi");
        setNutrition(data.product.nutrition || null);
        setStatus(data.product.nutrition ? "Ravintotiedot löytyivät" : "Tuote löytyi, ravintoarvot puuttuvat");
      })
      .catch(() => { if (!controller.signal.aborted) { trackEvent("arvo_scanner_error"); setStatus("Tuotteen hakeminen epäonnistui"); } });
    return () => controller.abort();
  }, [ean]);
  const nutrient = (keys: string[]) => {
    if (!nutrition) return "—";
    const source = (nutrition.nutrients && typeof nutrition.nutrients === "object") ? nutrition.nutrients as Record<string,unknown> : nutrition;
    const key = keys.find(key => source[key] !== undefined && source[key] !== null);
    if (!key) return "—";
    const raw = source[key];
    const number = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
    return Number.isFinite(number) && number >= 0 ? (number * grams / 100).toLocaleString("fi-FI",{maximumFractionDigits:1}) : "—";
  };
  const [grams, setGrams] = useState(100);
  const addToCart = async () => {
    if (!onAddToCart || !ean || !productName || cartSaving || cartSaved) return;
    setCartSaving(true);
    try {
      await onAddToCart({ean,name:productName,grams,nutrition});
      setCartSaved(true);
      trackEvent("arvo_cart_added");
      setStatus("Lisätty ostoskoriin");
    } catch { setStatus("Ostoskoriin lisääminen epäonnistui"); }
    finally { setCartSaving(false); }
  };
  const saveMeal = () => {
    if (!ean || !productName || !nutrition || grams <= 0) return;
    try {
      saveArvoMeal(window.localStorage,{id:crypto.randomUUID(),timestamp:new Date().toISOString(),ean,name:productName,grams,nutrition:arvoNutrientValues(nutrition,grams)});
      window.dispatchEvent(new Event("ziiply-arvo-meals-updated"));
      trackEvent("arvo_meal_saved");
      setMealSaved(true);
      setStatus("Lisätty aterialle");
    } catch { setStatus("Aterian tallennus epäonnistui"); }
  };
  const [tab, setTab] = useState<"scan" | "nutrition">("scan");
  const closeScanner = () => {
    setOpen(false);
    setTab("scan");
    if (onClose) { onClose(); return; }
    if (typeof window !== "undefined") {
      const referrer = document.referrer;
      if (referrer && new URL(referrer).origin === window.location.origin && window.history.length > 1) window.history.back();
      else window.location.assign("/");
    }
  };
  return (
    <div className="fixed inset-0 overflow-hidden bg-[#f8f5ed] text-[#173b2b]">
      <ZiiplyMobileScannerCard
        regionId="arvo-nutrition-scanner-camera"
        fullscreen
        hideHeaderTitle
        headerTitle={<div className="flex items-center justify-center gap-2"><img src="/assistants/arvo.png" alt="Arvo" className="h-[72px] w-[72px] shrink-0 rounded-full object-cover"/><div className="min-w-0 text-left leading-tight text-[#163d32]"><div className="text-[clamp(15px,4vw,21px)] font-black uppercase tracking-wide" style={{fontFamily: 'Georgia, "Times New Roman", serif'}}>Skanneri</div><div className="text-[clamp(10px,2.6vw,13px)] font-bold">Arvon ravintoskanneri</div></div></div>}
        footerLeft={<div className="grid grid-cols-2 gap-1"><button type="button" onClick={saveMeal} disabled={!ean || !nutrition || !productName || grams <= 0 || mealSaved} title={mealSaved ? "Tallennettu aterialle" : "Tallenna tuote aterialle"} className="flex h-[64px] flex-col items-center justify-center rounded-xl border-[2px] border-[#8d6e3d] bg-[#f8ecd0] text-[11px] font-black text-[#28492f] disabled:opacity-50"><span className="text-xl">🍽️</span><span>{mealSaved ? "Tallennettu" : "Aterialle"}</span></button><button type="button" onClick={() => void addToCart()} disabled={!onAddToCart || !ean || !productName || cartSaving || cartSaved} title={!onAddToCart ? "Odottaa Ziiplyn ostoskorin kytkentää" : cartSaved ? "Lisätty ostoskoriin" : "Lisää ostoskoriin"} className="flex h-[64px] flex-col items-center justify-center rounded-xl border-[2px] border-[#8d6e3d] bg-[#f8ecd0] text-[11px] font-black text-[#28492f] disabled:opacity-50"><span className="text-xl">🛒</span><span>{cartSaved ? "Lisätty" : "Ostoskoriin"}</span></button></div>}
        onClose={closeScanner}
        onToggleTorch={() => {
          const track = cameraRef.current?.getVideoTracks()[0];
          if (track) void track.applyConstraints({advanced:[{torch:!torch} as any]}).then(() => setTorch(!torch)).catch(() => setStatus("Valoa ei tueta tällä laitteella"));
        }}
        torchOn={torch}
        scannerMessage={tab === "scan" ? status : ""}
        cameraOverlay={tab === "nutrition" && ean ? (
          <div className="absolute inset-0 z-30 flex flex-col justify-end bg-[#07100b]/65 p-3 pb-[max(16px,env(safe-area-inset-bottom))]">
            <section className="w-full rounded-2xl border-2 border-[#b99d62] bg-[#fff7e6] p-3 shadow-2xl">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[#816a3c]">Arvo · Ravintoarvot</p>
                  <h2 className="truncate text-base font-black">{productName || "Haetaan tuotetta…"}</h2>
                  <p className="text-[11px] text-[#536456]">EAN {ean} · {status}</p>
                </div>
                <button type="button" aria-label="Sulje tuotetiedot" onClick={() => {setEan("");setTab("scan");lastEanRef.current="";}} className="rounded-full bg-white px-3 py-1 text-xl font-bold">×</button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="arvo-grams" className="text-sm font-bold">Määrä</label>
                <div className="flex items-center gap-1"><input aria-label="Grammamäärä" type="number" min="0" max="5000" value={grams} onChange={e=>setGrams(Math.max(0,Math.min(5000,Number(e.target.value)||0)))} className="w-20 rounded-lg border border-[#b99d62] bg-white px-2 py-1 text-right font-black"/><span className="text-sm font-bold">g</span></div>
              </div>
              <input id="arvo-grams" type="range" min="0" max="500" step="5" value={Math.min(grams,500)} onChange={e=>setGrams(Number(e.target.value))} className="mt-1 w-full accent-[#24573e]"/>
              <div className="mt-2 grid grid-cols-4 gap-1">
                {([["kcal",["kcal_100g","energy-kcal_100g","ENERC"]],["Prot.",["proteins_100g","protein_100g","PROCNT"]],["HH",["carbohydrates_100g","CHOCDF"]],["Rasva",["fat_100g","FAT"]]] as [string,string[]][]).map(([label,keys])=><div key={label} className="rounded-lg bg-white px-1 py-2 text-center"><div className="text-[10px] font-bold">{label}</div><div className="text-base font-black">{nutrient(keys)}</div></div>)}
              </div>
              <div className="mt-2">
                <a href="/arvo-tilastot" className="mb-2 block rounded-xl border-2 border-[#24573e] bg-white p-2 text-center text-sm font-bold">📊 Katso ravintotilastot</a>
                <button type="button" onClick={()=>{setEan("");setProductName("");setNutrition(null);setStatus("");setMealSaved(false);setCartSaved(false);lastEanRef.current="";setTab("scan");}} className="w-full rounded-xl bg-[#24573e] p-3 text-sm font-bold text-white">Skannaa seuraava</button>
              </div>
            </section>
          </div>
        ) : undefined}
      />

    </div>
  );
}
