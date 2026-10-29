"use client";

import React, { useState } from "react";
import ZiiplyMobileScannerCard from "../cards/ZiiplyMobileScannerCard";

/**
 * Arvon ravintoskannerin ensimmäinen käyttöliittymäversio.
 * Käyttää samaa kameranäkymäkomponenttia kuin tavallinen skanneri.
 * EAN-tunnistus, ravintohaku ja päiväkirjaan tallennus kytketään myöhemmin.
 */
export default function ArvoNutritionScannerPreview() {
  const [open, setOpen] = useState(false);
  const [grams, setGrams] = useState(100);
  const [tab, setTab] = useState<"scan" | "nutrition">("scan");
  return (
    <div className="min-h-dvh bg-[#f8f5ed] px-3 py-5 text-[#173b2b]">
      <div className="mx-auto max-w-[480px]">
        <header className="mb-4 flex items-center gap-3 rounded-2xl border-2 border-[#b99d62] bg-[#fff0c8] p-3">
          <img src="/assistants/arvo.png" alt="Arvo" className="h-16 w-16 rounded-full object-cover" />
          <div><h1 className="text-2xl font-black">Arvon ravintoskanneri</h1><p className="text-xs font-semibold">Käyttöliittymän testiversio · ei vielä tuotehakua</p></div>
        </header>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button onClick={() => setTab("scan")} className={`rounded-xl border-2 px-3 py-3 font-bold ${tab === "scan" ? "border-[#386344] bg-[#d8ecd3]" : "border-[#c9b88e] bg-white"}`}>Skanneri</button>
          <button onClick={() => setTab("nutrition")} className={`rounded-xl border-2 px-3 py-3 font-bold ${tab === "nutrition" ? "border-[#386344] bg-[#d8ecd3]" : "border-[#c9b88e] bg-white"}`}>Ravintoarvot</button>
        </div>
        {tab === "scan" ? (
          <div className="rounded-2xl border-2 border-[#b99d62] bg-white p-3">
            <p className="mb-3 text-sm">Sama skannerin ulkoasu kuin Ziiplyn tavallisessa skannerissa. Kameratoiminto liitetään seuraavassa vaiheessa.</p>
            <button onClick={() => setOpen(true)} className="w-full rounded-xl bg-[#24573e] px-4 py-3 font-black text-white">Näytä Arvon skanneri</button>
          </div>
        ) : (
          <section className="rounded-2xl border-2 border-[#b99d62] bg-white p-4">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#816a3c]">Tuotteen ravintotiedot</p>
            <h2 className="text-lg font-black">Tuote tunnistetaan skannauksen jälkeen</h2>
            <p className="mt-1 text-xs text-[#68756a]">Tässä vaiheessa vain annoskoon käyttöliittymä. Ravintoarvoja ei arvata.</p>
            <div className="mt-5 flex items-center justify-between"><label htmlFor="arvo-grams" className="font-bold">Syötävä määrä</label><strong>{grams} g</strong></div>
            <input id="arvo-grams" aria-label="Syötävä määrä grammoina" type="range" min="0" max="500" step="5" value={grams} onChange={e => setGrams(Number(e.target.value))} className="mt-3 w-full accent-[#24573e]" />
            <div className="mt-4 grid grid-cols-2 gap-2">
              {["Energia (kcal)", "Proteiini (g)", "Hiilihydraatit (g)", "Rasva (g)"].map(label => <div key={label} className="rounded-xl bg-[#f3f0e7] p-3"><div className="text-xs font-bold">{label}</div><div className="mt-1 text-xl font-black">—</div></div>)}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2"><button disabled className="rounded-xl bg-[#24573e] p-3 font-bold text-white opacity-50">Lisää aterialle</button><button disabled className="rounded-xl border-2 border-[#b99d62] p-3 font-bold opacity-50">Lisää ostoskoriin</button></div>
          </section>
        )}
      </div>
      {open && <div className="fixed inset-0 z-[100] bg-[#f8f5ed]">
        <ZiiplyMobileScannerCard
          regionId="arvo-nutrition-scanner-camera"
          fullscreen
          scannerMessage=""
          onClose={() => setOpen(false)}
          onToggleManualInput={() => { setOpen(false); setTab("nutrition"); }}
        />
        <div className="pointer-events-none absolute left-1/2 top-[calc(env(safe-area-inset-top)+14px)] z-[110] -translate-x-1/2 rounded-full border border-[#b99d62] bg-[#fff0c8]/95 px-4 py-1 text-xs font-black text-[#24573e] shadow">ARVO · RAVINTO</div>
      </div>}
    </div>
  );
}
