"use client";

// V8_RETRO_C_VISUAL_ONLY_STORE_MODE_SELECTOR
// Vain visuaalinen muutos: toiminnalliset propit, handlerit ja ehdot säilytetty.

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

function buttonClass(active: boolean, disabled = false) {
  return [
    "min-h-[2.72rem] rounded-[1.35rem] border-[2px] px-3 py-[0.48rem] text-[15px] font-black leading-tight transition active:translate-y-[1px] active:scale-[0.985]",
    disabled ? "cursor-not-allowed opacity-55" : "",
    active
      ? "border-[#06642f] bg-gradient-to-b from-[#079642] to-[#00792f] text-[#fff4d7] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.18),0_5px_0_#075126,0_10px_18px_rgba(0,105,48,0.18)]"
      : "border-[#d5b873] bg-gradient-to-b from-[#fff8df] to-[#f3e4b7] text-[#6f5630] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.45),0_3px_0_rgba(91,72,44,0.14)]",
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
    <section
      data-ziiply-store-mode-selector-version="V8_RETRO_C_VISUAL_ONLY"
      className="relative mx-auto w-full max-w-[390px] overflow-hidden rounded-[1.9rem] border-[2px] border-[#d9bd77] bg-[#f7edcb] px-4 pb-3 pt-3 text-[#123d32] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.34),0_8px_18px_rgba(91,72,44,0.10)]"
    >
      <style>{`
        @keyframes ziiplyNoticePop {
          0% { opacity: 0; transform: scale(0.92); }
          12% { opacity: 1; transform: scale(1); }
          82% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.96); }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:radial-gradient(#d8bd75_1.1px,transparent_1.1px)] [background-size:15px_15px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.58),transparent_58%)]" />

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

      <div className="relative z-10 mt-4 flex min-h-[1.55rem] items-center justify-center overflow-visible">
        <p
          className={[
            "relative z-10 whitespace-nowrap rounded-full px-3 py-[0.22rem] text-center text-[0.72rem] font-black uppercase tracking-[0.18em] transition-none",
            hakutapaNoticeVisible
              ? "bg-[#ffe68a] text-[#634100] shadow-[0_4px_12px_rgba(180,119,0,0.20)] ring-1 ring-[#d6aa33] animate-[ziiplyNoticePop_2200ms_ease-out_forwards]"
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

      <div className="relative z-10 mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onStoreCompareScopeChange("between_chains")}
          className={buttonClass(storeCompareScope === "between_chains")}
          style={{ fontFamily: cooperFont }}
        >
          Ketjujen väliltä
        </button>

        <button
          type="button"
          onClick={() => onStoreCompareScopeChange("within_chain")}
          className={buttonClass(storeCompareScope === "within_chain")}
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
            className={buttonClass(withinChain === "S")}
            style={{ fontFamily: cooperFont }}
          >
            S-ryhmä
          </button>

          <button
            type="button"
            onClick={() => onWithinChainChange(withinChain === "K" ? null : "K")}
            className={buttonClass(withinChain === "K")}
            style={{ fontFamily: cooperFont }}
          >
            K-ryhmä
          </button>
        </div>
      )}

      <div className="relative z-10 mt-2 min-h-[0.25rem] text-[12px] font-black leading-tight text-amber-700">
        {storeCompareScope === "within_chain" && !withinChain && (
          <p>Valitse S-ryhmä tai K-ryhmä ketjun sisäistä vertailua varten.</p>
        )}
      </div>
    </section>
  );
}

export { ZiiplyMobileStoreModeSelector };
