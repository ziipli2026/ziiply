"use client";

import React, { useState } from "react";
import ZiiplyMobileCompareSelectionCard from "../cards/ZiiplyMobileCompareSelectionCard";

export type DesktopCompareStore = {
  id: string; name: string; chain?: "S" | "K" | "LIDL" | "SPAR"; totalPrice?: number;
  itemCount?: number; missingItems?: number; matches?: unknown[];
};
type Props = {
  open?: boolean; stores: DesktopCompareStore[]; title?: string; subtitle?: string; loading?: boolean;
  onSelectStore?: (storeId: string) => void; onBack?: () => void; onBackToCart?: () => void;
  onClose?: () => void; items?: unknown[];
  onChangeMatchMode?: (storeId: string, match: unknown, mode: "cheapest" | "same_quality" | "own_brands" | "same_brand") => unknown[] | void | Promise<unknown[] | void>;
  onSelectMatchAlternative?: (storeId: string, match: unknown, alternative: unknown) => void | Promise<void>;
};
type MatchRow = {
  id?: string; name?: string; quantity?: number; price?: number | null;
  isMissingComparisonItem?: boolean; product?: {name?: string; image?: string; imageUrl?: string};
  image?: string; imageUrl?: string; cartItem?: {image?: string; imageUrl?: string; product?: {image?: string; imageUrl?: string}};
};
const euro = (cents?: number | null) =>
  cents == null || !Number.isFinite(cents) ? "—" : `${(cents / 100).toFixed(2).replace(".", ",")} €`;

