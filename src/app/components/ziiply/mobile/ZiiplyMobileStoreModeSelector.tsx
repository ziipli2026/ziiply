"use client";

import React from "react";
import type { StoreCompareScope, StoreMode } from "../ziiplyCore";

export type ZiiplyMobileStoreModeSelectorProps = {
  storeMode: StoreMode;
  storeModeChosen: boolean;
  storeCompareScope: StoreCompareScope;
  withinChain: "S" | "K" | null;
  selectedRealChainCount: number;
  missingStoresMessageVisible: boolean;
  foundStoresCount: number;
  onStoreModeChange: (mode: StoreMode) => void;
  onStoreCompareScopeChange: (scope: StoreCompareScope) => void;
};

function selectorClass(active: boolean, disabled = false) {
  return `min-h-[4.75rem] rounded-[1.45rem] px-3 text-[1.05rem] font-black tracking-[-0.03em] transition active:scale-[0.98] disabled:cursor-not-allowed ${
    active
      ? "bg-green-700 text-white shadow-[0_10px_22px_rgba(21,128,61,0.25)] ring-1 ring-black/10"
      : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
  } ${disabled ? "opacity-60" : ""}`;
}

export default function ZiiplyMobileStoreModeSelector({
  storeMode,
  storeModeChosen,
  storeCompareScope,
  withinChain,
  selectedRealChainCount,
  missingStoresMessageVisible,
  foundStoresCount,
  onStoreModeChange,
  onStoreCompareScopeChange,
}: ZiiplyMobileStoreModeSelectorProps) {
  return (
    <section className="rounded-[2rem] bg-white/96 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-white/80">
      <p className="mb-3 text-[0.92rem] font-black uppercase tracking-wide text-slate-500">
        Hakutapa
      </p>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={storeCompareScope === "within_chain"}
          onClick={() => onStoreModeChange("hyper")}
          className={selectorClass(
            storeCompareScope === "within_chain" ||
              (storeModeChosen && storeMode === "hyper"),
            storeCompareScope === "within_chain",
          )}
        >
          🏬 Tavaratalot
        </button>
        <button
          type="button"
          disabled={storeCompareScope === "within_chain"}
          onClick={() => onStoreModeChange("local")}
          className={selectorClass(
            storeCompareScope === "within_chain" ||
              (storeModeChosen && storeMode === "local"),
            storeCompareScope === "within_chain",
          )}
        >
          🏪 Lähikaupat
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onStoreCompareScopeChange("between_chains")}
          className={selectorClass(storeCompareScope === "between_chains")}
        >
          Ketjujen väliltä
        </button>
        <button
          type="button"
          onClick={() => onStoreCompareScopeChange("within_chain")}
          className={selectorClass(storeCompareScope === "within_chain")}
        >
          Ketjun sisältä
        </button>
      </div>

      <div className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200 empty:hidden">
        {storeCompareScope === "between_chains" && selectedRealChainCount < 2 ? (
          <p className="mt-2 rounded-xl bg-amber-50 px-4 py-3 font-black text-amber-800 ring-1 ring-amber-100">
            Vertailu ei ole mahdollinen vain yhdellä valitulla ketjulla.
          </p>
        ) : null}

        {storeCompareScope === "within_chain" && !withinChain ? (
          <p className="mt-2 rounded-xl bg-amber-50 px-4 py-3 font-black text-amber-800 ring-1 ring-amber-100">
            Valitse S-ryhmä tai K-ryhmä ketjun sisäistä vertailua varten.
          </p>
        ) : null}

        {missingStoresMessageVisible && foundStoresCount === 0 ? (
          <p className="mt-2 text-amber-700">
            Hae alue tai käytä omaa sijaintia, niin Ziiply hakee kaupat dynaamisesti.
          </p>
        ) : null}
      </div>
    </section>
  );
}

export { ZiiplyMobileStoreModeSelector };
