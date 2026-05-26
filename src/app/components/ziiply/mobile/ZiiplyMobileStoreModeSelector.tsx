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

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ModeButtonProps = {
  active: boolean;
  disabled?: boolean;
  icon?: string;
  children: React.ReactNode;
  onClick: () => void;
};

function ModeButton({
  active,
  disabled = false,
  icon,
  children,
  onClick,
}: ModeButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "flex h-[34px] min-w-0 items-center justify-center gap-1 rounded-[0.95rem] border px-2 text-[13px] font-black leading-none tracking-[-0.02em] shadow-[0_1px_0_rgba(15,23,42,0.05)] ring-1 transition active:scale-[0.985]",
        active
          ? "border-[#087536] bg-[#058b3b] text-white ring-[#047333]/30 shadow-[0_4px_10px_rgba(5,139,59,0.12)]"
          : "border-[#dfe6ee] bg-white text-[#1f2b42] ring-slate-100",
        disabled && "cursor-not-allowed opacity-45 grayscale",
      )}
    >
      {icon ? <span className="text-[15px] leading-none">{icon}</span> : null}
      <span className="truncate">{children}</span>
    </button>
  );
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
  const showBetweenChainsWarning =
    storeCompareScope === "between_chains" && selectedRealChainCount < 2;

  const showWithinChainWarning =
    storeCompareScope === "within_chain" && !withinChain;

  const showMissingStoresHint =
    missingStoresMessageVisible && foundStoresCount === 0;

  return (
    <section className="rounded-[1.35rem] bg-white/96 px-3 py-2 shadow-[0_10px_26px_rgba(15,23,42,0.07)] ring-1 ring-white/80">
      <div className="mb-1.5 flex items-center justify-between px-0.5">
        <h2 className="text-[15px] font-black uppercase leading-none tracking-[0.06em] text-[#6b7890]">
          Hakutapa
        </h2>

        {(showBetweenChainsWarning || showWithinChainWarning || showMissingStoresHint) && (
          <span className="max-w-[58%] truncate text-right text-[9px] font-black leading-none text-[#9a6a21]">
            {showBetweenChainsWarning
              ? "Valitse 2 ketjua"
              : showWithinChainWarning
                ? "Valitse ketju"
                : "Hae alue ensin"}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        <ModeButton
          active={storeModeChosen && storeMode === "hyper"}
          icon="🏬"
          onClick={() => onStoreModeChange("hyper")}
        >
          Tavaratalot
        </ModeButton>

        <ModeButton
          active={storeModeChosen && storeMode === "local"}
          disabled={storeCompareScope === "within_chain"}
          icon="🏪"
          onClick={() => onStoreModeChange("local")}
        >
          Lähikaupat
        </ModeButton>

        <ModeButton
          active={storeCompareScope === "between_chains"}
          onClick={() => onStoreCompareScopeChange("between_chains")}
        >
          Ketjujen väliltä
        </ModeButton>

        <ModeButton
          active={storeCompareScope === "within_chain"}
          onClick={() => onStoreCompareScopeChange("within_chain")}
        >
          Ketjun sisältä
        </ModeButton>
      </div>
    </section>
  );
}

export { ZiiplyMobileStoreModeSelector };