export default function ZiiplyDesktopCompareCard({
  open = true, stores, title = "Halpuusvertailu", subtitle = "Kauppakohtaiset hinnat ja ostoskorit",
  loading = false, onSelectStore, onBack, onBackToCart, onClose, items = [],
  onChangeMatchMode, onSelectMatchAlternative,
}: Props) {
  const [expanded, setExpanded] = useState<string[]>([]);
  if (!open) return null;
  const complete = stores.filter(s => !s.missingItems && (s.itemCount || 0) > 0 && Number.isFinite(s.totalPrice));
  const bestPrice = complete.length ? Math.min(...complete.map(s => Number(s.totalPrice))) : null;
  const toggle = (id: string) => setExpanded(current => current.includes(id) ? current.filter(x => x !== id) : [...current, id]);
  const back = onBack || onBackToCart || onClose;
  return (
    <div className="fixed inset-0 z-[150] grid place-items-center bg-[#172e23]/65 p-4">
      <section role="dialog" aria-modal="true" aria-label="Hintavertailu"
        className="relative flex h-[min(96dvh,1100px)] min-h-[430px] w-[min(1400px,calc(100vw-32px))] flex-col overflow-hidden rounded-[30px] border-[9px] border-[#3d2415] bg-[#ead7ad] p-2 shadow-[0_18px_0_rgba(52,36,23,.35),0_30px_70px_rgba(0,0,0,.35)]">
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border-[2px] border-dashed border-[#c9ad76] px-5 pb-5 pt-6 md:px-8"
          style={{backgroundColor:"#f5e7c7",backgroundImage:"repeating-linear-gradient(to bottom, transparent 0, transparent 35px, rgba(151,125,79,.16) 36px, transparent 37px),linear-gradient(110deg,rgba(255,250,230,.93),rgba(230,202,151,.56))"}}>
          <button type="button" onClick={back} aria-label="Takaisin" className="absolute left-3 top-3 z-10 grid h-12 w-14 place-items-center rounded-xl border-[3px] border-[#3d2415] bg-[#654027] text-2xl text-[#fff0c9]">←</button>
          <button type="button" onClick={onClose || back} aria-label="Sulje vertailu" className="absolute right-3 top-3 z-10 grid h-12 w-14 place-items-center rounded-xl border-[3px] border-[#3d2415] bg-[#654027] text-2xl font-black text-[#fff0c9]">×</button>
          <header className="shrink-0 px-14 text-center">
            <div className="font-serif text-xs font-bold uppercase tracking-[.2em] text-[#7e6c4d]">Justiina · Tuotehaku</div>
            <h2 className="mt-1 font-serif text-[clamp(26px,3vw,43px)] font-black italic text-[#174c3a]">{title}</h2>
            <p className="mt-1 text-sm font-bold text-[#6b5839]">{subtitle}</p>
            {loading && <p role="status" className="text-sm font-bold text-[#17633c]">Päivitetään hintoja…</p>}
          </header>
          <div className={`mt-5 grid min-h-0 grid-cols-1 items-start gap-4 overflow-y-auto lg:grid-cols-2 ${stores.length>=3?"xl:grid-cols-3":""} ${stores.length>=4?"2xl:grid-cols-4":""} ${expanded.length ? "flex-1 content-start" : "content-start"}`}>
            {stores.length === 0 && <p className="col-span-full p-8 text-center font-bold">{loading ? "Vertailutuloksia haetaan…" : "Vertailutuloksia ei ole saatavilla."}</p>}
            {stores.map((store,index) => {
              const missing = Number(store.missingItems || 0);
              const found = Number(store.itemCount || 0);
              const isComplete = missing === 0 && found > 0 && Number.isFinite(store.totalPrice);
              const isBest = isComplete && bestPrice !== null && Number(store.totalPrice) === bestPrice;
              const diff = isComplete && bestPrice !== null ? Number(store.totalPrice) - bestPrice : null;
              const isOpen = expanded.includes(store.id);
              const rows = (store.matches || []) as MatchRow[];
              return (
                <article key={store.id} className={`flex min-w-0 flex-col overflow-hidden rounded-[24px] border-[3px] shadow-[0_5px_10px_rgba(75,53,25,.14)] ${isOpen ? "min-h-[440px] lg:min-h-[520px]" : "h-auto"} ${isBest ? "border-[#086a38] bg-[#e8f0d0]/90" : "border-[#a18a60] bg-[#fff9e8]/90"}`}>
                  <div className="flex shrink-0 items-center gap-3 border-b border-[#c9ad76]/70 px-4 py-3">
                    <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-[3px] text-xl font-black text-white ${store.chain === "S" ? "border-[#07572e] bg-[#07883c]" : store.chain === "K" ? "border-[#85161c] bg-[#cf2028]" : store.chain === "LIDL" ? "border-[#153c8a] bg-[#235ac2]" : "border-[#8b4321] bg-[#bc7032]"}`}>{store.chain || "•"}</div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[clamp(14px,1.2vw,20px)] font-black leading-tight text-[#29271e]">{store.name}</h3>
                      <p className="text-[10px] font-extrabold uppercase text-[#7c725d]">#{index+1} · {found} tuotetta löytynyt · {missing ? `${missing} puuttuu` : "Täysi kori"}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      {isBest && <div className="text-[10px] font-black uppercase text-[#07883c]">Paras hinta</div>}
                      <div className="font-serif text-[clamp(21px,2vw,30px)] font-black italic text-[#29271e]">{isComplete ? euro(store.totalPrice) : "—"}</div>
                      {diff !== null && diff > 0 && <div className="text-xs font-bold text-[#76684e]">+{euro(diff)} kalliimpi</div>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-start px-4 pb-3 pt-1">
                    <button type="button" aria-expanded={isOpen} onClick={()=>toggle(store.id)} className="rounded-xl border-2 border-[#536b4d] bg-[#f1e3c1] px-4 py-1.5 font-serif text-sm font-black italic text-[#214d36]">{isOpen ? "Sulje valinnat" : "Muuta valintoja"}</button>
                  </div>
                  {isOpen && (
                    <div className="min-h-[320px] flex-1 overflow-y-auto overscroll-contain px-3 pb-3 [scrollbar-width:thin]">
                      <ZiiplyMobileCompareSelectionCard key={store.id} open embedded compact store={{...store,matches:rows}} items={items} onChangeMatchMode={onChangeMatchMode} onSelectMatchAlternative={onSelectMatchAlternative} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <footer className="mt-3 shrink-0 border-t border-[#b69a68]/70 pt-2 text-center font-serif text-xs italic text-[#776548]">Vertailu perustuu löytyneisiin ja vahvistettuihin hintoihin.</footer>
        </div>
      </section>
    </div>
  );
}
