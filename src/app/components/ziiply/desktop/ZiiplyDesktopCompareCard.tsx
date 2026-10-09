"use client";

import React from "react";

export type DesktopCompareStore = {
  id: string;
  name: string;
  chain?: "S" | "K";
  totalPrice?: number;
  itemCount?: number;
  missingItems?: number;
  matches?: unknown[];
};

type Props = {
  open?: boolean;
  stores: DesktopCompareStore[];
  title?: string;
  subtitle?: string;
  loading?: boolean;
  onSelectStore?: (storeId: string) => void;
  onBack?: () => void;
  onBackToCart?: () => void;
  onClose?: () => void;
};

const euro = (cents?: number | null) =>
  cents == null || !Number.isFinite(cents) ? "—" : `${(cents / 100).toFixed(2).replace(".", ",")} €`;

export default function ZiiplyDesktopCompareCard({
  open = true, stores, title = "Halpuusvertailu",
  subtitle = "Kauppakohtaiset hinnat ja ostoskorit", loading = false,
  onSelectStore, onBack, onBackToCart, onClose,
}: Props) {
  if (!open) return null;
  const complete = stores.filter((store) =>
    Number(store.missingItems || 0) === 0 &&
    Number(store.itemCount || 0) > 0 &&
    typeof store.totalPrice === "number" &&
    Number.isFinite(store.totalPrice)
  );
  const bestPrice = complete.length ? Math.min(...complete.map((store) => Number(store.totalPrice))) : null;
  const back = onBack || onBackToCart || onClose;

  return (
    <div className="fixed inset-0 z-[150] grid place-items-center bg-[#172e23]/65 p-5">
      <section role="dialog" aria-modal="true" aria-label="Hintavertailu"
        className="relative flex h-[min(86vh,850px)] w-[min(1120px,calc(100vw-40px))] min-h-[430px] flex-col overflow-hidden rounded-[30px] border-[9px] border-[#3d2415] bg-[#ead7ad] p-2 shadow-[0_18px_0_rgba(52,36,23,.35),0_30px_70px_rgba(0,0,0,.35)]">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border-[2px] border-dashed border-[#c9ad76] px-7 pb-7 pt-6 md:px-9"
          style={{backgroundColor:"#f5e7c7",backgroundImage:"repeating-linear-gradient(to bottom, transparent 0, transparent 35px, rgba(151,125,79,.16) 36px, transparent 37px),linear-gradient(110deg,rgba(255,250,230,.93),rgba(230,202,151,.56))"}}>
          <button type="button" onClick={back} aria-label="Takaisin" title="Takaisin"
            className="absolute left-4 top-3 z-10 grid h-14 w-16 place-items-center rounded-[15px] border-[3px] border-[#3d2415] bg-gradient-to-b from-[#80512c] to-[#3b2416] text-3xl text-[#fff0c9] shadow-[inset_0_0_0_2px_rgba(255,214,139,.15),0_3px_6px_rgba(0,0,0,.22)]">←</button>
          <button type="button" onClick={onClose || back} aria-label="Sulje vertailu" title="Sulje vertailu"
            className="absolute right-4 top-3 z-10 grid h-14 w-16 place-items-center rounded-[15px] border-[3px] border-[#3d2415] bg-gradient-to-b from-[#80512c] to-[#3b2416] text-2xl font-black text-[#fff0c9] shadow-[inset_0_0_0_2px_rgba(255,214,139,.15),0_3px_6px_rgba(0,0,0,.22)]">×</button>

          <header className="shrink-0 px-20 text-center">
            <div className="font-serif text-[13px] font-bold uppercase tracking-[.22em] text-[#7e6c4d]">Justiina · Tuotehaku</div>
            <h2 className="mt-1 font-serif text-[clamp(28px,3vw,43px)] font-black italic leading-tight text-[#174c3a]">{title}</h2>
            <p className="mt-2 text-sm font-bold text-[#6b5839]">{subtitle}</p>
            {loading && <p role="status" className="mt-2 text-sm font-extrabold text-[#17633c]">Päivitetään kauppakohtaisia hintoja…</p>}
          </header>

          <div className="mt-6 min-h-0 flex-1 overflow-y-auto pr-1">
            {stores.length === 0 ? (
              <div className="rounded-[20px] border-2 border-[#c3a675] bg-[#fff8e5]/85 p-8 text-center font-bold text-[#665438]">
                {loading ? "Vertailutuloksia haetaan…" : "Vertailutuloksia ei ole vielä saatavilla."}
              </div>
            ) : (
              <div className="space-y-4">
                {stores.map((store, index) => {
                  const missing = Math.max(0, Number(store.missingItems || 0));
                  const found = Math.max(0, Number(store.itemCount || 0));
                  const isComplete = missing === 0 && found > 0 && typeof store.totalPrice === "number" && Number.isFinite(store.totalPrice);
                  const isBest = isComplete && bestPrice !== null && Number(store.totalPrice) === bestPrice;
                  const hasPrice = isComplete;
                  const diff = hasPrice && bestPrice !== null ? Number(store.totalPrice) - bestPrice : null;
                  const chain = store.chain === "S" ? "S" : store.chain === "K" ? "K" : "•";
                  return (
                    <article key={store.id} className={`relative grid grid-cols-[66px_minmax(0,1fr)_minmax(130px,190px)] items-center gap-4 rounded-[25px] border-[3px] px-5 py-4 shadow-[0_4px_8px_rgba(75,53,25,.12)] md:grid-cols-[72px_minmax(0,1fr)_minmax(150px,210px)] ${isBest ? "border-[#086a38] bg-[#e8f0d0]/95" : "border-[#a18a60] bg-[#fff9e8]/90"}`}>
                      <div className={`grid h-[58px] w-[58px] place-items-center rounded-full border-[3px] text-[27px] font-black shadow-sm ${chain === "S" ? "border-[#07572e] bg-[#07883c] text-white" : chain === "K" ? "border-[#85161c] bg-[#cf2028] text-white" : "border-[#8a744b] bg-[#e7d3a8] text-[#5c4627]"}`}>{chain}</div>
                      <div className="min-w-0">
                        <h3 className="truncate text-[clamp(18px,1.8vw,27px)] font-black leading-tight text-[#29271e]">{store.name}</h3>
                        <p className="mt-1 text-[12px] font-extrabold uppercase tracking-[.08em] text-[#7c725d]">
                          #{index + 1} · {found} tuotetta löytynyt
                          {missing > 0 ? ` · ${missing} tuotetta puuttuu` : found > 0 ? " · Täysi kori" : " · Ei vahvistettuja hintoja"}
                        </p>
                        {missing > 0 && <p className="mt-1 text-xs font-bold text-[#8b4e35]">Puutteellinen kori – ei verrattavissa täyteen koriin.</p>}
                        <button type="button" onClick={back}
                          className="mt-2 rounded-[13px] border-[3px] border-[#536b4d] bg-gradient-to-b from-[#fff4d6] to-[#dfd0a8] px-5 py-2 font-serif text-[15px] font-black italic text-[#214d36] shadow-[0_2px_0_#8c9b7b] active:translate-y-px">
                          Muuta valintoja
                        </button>
                      </div>
                      <div className="flex min-w-0 flex-col items-end justify-center gap-2 text-right">
                        {isBest ? <span className="rounded-full border border-[#07572e] bg-[#07883c] px-3 py-1 text-[11px] font-black uppercase text-white">Paras hinta</span> : missing > 0 ? <span className="rounded-full bg-[#e9d9b4] px-3 py-1 text-[11px] font-black uppercase text-[#746344]">Puutteellinen</span> : null}
                        <span className={`font-serif text-[clamp(23px,2.5vw,35px)] font-black italic leading-none ${isBest ? "text-[#08783b]" : "text-[#29271e]"}`}>{hasPrice ? euro(store.totalPrice) : "—"}</span>
                        {hasPrice && diff !== null && diff > 0 && <span className="text-xs font-extrabold text-[#76684e]">+{euro(diff)} kalliimpi</span>}
                        <button type="button" disabled={!onSelectStore || !hasPrice || found === 0}
                          onClick={() => onSelectStore?.(store.id)} aria-label={`Valitse ${store.name} ostoskori`}
                          title="Valitse tämän kaupan ostoskori"
                          className="grid h-11 w-14 place-items-center rounded-[12px] border-[2px] border-[#765126] bg-gradient-to-b from-[#f4dba5] to-[#c9954d] text-[#51361a] shadow-[0_3px_0_#946a37] disabled:cursor-not-allowed disabled:opacity-40">
                          <svg aria-hidden="true" viewBox="0 0 32 32" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h22v15H5zM9 12V5h14v7M10 18h4m4 0h4M10 23h4m4 0h4M3 29h26"/></svg>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
          <footer className="mt-4 shrink-0 border-t border-[#b69a68]/70 pt-3 text-center font-serif text-sm italic text-[#776548]">Vertailu perustuu löytyneisiin ja vahvistettuihin hintoihin.</footer>
        </div>
      </section>
    </div>
  );
}
