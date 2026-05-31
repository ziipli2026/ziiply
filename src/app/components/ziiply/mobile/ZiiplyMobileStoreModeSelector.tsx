"use client";

// V643_MODE_SELECTOR_REAL_RENDER_PATH_SOFT_PAPER
// Drop-in replacement for actual repo path:
// src/app/components/ziiply/mobile/ZiiplyMobileStoreModeSelector.tsx
//
// Simulaation tulos:
// page.tsx importtaa nimenomaan tiedoston ZiiplyMobileStoreModeSelector.
// V642-niminen testitiedosto ei vaikuta ruutuun, ellei sen sisältöä kopioida tähän oikeaan tiedostoon.
// Tämä versio pitää nykyisen näkyvän mode selector -rakenteen:
// 1) Tavaratalot / Lähikaupat
// 2) HAKUTAPA-kilpi
// 3) Ketjujen väliltä / Ketjun sisältä
//
// Vain ulkoasu. Ei props-, state-, callback- tai hakulogiikkamuutoksia.

import React, { useEffect, useState } from "react";

type StoreMode = "hyper" | "local";
type StoreCompareScope = "none" | "between_chains" | "within_chain";

type Props = {
  storeMode: StoreMode;
  storeModeChosen: boolean;
  storeCompareScope: StoreCompareScope;
  withinChain: "S" | "K" | null;
  selectedRealChainCount: number;
  missingStoresMessageVisible?: boolean;
  foundStoresCount?: number;
  hyperStorePairMissing?: boolean;
  onStoreModeChange: (mode: StoreMode) => void;
  onStoreCompareScopeChange: (scope: StoreCompareScope) => void;
  onWithinChainChange?: (chain: "S" | "K" | null) => void;
  [key: string]: unknown;
};

function modeButtonClass(active: boolean, disabled = false) {
  return [
    "relative min-h-[58px] overflow-hidden rounded-[1.22rem] border-[2px] px-3 py-[0.46rem] text-[16px] font-black leading-tight transition active:scale-[0.985]",
    "before:pointer-events-none before:absolute before:inset-[3px] before:rounded-[1rem] before:border before:border-white/25",
    "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.46),transparent_60%)]",
    disabled ? "cursor-not-allowed opacity-60" : "",
    active
      ? "border-[#074225] bg-gradient-to-b from-[#12834a] via-[#096a38] to-[#044724] text-[#fff4d4] shadow-[0_5px_0_#06391f,0_12px_18px_rgba(18,54,32,0.20),inset_0_0_0_2px_rgba(255,255,255,0.16)]"
      : "border-[#d2ad68] bg-gradient-to-b from-[#fff9e4] via-[#f9edc8] to-[#efd9a4] text-[#5a4424] shadow-[0_3px_0_rgba(113,82,38,0.16),0_8px_14px_rgba(55,38,14,0.08),inset_0_0_0_2px_rgba(255,255,255,0.58)]",
  ].join(" ");
}

function scopeButtonClass(active: boolean) {
  return [
    "relative min-h-[46px] overflow-hidden rounded-[1.05rem] border-[2px] px-3 py-[0.42rem] text-[15px] font-black leading-tight transition active:scale-[0.985]",
    "before:pointer-events-none before:absolute before:inset-[3px] before:rounded-[0.85rem] before:border before:border-white/22",
    "after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.42),transparent_58%)]",
    active
      ? "border-[#074225] bg-gradient-to-b from-[#118044] via-[#086737] to-[#044724] text-[#fff4d4] shadow-[0_4px_0_#06391f,0_9px_15px_rgba(18,54,32,0.18),inset_0_0_0_2px_rgba(255,255,255,0.16)]"
      : "border-[#d2ad68] bg-gradient-to-b from-[#fff9e4] via-[#f8ebc1] to-[#edd49a] text-[#5a4424] shadow-[0_2px_0_rgba(113,82,38,0.14),inset_0_0_0_2px_rgba(255,255,255,0.58)]",
  ].join(" ");
}

