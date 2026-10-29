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
  const [manual, setManual] = useState(false);
  const [manualEan, setManualEan] = useState("");
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
      setOpen(false);
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
    <div className="min-h-dvh bg-[#f8f5ed] px-3 pb-8 pt-[max(12px,env(safe-area-inset-top))] text-[#173b2b]">
      <main className="mx-auto max-w-[480px]">
        <header className="mb-3 flex items-center gap-3">
          <img src="/assistants/arvo.png" alt="Arvo" className="h-12 w-12 rounded-full border border-[#b99d62] object-cover" />
          <div className="min-w-0 flex-1"><h1 className="text-xl font-black leading-tight">Arvon ravintoskanneri</h1><p className="text-xs text-[#68756a]">Tuotteen ravintoarvot annoksen mukaan</p></div>
          <button type="button" onClick={() => {setTab("scan");setOpen(true);}} className="rounded-xl bg-[#24573e] px-3 py-2.5 text-sm font-bold text-white">Skannaa</button>
        </header>
        <form className="mb-3 flex gap-2" onSubmit={event => {event.preventDefault();const value=manualEan.replace(/\D/g,"");if (!/^\d{8,14}$/.test(value)) {setStatus("EAN-koodissa pitää olla 8–14 numeroa.");return;}setEan(value);setTab("nutrition");}}>
          <input aria-label="EAN-koodi" inputMode="numeric" value={manualEan} onChange={event=>setManualEan(event.target.value)} placeholder="EAN-koodi tai liitä tähän" className="min-w-0 flex-1 rounded-xl border border-[#c9b88e] bg-white px-3 py-2.5 text-sm" />
          <button type="submit" className="rounded-xl border border-[#24573e] bg-white px-4 text-sm font-bold text-[#24573e]">Hae</button>
        </form>
        {tab === "scan" && !ean ? (
          <section className="rounded-2xl border border-[#c9b88e] bg-white p-5 text-center">
            <p className="mb-3 text-sm text-[#68756a]">Skannaa pakkauksen viivakoodi tai syötä EAN yllä.</p>
            <button type="button" onClick={() => setOpen(true)} className="w-full rounded-xl bg-[#24573e] px-4 py-3 font-bold text-white">Avaa kamera</button>
            {status && <p role="status" className="mt-3 text-sm">{status}</p>}
          </section>
        ) : (
          <section className="rounded-2xl border border-[#c9b88e] bg-white p-4 shadow-sm">
            <div className="mb-3">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#816a3c]">Tunnistettu tuote</p>
              <h2 className="text-lg font-black leading-snug">{productName || "Tuotetta haetaan…"}</h2>
              <p className="mt-1 text-xs text-[#68756a]">{ean ? "EAN " + ean + " · " : ""}{status}</p>
            </div>
            <div className="rounded-xl bg-[#f8f5ed] p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <label htmlFor="arvo-grams" className="text-sm font-bold">Syötävä määrä</label>
                <div className="flex items-center gap-1"><input aria-label="Grammamäärä" type="number" min="0" max="5000" step="5" value={grams} onChange={e => setGrams(Math.max(0,Math.min(5000,Number(e.target.value)||0)))} className="w-20 rounded-lg border border-[#c9b88e] bg-white px-2 py-1 text-right font-black" /><span className="font-bold">g</span></div>
              </div>
              <input id="arvo-grams" aria-label="Syötävä määrä liukusäätimellä" type="range" min="0" max="500" step="5" value={Math.min(grams,500)} onChange={e => setGrams(Number(e.target.value))} className="w-full accent-[#24573e]" />
              <div className="mt-1 flex justify-between text-[11px] text-[#68756a]"><span>0 g</span><span>500 g</span></div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[["Energia", "kcal", ["kcal_100g","energy-kcal_100g","ENERC"]], ["Proteiini", "g", ["proteins_100g","protein_100g","PROCNT"]], ["Hiilihydraatit", "g", ["carbohydrates_100g","CHOCDF"]], ["Rasva", "g", ["fat_100g","FAT"]]].map(([label, unit, keys]) => <div key={String(label)} className="rounded-xl bg-[#f3f0e7] px-3 py-3"><div className="text-xs font-semibold text-[#536456]">{String(label)}</div><div className="mt-1 text-2xl font-black leading-none">{nutrient(keys as string[])} <span className="text-xs font-semibold">{String(unit)}</span></div></div>)}
            </div>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => {setTab("scan");setOpen(true);}} className="flex-1 rounded-xl bg-[#24573e] px-3 py-3 text-sm font-bold text-white">Skannaa seuraava</button>
              <button type="button" disabled title="Ateriapäiväkirja toteutetaan seuraavaksi" className="flex-1 rounded-xl border border-[#b99d62] px-3 py-3 text-sm font-bold text-[#82948a]">Lisää aterialle</button>
            </div>
          </section>
        )}
      </main>
      {open && <div className="fixed inset-0 z-[100] bg-[#f8f5ed]">
        <ZiiplyMobileScannerCard
          regionId="arvo-nutrition-scanner-camera"
          fullscreen
          onClose={() => setOpen(false)}
          onToggleManualInput={() => setManual(value => !value)}
          manualInputOpen={manual}
          onToggleTorch={() => { const track = cameraRef.current?.getVideoTracks()[0]; if (track) { void track.applyConstraints({advanced:[{torch:!torch} as any]}).then(() => setTorch(!torch)).catch(() => setStatus("Valoa ei tueta tällä laitteella")); } }}
          torchOn={torch}
          scannerMessage={status}
        />
        {manual && <form className="absolute bottom-28 left-4 right-4 z-[120] flex gap-2 rounded-xl bg-[#fff0c8] p-3" onSubmit={event => {event.preventDefault(); const value = String(new FormData(event.currentTarget).get("ean") || "").replace(/\D/g,""); if (/^\d{8,14}$/.test(value)) {setEan(value);setOpen(false);setTab("nutrition");setManual(false);} }}><input name="ean" inputMode="numeric" placeholder="EAN-koodi" className="min-w-0 flex-1 rounded-lg border p-2" required/><button className="rounded-lg bg-[#24573e] px-3 font-bold text-white">Hae</button></form>}
        <div className="pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+14px)] z-[110] -translate-x-1/2 rounded-full border border-[#b99d62] bg-[#fff0c8]/95 px-4 py-1 text-xs font-black text-[#24573e] shadow">ARVO · RAVINTO</div>
      </div>}
    </div>
  );
}
