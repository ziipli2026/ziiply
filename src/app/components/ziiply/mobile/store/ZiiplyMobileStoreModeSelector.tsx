"use client";

import React from "react";

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
  onStoreModeChange: (mode: StoreMode) => void;
  onStoreCompareScopeChange: (scope: StoreCompareScope) => void;
  onWithinChainChange?: (chain: "S" | "K" | null) => void;
  [key: string]: unknown;
};

function buttonClass(active: boolean, disabled = false) {
  return [
    "rounded-[1.25rem] px-3 py-[0.48rem] text-[15px] font-black leading-tight transition active:scale-[0.985]",
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
  onStoreModeChange,
  onStoreCompareScopeChange,
  onWithinChainChange,
}: Props) {
  const hyperActive = storeModeChosen && storeMode === "hyper";
  const localActive = storeModeChosen && storeMode === "local";
  const modeButtonsDisabled = storeCompareScope === "within_chain";

  return (
    <section className="rounded-[1.9rem] bg-white px-4 pb-3 pt-3 shadow-[0_6px_18px_rgba(15,23,42,0.10)] ring-1 ring-slate-100">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <button
          type="button"
          disabled={modeButtonsDisabled}
          onClick={() => onStoreModeChange("hyper")}
          className={buttonClass(hyperActive, modeButtonsDisabled)}
        >
          🏬 Tavaratalot
        </button>

        <p className="whitespace-nowrap text-center text-[15px] font-black uppercase tracking-wide text-slate-500">
          Hakutapa
        </p>

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
        {storeCompareScope === "between_chains" && selectedRealChainCount < 2 && (
          <p>Vertailu ei ole mahdollinen vain yhdellä valitulla ketjulla.</p>
        )}
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