export default function ZiiplyMobileStoreModeSelector({
  storeMode,
  storeModeChosen,
  storeCompareScope,
  withinChain,
  selectedRealChainCount,
  missingStoresMessageVisible = false,
  foundStoresCount = 0,
  hyperStorePairMissing = false,
  onStoreModeChange,
  onStoreCompareScopeChange,
  onWithinChainChange,
}: Props) {
  const [hakutapaNoticeVisible, setHakutapaNoticeVisible] = useState(false);

  const hyperActive = storeModeChosen && storeMode === "hyper";
  const localActive = storeModeChosen && storeMode === "local";
  const modeButtonsDisabled = storeCompareScope === "within_chain";

  const shouldShowHakutapaNotice =
    hyperStorePairMissing ||
    (missingStoresMessageVisible && foundStoresCount === 0) ||
    (storeCompareScope === "between_chains" && selectedRealChainCount < 2) ||
    (storeCompareScope === "within_chain" && !withinChain);

  useEffect(() => {
    if (!shouldShowHakutapaNotice) return;

    setHakutapaNoticeVisible(true);
    const timer = window.setTimeout(() => {
      setHakutapaNoticeVisible(false);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [shouldShowHakutapaNotice]);

  return (
    <section className="relative mx-auto w-full max-w-[390px] overflow-visible rounded-[1.75rem] border-[3px] border-[#b58b4a] bg-[#fbf3d8] px-3 pb-3 pt-3 text-[#213224] shadow-[0_5px_0_rgba(105,72,28,0.14),0_14px_24px_rgba(46,32,12,0.10),inset_0_0_0_2px_rgba(255,255,255,0.56)]">
      <style>{`
        @keyframes ziiplyNoticePopV643 {
          0% {
            opacity: 0;
            transform: scale(0.92);
          }
          12% {
            opacity: 1;
            transform: scale(1);
          }
          82% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.96);
          }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-22 [background-image:radial-gradient(#c9ad6b_0.9px,transparent_0.9px)] [background-size:17px_17px]" />
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.70),transparent_61%)]" />

      <div className="relative z-10 rounded-[1.45rem] border-[2px] border-[#d5b56d] bg-[#fdf5dc]/70 p-2 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.62),0_3px_0_rgba(92,61,20,0.10)]">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={modeButtonsDisabled}
            onClick={() => onStoreModeChange("hyper")}
            className={modeButtonClass(hyperActive, modeButtonsDisabled)}
          >
            <span className="relative z-10 block text-[20px] leading-none">🏬</span>
            <span className="relative z-10 block">Tavaratalot</span>
          </button>

          <button
            type="button"
            disabled={modeButtonsDisabled}
            onClick={() => onStoreModeChange("local")}
            className={modeButtonClass(localActive, modeButtonsDisabled)}
          >
            <span className="relative z-10 block text-[20px] leading-none">🏪</span>
            <span className="relative z-10 block">Lähikaupat</span>
          </button>
        </div>

        <div className="-my-[1px] flex h-8 items-center justify-center">
          <p
            className={[
              "relative z-20 whitespace-nowrap rounded-full border-[2px] px-3.5 py-[0.35rem] text-center text-[12px] font-black uppercase leading-none tracking-[0.14em] transition-none shadow-[0_2px_0_rgba(91,72,44,0.16),inset_0_1px_0_rgba(255,255,255,0.72)]",
              hakutapaNoticeVisible
                ? "animate-[ziiplyNoticePopV643_2200ms_ease-out_forwards] border-[#cda34a] bg-[#ffeaa0] text-[#634100] shadow-[0_3px_10px_rgba(180,119,0,0.14)]"
                : "border-[#d7b977] bg-[#fff8da] text-[#66543a]",
            ].join(" ")}
          >
            {hakutapaNoticeVisible
              ? hyperStorePairMissing
                ? "Tavarataloparia ei löytynyt"
                : "Vertailuparia ei löytynyt"
              : !storeModeChosen || storeCompareScope === "none"
                ? "Valitse hakutapa"
                : "Hakutapa"}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onStoreCompareScopeChange("between_chains")}
            className={scopeButtonClass(storeCompareScope === "between_chains")}
          >
            <span className="relative z-10">Ketjujen väliltä</span>
          </button>

          <button
            type="button"
            onClick={() => onStoreCompareScopeChange("within_chain")}
            className={scopeButtonClass(storeCompareScope === "within_chain")}
          >
            <span className="relative z-10">Ketjun sisältä</span>
          </button>
        </div>

        {storeCompareScope === "within_chain" && onWithinChainChange && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onWithinChainChange(withinChain === "S" ? null : "S")}
              className={scopeButtonClass(withinChain === "S")}
            >
              <span className="relative z-10">S-ryhmä</span>
            </button>

            <button
              type="button"
              onClick={() => onWithinChainChange(withinChain === "K" ? null : "K")}
              className={scopeButtonClass(withinChain === "K")}
            >
              <span className="relative z-10">K-ryhmä</span>
            </button>
          </div>
        )}
      </div>

      <div className="relative z-10 mt-2 min-h-[0.25rem] text-[12px] font-black leading-tight text-[#7f5a24]">
        {storeCompareScope === "within_chain" && !withinChain && (
          <p>Valitse S-ryhmä tai K-ryhmä ketjun sisäistä vertailua varten.</p>
        )}
      </div>
    </section>
  );
}

export { ZiiplyMobileStoreModeSelector };
