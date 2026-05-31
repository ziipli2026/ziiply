"use client";

// V646_MODE_SELECTOR_RENDER_FIX_COMPACT_2COL
// Korjaa render-vian: ylärow ei ole enää grid-cols-[1fr_auto_1fr], jossa HAKUTAPA kavensi Tavaratalot/Lähikaupat-napit.
// Uusi rakenne: 2 nappia omassa grid-cols-2 rivissä, HAKUTAPA omalla koko leveän keskikylttirivillä,
// ja Ketjujen väliltä / Ketjun sisältä omassa grid-cols-2 rivissä.
// Vain render-rakenne/ulkoasu. Ei state-, props-, callback-, handler-, haku-, GPS- tai valintalogiikkamuutoksia.
// Kopioi tämä sisältö oikeaan repo-polkuun:
// src/app/components/ziiply/mobile/ZiiplyMobileStoreModeSelector.tsx

// V642_MODE_SELECTOR_SOFT_PAPER_CHAIN_GRAPHICS_VISUAL_ONLY
// V641-pohjasta: vaalennettu paperipohja Hae-näkymän suuntaan, pehmennetty rasteri/pisteet,
// kevennetty ruskeat kehykset ja säädetty emaltti-/paperinappien kontrastia.
// Vain ulkoasu; ei props-, state-, callback-, render-rakenne- tai logiikkamuutoksia.

// V641_MODE_SELECTOR_VISUAL_ONLY
// Muutettu vain ulkoasu: paperitausta, retro-kehykset, emaltti-vihreät aktiivinapit ja lämmin beige passiivipinta.
// Ei muutoksia props-nimiin, stateihin, callbackeihin, valintalogiikkaan tai renderöintirakenteeseen.

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

function buttonClass(active: boolean, disabled = false) {
  return [
    "relative min-h-[38px] overflow-hidden rounded-[1.25rem] border-[2px] px-3 py-[0.48rem] text-[15px] font-black leading-tight transition active:scale-[0.985]",
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.45),transparent_58%)]",
    disabled ? "cursor-not-allowed opacity-60" : "",
    active
      ? "border-[#07502c] bg-gradient-to-b from-[#13864a] via-[#0a6d39] to-[#07502b] text-[#fff4d4] shadow-[0_4px_0_#064123,0_9px_16px_rgba(18,54,32,0.18),inset_0_0_0_2px_rgba(255,255,255,0.20)]"
      : "border-[#d2ad68] bg-gradient-to-b from-[#fff9e4] via-[#f8ebc1] to-[#edd49a] text-[#5a4424] shadow-[0_2px_0_rgba(113,82,38,0.16),inset_0_0_0_2px_rgba(255,255,255,0.58)]",
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
    <section className="relative mx-auto w-full max-w-[390px] overflow-hidden rounded-[1.9rem] border-[3px] border-[#b38a4a] bg-[#fbf3d8] px-4 pb-2.5 pt-3 text-[#213224] shadow-[0_5px_0_rgba(105,72,28,0.14),0_14px_24px_rgba(46,32,12,0.10),inset_0_0_0_2px_rgba(255,255,255,0.48)]">
      <style>{`
        @keyframes ziiplyNoticePop {
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

      <div className="pointer-events-none absolute inset-0 opacity-24 [background-image:radial-gradient(#c9ad6b_0.9px,transparent_0.9px)] [background-size:17px_17px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.64),transparent_60%)]" />

      <div className="relative z-10 grid grid-cols-2 gap-4">
        <button
          type="button"
          disabled={modeButtonsDisabled}
          onClick={() => onStoreModeChange("hyper")}
          className={buttonClass(hyperActive, modeButtonsDisabled)}
        >
          <span className="relative z-10">🏬 Tavaratalot</span>
        </button>

        <button
          type="button"
          disabled={modeButtonsDisabled}
          onClick={() => onStoreModeChange("local")}
          className={buttonClass(localActive, modeButtonsDisabled)}
        >
          <span className="relative z-10">🏪 Lähikaupat</span>
        </button>
      </div>

      <div className="relative z-20 my-1.5 flex h-7 items-center justify-center overflow-visible">
        <p
          className={[
            "relative z-10 whitespace-nowrap rounded-full border-[2px] px-3.5 py-[0.35rem] text-center text-[12px] font-black uppercase leading-none tracking-[0.14em] transition-none shadow-[0_2px_0_rgba(91,72,44,0.16),inset_0_1px_0_rgba(255,255,255,0.72)]",
            hakutapaNoticeVisible
              ? "border-[#cda34a] bg-[#ffeaa0] text-[#634100] shadow-[0_3px_10px_rgba(180,119,0,0.14)] animate-[ziiplyNoticePop_2200ms_ease-out_forwards]"
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

      <div className="relative z-10 grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => onStoreCompareScopeChange("between_chains")}
          className={buttonClass(storeCompareScope === "between_chains")}
        >
          <span className="relative z-10">Ketjujen väliltä</span>
        </button>

        <button
          type="button"
          onClick={() => onStoreCompareScopeChange("within_chain")}
          className={buttonClass(storeCompareScope === "within_chain")}
        >
          <span className="relative z-10">Ketjun sisältä</span>
        </button>
      </div>

      {storeCompareScope === "within_chain" && onWithinChainChange && (
        <div className="relative z-10 mt-4 grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => onWithinChainChange(withinChain === "S" ? null : "S")}
            className={buttonClass(withinChain === "S")}
          >
            <span className="relative z-10">S-ryhmä</span>
          </button>

          <button
            type="button"
            onClick={() => onWithinChainChange(withinChain === "K" ? null : "K")}
            className={buttonClass(withinChain === "K")}
          >
            <span className="relative z-10">K-ryhmä</span>
          </button>
        </div>
      )}

      <div className="relative z-10 mt-1 min-h-[0.15rem] text-[12px] font-black leading-tight text-[#7f5a24]">
        {storeCompareScope === "within_chain" && !withinChain && (
          <p>Valitse S-ryhmä tai K-ryhmä ketjun sisäistä vertailua varten.</p>
        )}
      </div>
    </section>
  );
}

export { ZiiplyMobileStoreModeSelector };
