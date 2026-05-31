"use client";

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
      ? "border-[#064626] bg-gradient-to-b from-[#0b7f3b] via-[#087236] to-[#055427] text-[#fff4d4] shadow-[0_5px_0_#06391f,0_10px_20px_rgba(18,54,32,0.22),inset_0_0_0_2px_rgba(255,255,255,0.16)]"
      : "border-[#c5a15c] bg-gradient-to-b from-[#fff8e1] to-[#f1dfad] text-[#5b4526] shadow-[0_3px_0_rgba(113,82,38,0.22),inset_0_0_0_2px_rgba(255,255,255,0.45)]",
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
    <section className="relative mx-auto w-full max-w-[390px] overflow-hidden rounded-[1.9rem] border-[3px] border-[#8c6732] bg-[#f6ebc6] px-4 pb-3 pt-3 text-[#213224] shadow-[0_8px_0_rgba(80,55,22,0.20),0_16px_30px_rgba(46,32,12,0.14),inset_0_0_0_2px_rgba(255,255,255,0.35)]">
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

      <div className="pointer-events-none absolute inset-0 opacity-55 [background-image:radial-gradient(#b8924e_1.05px,transparent_1.05px)] [background-size:16px_16px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.54),transparent_58%)]" />

      <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <button
          type="button"
          disabled={modeButtonsDisabled}
          onClick={() => onStoreModeChange("hyper")}
          className={buttonClass(hyperActive, modeButtonsDisabled)}
        >
          <span className="relative z-10">🏬 Tavaratalot</span>
        </button>

        <div className="relative flex min-h-[42px] items-center justify-center overflow-visible">
          <p
            className={[
              "relative z-10 whitespace-nowrap rounded-full border-[2px] px-3 py-[0.35rem] text-center text-[12px] font-black uppercase tracking-[0.12em] transition-none shadow-[0_2px_0_rgba(91,72,44,0.18),inset_0_1px_0_rgba(255,255,255,0.65)]",
              hakutapaNoticeVisible
                ? "border-[#c69624] bg-[#ffe68a] text-[#634100] shadow-[0_4px_12px_rgba(180,119,0,0.20)] animate-[ziiplyNoticePop_2200ms_ease-out_forwards]"
                : "border-[#d0b16d] bg-[#fff5cf] text-[#6a5a3f]",
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

        <button
          type="button"
          disabled={modeButtonsDisabled}
          onClick={() => onStoreModeChange("local")}
          className={buttonClass(localActive, modeButtonsDisabled)}
        >
          <span className="relative z-10">🏪 Lähikaupat</span>
        </button>
      </div>

      <div className="relative z-10 mt-5 grid grid-cols-2 gap-4">
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

      <div className="relative z-10 mt-2 min-h-[0.25rem] text-[12px] font-black leading-tight text-[#8b5f1e]">
        {storeCompareScope === "within_chain" && !withinChain && (
          <p>Valitse S-ryhmä tai K-ryhmä ketjun sisäistä vertailua varten.</p>
        )}
      </div>
    </section>
  );
}

export { ZiiplyMobileStoreModeSelector };
