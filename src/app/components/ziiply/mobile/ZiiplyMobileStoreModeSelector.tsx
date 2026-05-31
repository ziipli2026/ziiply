"use client";

// V640_RETRO_SHOPS_VISUAL_ONLY_REBUILT
// Rebuilt from original working selector base.

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
};

function buttonClass(active: boolean, disabled = false) {
  return [
    "min-h-[42px] rounded-[1.15rem] border-[2px] border-[#b89454] px-3 py-[0.52rem] text-[15px] font-black leading-tight transition active:scale-[0.985]",
    disabled ? "cursor-not-allowed opacity-60" : "",
    active
      ? "bg-gradient-to-b from-[#148344] to-[#0b5d31] text-[#fff7df] shadow-[0_6px_14px_rgba(0,0,0,0.18)]"
      : "bg-[#fff6dc] text-[#5a4630] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
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

  useEffect(() => {
    const shouldShow =
      hyperStorePairMissing ||
      (missingStoresMessageVisible && foundStoresCount === 0) ||
      (storeCompareScope === "between_chains" && selectedRealChainCount < 2);

    if (!shouldShow) return;

    setHakutapaNoticeVisible(true);

    const timer = window.setTimeout(() => {
      setHakutapaNoticeVisible(false);
    }, 2200);

    return () => window.clearTimeout(timer);
  }, [
    hyperStorePairMissing,
    missingStoresMessageVisible,
    foundStoresCount,
    storeCompareScope,
    selectedRealChainCount,
  ]);

  return (
    <section className="mx-auto w-full max-w-[390px] rounded-[1.9rem] border-[2px] border-[#d4bb84] bg-[#f6ebc8] px-4 pb-4 pt-3 shadow-[0_10px_28px_rgba(60,42,18,0.14)]">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <button
          type="button"
          onClick={() => onStoreModeChange("hyper")}
          className={buttonClass(hyperActive)}
        >
          🏬 Tavaratalot
        </button>

        <div className="flex items-center justify-center">
          <p
            className={[
              "rounded-full px-3 py-[0.35rem] text-[11px] font-black uppercase tracking-[0.14em]",
              hakutapaNoticeVisible
                ? "bg-[#ffe28d] text-[#674400]"
                : "text-[#756347]",
            ].join(" ")}
          >
            Hakutapa
          </p>
        </div>

        <button
          type="button"
          onClick={() => onStoreModeChange("local")}
          className={buttonClass(localActive)}
        >
          🏪 Lähikaupat
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4">
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
        <div className="mt-4 grid grid-cols-2 gap-4">
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
    </section>
  );
}
