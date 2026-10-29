"use client";

import React, { useEffect, useRef, useState } from "react";
import ZiiplyMobileScannerCard from "../cards/ZiiplyMobileScannerCard";

/**
 * Arvon ravintoskannerin ensimmäinen käyttöliittymäversio.
 * Käyttää samaa kameranäkymäkomponenttia kuin tavallinen skanneri.
 * EAN-tunnistus, ravintohaku ja päiväkirjaan tallennus kytketään myöhemmin.
 */
export default function ArvoNutritionScannerPreview() {
  const [open, setOpen] = useState(false);
  const [ean, setEan] = useState("");
  const [productName, setProductName] = useState("");
  const [nutrition, setNutrition] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState("");
  const [torch, setTorch] = useState(false);
  const cameraRef = useRef<MediaStream | null>(null);
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
        if (!data?.product) { setStatus("EAN-tuotetta ei löytynyt."); return; }
        setProductName(data.product.name || "Tuntematon tuotenimi");
        setNutrition(data.product.nutrition || null);
        setStatus(data.product.nutrition ? "Ravintotiedot löytyivät" : "Tuote löytyi, ravintoarvot puuttuvat");
      })
      .catch(() => { if (!controller.signal.aborted) setStatus("Tuotteen hakeminen epäonnistui"); });
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
  const [tab, setTab] = useState<"scan" | "nutrition">("scan");
  return (
    <div className="fixed inset-0 overflow-hidden bg-[#f8f5ed] text-[#173b2b]">
      <ZiiplyMobileScannerCard
        regionId="arvo-nutrition-scanner-camera"
        fullscreen
        onClose={() => { setOpen(false); setTab("scan"); }}
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
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button type="button" disabled className="rounded-xl border border-[#b99d62] bg-white p-2 text-xs font-bold opacity-50">Lisää aterialle</button>
                <button type="button" onClick={()=>{setEan("");setProductName("");setNutrition(null);setStatus("");lastEanRef.current="";setTab("scan");}} className="rounded-xl bg-[#24573e] p-2 text-xs font-bold text-white">Skannaa seuraava</button>
              </div>
            </section>
          </div>
        ) : undefined}
      />
      {!open && <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#f8f5ed] p-5"><button type="button" onClick={()=>{setOpen(true);setTab("scan");}} className="rounded-2xl bg-[#24573e] px-8 py-4 text-lg font-bold text-white">Avaa Arvon skanneri</button></div>}
      {open && <div className="pointer-events-none absolute left-1/2 top-[max(10px,env(safe-area-inset-top))] z-40 -translate-x-1/2 rounded-full border border-[#b99d62] bg-[#fff0c8] px-3 py-1 text-xs font-black">ARVO · RAVINTO</div>}
    </div>
  );
}
