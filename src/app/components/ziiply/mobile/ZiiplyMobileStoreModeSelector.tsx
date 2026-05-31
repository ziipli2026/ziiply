"use client";

// V8_RETRO_C_VISUAL_ONLY_STORE_SELECTOR:
// Vain visuaalinen C-tyylinen muutos. Toimintalogiikka, propsit ja handlerit jätetty ennalleen.

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

const cooperFont = '"Cooper Black", "Cooper Std Black", Georgia, serif';
const copperplateFont = '"Copperplate", "Baskerville", Georgia, serif';

function buttonClass(active: boolean, disabled = false, tone: "main" | "sub" = "main") {
  const base =
    tone === "main"
      ? "min-h-[3.25rem] rounded-[1.25rem] px-3 py-[0.52rem] text-[1.02rem]"
      : "min-h-[2.55rem] rounded-[1.05rem] px-3 py-[0.42rem] text-[0.95rem]";

  return [
    base,
    "relative overflow-hidden border-[2px] font-black leading-tight transition active:translate-y-[1px] active:scale-[0.992]",
    disabled ? "cursor-not-allowed opacity-55" : "",
    active
      ? "border-[#0b6330] bg-gradient-to-b from-[#119343] to-[#087236] text-[#fff4d5] shadow-[0_4px_0_#07572b,0_10px_20px_rgba(0,122,48,0.20),inset_0_0_0_2px_rgba(255,255,255,0.14)]"
      : "border-[#d8bd75] bg-gradient-to-b from-[#fff8df] to-[#f1dfad] text-[#6b5630] shadow-[0_3px_0_rgba(120,86,34,0.20),inset_0_0_0_2px_rgba(255,255,255,0.42)]",
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
    <section className="relative mx-auto w-full max-w-[390px] overflow-hidden rounded-[1.75rem] border-[2px] border-[#dec47d] bg-[#fbf0c9] px-3.5 pb-3 pt-3 text-[#163f33] shadow-[0_5px_0_rgba(92,65,25,0.14),0_14px_32px_rgba(15,23,42,0.08),inset_0_0_0_2px_rgba(255,255,255,0.34)]">
      <style>{`
        @keyframes ziiplyNoticePop {
          0% { opacity: 0; transform: scale(0.92); }
          12% { opacity: 1; transform: scale(1); }
          82% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.96); }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(#d8bd75_1px,transparent_1px)] [background-size:15px_15px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.50),transparent_60%)]" />

      <div className="relative z-10 grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={modeButtonsDisabled}
          onClick={() => onStoreModeChange("hyper")}
          className={buttonClass(hyperActive, modeButtonsDisabled)}
          style={{ fontFamily: cooperFont }}
        >
          🏬 Tavaratalot
        </button>

        <button
          type="button"
          disabled={modeButtonsDisabled}
          onClick={() => onStoreModeChange("local")}
          className={buttonClass(localActive, modeButtonsDisabled)}
          style={{ fontFamily: cooperFont }}
        >
          🏪 Lähikaupat
        </button>
      </div>

      <div className="relative z-10 mt-3 flex min-h-[1.75rem] items-center justify-center overflow-visible">
        <p
          className={[
            "relative z-10 whitespace-nowrap rounded-full px-3 py-[0.30rem] text-center text-[0.78rem] font-black uppercase tracking-[0.16em] transition-none",
            hakutapaNoticeVisible
              ? "border border-[#d6aa33] bg-[#ffe68a] text-[#634100] shadow-[0_4px_12px_rgba(180,119,0,0.20)] animate-[ziiplyNoticePop_2200ms_ease-out_forwards]"
              : "text-[#6f674f]",
          ].join(" ")}
          style={{ fontFamily: copperplateFont }}
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

      <div className="relative z-10 mt-2 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onStoreCompareScopeChange("between_chains")}
          className={buttonClass(storeCompareScope === "between_chains", false, "sub")}
          style={{ fontFamily: cooperFont }}
        >
          Ketjujen väliltä
        </button>

        <button
          type="button"
          onClick={() => onStoreCompareScopeChange("within_chain")}
          className={buttonClass(storeCompareScope === "within_chain", false, "sub")}
          style={{ fontFamily: cooperFont }}
        >
          Ketjun sisältä
        </button>
      </div>

      {storeCompareScope === "within_chain" && onWithinChainChange && (
        <div className="relative z-10 mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onWithinChainChange(withinChain === "S" ? null : "S")}
            className={buttonClass(withinChain === "S", false, "sub")}
            style={{ fontFamily: cooperFont }}
          >
            S-ryhmä
          </button>

          <button
            type="button"
            onClick={() => onWithinChainChange(withinChain === "K" ? null : "K")}
            className={buttonClass(withinChain === "K", false, "sub")}
            style={{ fontFamily: cooperFont }}
          >
            K-ryhmä
          </button>
        </div>
      )}

      <div className="relative z-10 mt-2 min-h-[0.25rem] text-[12px] font-black leading-tight text-[#8a6224]">
        {storeCompareScope === "within_chain" && !withinChain && (
          <p>Valitse S-ryhmä tai K-ryhmä ketjun sisäistä vertailua varten.</p>
        )}
      </div>
    </section>
  );
}

export { ZiiplyMobileStoreModeSelector };
