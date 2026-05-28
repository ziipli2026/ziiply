"use client";

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
    "min-h-[38px] rounded-[1.25rem] px-3 py-[0.48rem] text-[15px] font-black leading-tight transition active:scale-[0.985]",
    disabled ? "cursor-not-allowed opacity-60" : "",
    active
      ? "bg-[#008c35] text-white shadow-[0_8px_18px_rgba(0,140,53,0.22)] ring-1 ring-black/10"
      : "bg-white text-slate-700 ring-1 ring-slate-200",
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

  useEffect(() => {
    if (!hyperStorePairMissing) return;

    setHakutapaNoticeVisible(true);
    const timer = window.setTimeout(() => {
      setHakutapaNoticeVisible(false);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [hyperStorePairMissing]);

  return (
    <section className="mx-auto w-full max-w-[390px] rounded-[1.9rem] bg-white px-4 pb-3 pt-3 shadow-[0_6px_18px_rgba(15,23,42,0.10)] ring-1 ring-slate-100">
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

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <button
          type="button"
          disabled={modeButtonsDisabled}
          onClick={() => onStoreModeChange("hyper")}
          className={buttonClass(hyperActive, modeButtonsDisabled)}
        >
          🏬 Tavaratalot
        </button>

        <div className="relative flex min-h-[32px] items-center justify-center overflow-hidden">
          <p
            className={[
              "relative z-10 whitespace-nowrap rounded-full px-3 py-1 text-center text-[14px] font-black uppercase tracking-wide transition-all duration-200",
              hakutapaNoticeVisible
                ? "bg-[#ffe68a] text-[#634100] shadow-[0_4px_12px_rgba(180,119,0,0.20)] ring-1 ring-[#d6aa33] animate-[ziiplyNoticePop_2200ms_ease-out_forwards]"
                : "text-slate-500",
            ].join(" ")}
          >
            {hakutapaNoticeVisible
              ? "Vertailuparia ei löytynyt"
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
          🏪 Lähikaupat
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onStoreCompareScopeChange("between_chains")}
          className={buttonClass(storeCompareScope === "between_chains")}
        >
          Ketjujen väliltä
        </button>

        <button
          type="button"
          onClick={() => onStoreCompareScopeChange("within_chain")}
          className={buttonClass(storeCompareScope === "within_chain")}
        >
          Ketjun sisältä
        </button>
      </div>

      {storeCompareScope === "within_chain" && onWithinChainChange && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onWithinChainChange(withinChain === "S" ? null : "S")}
            className={buttonClass(withinChain === "S")}
          >
            S-ryhmä
          </button>

          <button
            type="button"
            onClick={() => onWithinChainChange(withinChain === "K" ? null : "K")}
            className={buttonClass(withinChain === "K")}
          >
            K-ryhmä
          </button>
        </div>
      )}

      <div className="mt-2 min-h-[0.25rem] text-[12px] font-black leading-tight text-amber-700">

        {storeCompareScope === "within_chain" && !withinChain && (
          <p>Valitse S-ryhmä tai K-ryhmä ketjun sisäistä vertailua varten.</p>
        )}
        {missingStoresMessageVisible && foundStoresCount === 0 && (
          <p>Hae alue tai käytä omaa sijaintia ensin.</p>
        )}

      </div>
    </section>
  );
}

export { ZiiplyMobileStoreModeSelector };
