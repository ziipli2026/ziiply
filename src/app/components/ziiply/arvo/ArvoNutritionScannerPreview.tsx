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
  const [torch, setTorch] = useState(false);
  const cameraRef = useRef<MediaStream | null>(null);
  const lastEanRef = useRef("");
  const regionId = "arvo-nutrition-scanner-camera";
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    const region = document.getElementById(regionId);
    if (!region) return;
    const video = document.createElement("video");
    video.setAttribute("playsinline", "true");
    video.muted = true;
    video.autoplay = true;
    video.style.cssText = "width:100%;height:100%;object-fit:cover";
    region.appendChild(video);
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
        if (cancelled) { stream.getTracks().forEach(track => track.stop()); return; }
        cameraRef.current = stream;
        video.srcObject = stream;
        await video.play();
        const Detector = (window as any).BarcodeDetector;
        if (!Detector) { setStatus("Kamera toimii. Viivakoodin tunnistus ei ole käytettävissä tässä selaimessa; käytä Liitä EAN."); return; }
        const detector = new Detector({formats:["ean_13","ean_8","upc_a","upc_e","code_128"]});
        let busy = false;
        const scan = async () => {
          if (cancelled) return;
          if (!busy && video.readyState >= 2) {
            busy = true;
            try {
              const codes = await detector.detect(video);
              const code = String(codes?.[0]?.rawValue || "").replace(/\\D/g,"");
              if (/^\\d{8,14}$/.test(code) && code !== lastEanRef.current) {
                lastEanRef.current = code;
                setEan(code);
                setOpen(false);
                setTab("nutrition");
              }
            } catch { /* keep scanning */ }
            busy = false;
          }
          raf = requestAnimationFrame(scan);
        };
        raf = requestAnimationFrame(scan);
      } catch { if (!cancelled) setStatus("Kameraa ei voitu avata. Tarkista kameran käyttöoikeus."); }
    }
    void start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach(track => track.stop());
      cameraRef.current = null;
      video.srcObject = null;
      video.remove();
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
    <div className="min-h-dvh bg-[#f8f5ed] px-3 py-5 text-[#173b2b]">
      <div className="mx-auto max-w-[480px]">
        <header className="mb-4 flex items-center gap-3 rounded-2xl border-2 border-[#b99d62] bg-[#fff0c8] p-3">
          <img src="/assistants/arvo.png" alt="Arvo" className="h-16 w-16 rounded-full object-cover" />
          <div><h1 className="text-2xl font-black">Arvon ravintoskanneri</h1><p className="text-xs font-semibold">EAN- ja ravintoarvohaun testiversio</p></div>
        </header>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button onClick={() => setTab("scan")} className={`rounded-xl border-2 px-3 py-3 font-bold ${tab === "scan" ? "border-[#386344] bg-[#d8ecd3]" : "border-[#c9b88e] bg-white"}`}>Skanneri</button>
          <button onClick={() => setTab("nutrition")} className={`rounded-xl border-2 px-3 py-3 font-bold ${tab === "nutrition" ? "border-[#386344] bg-[#d8ecd3]" : "border-[#c9b88e] bg-white"}`}>Ravintoarvot</button>
        </div>
        {tab === "scan" ? (
          <div className="rounded-2xl border-2 border-[#b99d62] bg-white p-3">
            <p className="mb-3 text-sm">Sama kameranäkymä kuin tavallisessa skannerissa. Kameratunnistus toimii selaimen tukemilla laitteilla.</p>
            <button onClick={() => setOpen(true)} className="w-full rounded-xl bg-[#24573e] px-4 py-3 font-black text-white">Näytä Arvon skanneri</button>
          </div>
        ) : (
          <section className="rounded-2xl border-2 border-[#b99d62] bg-white p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#816a3c]">Tuotteen ravintotiedot</p>
            <h2 className="text-lg font-black">{productName || "Tuote tunnistetaan skannauksen jälkeen"}</h2>
            <p className="mt-1 text-xs text-[#68756a]">{ean ? "EAN: " + ean : "Skannaa EAN nähdäksesi ravintoarvot."} · {status}</p>
            <div className="mt-5 flex items-center justify-between"><label htmlFor="arvo-grams" className="font-bold">Syötävä määrä</label><strong>{grams} g</strong></div>
            <input id="arvo-grams" aria-label="Syötävä määrä grammoina" type="range" min="0" max="500" step="5" value={grams} onChange={e => setGrams(Number(e.target.value))} className="mt-3 w-full accent-[#24573e]" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[["Energia (kcal)", ["kcal_100g","energy-kcal_100g","ENERC"]], ["Proteiini (g)", ["proteins_100g","protein_100g","PROCNT"]], ["Hiilihydraatit (g)", ["carbohydrates_100g","CHOCDF"]], ["Rasva (g)", ["fat_100g","FAT"]]].map(([label, keys]) => <div key={String(label)} className="rounded-xl bg-[#f3f0e7] p-3"><div className="text-xs font-bold">{String(label)}</div><div className="mt-1 text-xl font-black">{nutrient(keys as string[])}</div></div>)}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2"><button disabled className="rounded-xl bg-[#24573e] p-3 font-bold text-white opacity-50">Lisää aterialle</button><button disabled className="rounded-xl border-2 border-[#b99d62] p-3 font-bold opacity-50">Lisää ostoskoriin</button></div>
          </section>
        )}
      </div>
      {open && <div className="fixed inset-0 z-[100] bg-[#f8f5ed]">
        <ZiiplyMobileScannerCard
          regionId="arvo-nutrition-scanner-camera"
          fullscreen
          onClose={() => setOpen(false)}
          onToggleManualInput={() => setManual(value => !value)}
          onToggleTorch={() => { const track = cameraRef.current?.getVideoTracks()[0]; if (track) { void track.applyConstraints({advanced:[{torch:!torch} as any]}).then(() => setTorch(!torch)).catch(() => setStatus("Valoa ei tueta tällä laitteella")); } }}
          torchOn={torch}
          scannerMessage={status}
        />
        {manual && <form className="absolute bottom-28 left-4 right-4 z-[120] flex gap-2 rounded-xl bg-[#fff0c8] p-3" onSubmit={event => {event.preventDefault(); const value = String(new FormData(event.currentTarget).get("ean") || "").replace(/\\D/g,""); if (/^\\d{8,14}$/.test(value)) {setEan(value);setOpen(false);setTab("nutrition");setManual(false);} }}><input name="ean" inputMode="numeric" placeholder="EAN-koodi" className="min-w-0 flex-1 rounded-lg border p-2" required/><button className="rounded-lg bg-[#24573e] px-3 font-bold text-white">Hae</button></form>}
        <div className="pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+14px)] z-[110] -translate-x-1/2 rounded-full border border-[#b99d62] bg-[#fff0c8]/95 px-4 py-1 text-xs font-black text-[#24573e] shadow">ARVO · RAVINTO</div>
      </div>}
    </div>
  );
}
