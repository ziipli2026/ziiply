"use client";

// V5_STEP1_VISUAL_BG_ONLY_FROM_SHOPSVIEW_4:
// Muutettu vain ShopsViewin visuaalinen tausta ja kauppakorttialueen koristekerros.
// Ei muutoksia propseihin, callbackeihin, storeCards-renderöintiin tai selectorin toimintaan.

import React from "react";
import type { ReactNode } from "react";
import type { StoreCompareScope, StoreMode } from "../ziiplyCore";
import ZiiplyMobileLocationBar from "./ZiiplyMobileLocationBar";
import ZiiplyMobileStoreModeSelector from "./ZiiplyMobileStoreModeSelector";

export type ZiiplyMobileShopsViewProps = {
  locationInput: string;
  usingOwnLocation: boolean;
  storeSearchLoading: boolean;
  gpsErrorMessage?: string;
  storeMode: StoreMode;
  storeModeChosen: boolean;
  storeCompareScope: StoreCompareScope;
  withinChain: "S" | "K" | null;
  selectedRealChainCount: number;
  missingStoresMessageVisible: boolean;
  foundStoresCount: number;
  storeCards: ReactNode;
  onLocationInputChange: (value: string) => void;
  onGpsClick: () => void;
  onApplyLocation: () => void | Promise<void>;
  onStoreModeChange: (mode: StoreMode) => void;
  onStoreCompareScopeChange: (scope: StoreCompareScope) => void;
};

export default function ZiiplyMobileShopsView({
  locationInput,
  usingOwnLocation,
  storeSearchLoading,
  gpsErrorMessage,
  storeMode,
  storeModeChosen,
  storeCompareScope,
  withinChain,
  selectedRealChainCount,
  missingStoresMessageVisible,
  foundStoresCount,
  storeCards,
  onLocationInputChange,
  onGpsClick,
  onApplyLocation,
  onStoreModeChange,
  onStoreCompareScopeChange,
}: ZiiplyMobileShopsViewProps) {
  const isLocalMode = storeMode === "local";

  return (
    <div
      className={[
        "relative h-[100svh] overflow-hidden sm:hidden",
        isLocalMode ? "bg-[#f4ead0]" : "bg-[#eef5df]",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 z-0 opacity-80">
        <div className="absolute inset-0 [background-image:radial-gradient(rgba(154,124,67,0.16)_1px,transparent_1px)] [background-size:15px_15px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.72),transparent_56%)]" />
        <div
          className={[
            "absolute left-1/2 top-[8.9rem] h-[11.4rem] w-[21.5rem] -translate-x-1/2 rounded-[2rem] border-[3px] opacity-[0.18] shadow-[inset_0_0_0_3px_rgba(255,255,255,0.55)]",
            isLocalMode
              ? "border-[#8f6e35] bg-[linear-gradient(180deg,#d4a65e_0%,#ead09a_42%,#b87442_43%,#b87442_55%,#e8d0a0_56%,#f5e5bd_100%)]"
              : "border-[#6f9866] bg-[linear-gradient(180deg,#d7e4bf_0%,#edf3d7_38%,#8fae76_39%,#8fae76_50%,#f4edcc_51%,#f8f1d3_100%)]",
          ].join(" ")}
        />
      </div>

      <div className="relative z-10 h-[86px]" aria-hidden="true" />

      <div className="sticky top-[86px] z-[75] bg-[#f6ebc6]/90 px-2 pb-1 pt-1 backdrop-blur">
        <ZiiplyMobileLocationBar
          locationInput={locationInput}
          usingOwnLocation={usingOwnLocation}
          storeSearchLoading={storeSearchLoading}
          gpsErrorMessage={gpsErrorMessage}
          onLocationInputChange={onLocationInputChange}
          onGpsClick={onGpsClick}
          onApplyLocation={onApplyLocation}
        />
      </div>

      <div className="relative z-10 space-y-2 overflow-hidden px-2 pb-0 pt-1">
        <ZiiplyMobileStoreModeSelector
          storeMode={storeMode}
          storeModeChosen={storeModeChosen}
          storeCompareScope={storeCompareScope}
          withinChain={withinChain}
          selectedRealChainCount={selectedRealChainCount}
          missingStoresMessageVisible={missingStoresMessageVisible}
          foundStoresCount={foundStoresCount}
          onStoreModeChange={onStoreModeChange}
          onStoreCompareScopeChange={onStoreCompareScopeChange}
        />

        <section
          className={`relative overflow-hidden rounded-[1.85rem] border-[2px] border-[#ead9a8] bg-[#f6ebc6]/94 shadow-[inset_0_0_0_2px_rgba(216,189,117,0.28),0_14px_36px_rgba(91,72,44,0.10)] ${
            storeMode === "local"
              ? "pt-4 pb-2.5 px-2.5"
              : "p-2.5"
          }`}
        >
          <div className="pointer-events-none absolute inset-0 z-0">
            <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(#d8bd75_1.05px,transparent_1.05px)] [background-size:16px_16px]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.55),transparent_58%)]" />
            <div
              className={[
                "absolute -right-8 top-3 h-[8.8rem] w-[13.5rem] rounded-[1.35rem] border-[3px] opacity-[0.16] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.5)]",
                isLocalMode
                  ? "border-[#8a6c36] bg-[linear-gradient(180deg,#b87943_0%,#d6a463_34%,#f2d89c_35%,#f2d89c_48%,#a96a3e_49%,#a96a3e_58%,#ecd6a7_59%,#f8e8bd_100%)]"
                  : "border-[#719261] bg-[linear-gradient(180deg,#8aa86f_0%,#cbd9aa_34%,#f2eac6_35%,#f2eac6_48%,#739b68_49%,#739b68_58%,#f8f0cf_59%,#fff6d7_100%)]",
              ].join(" ")}
            />
          </div>

          <div className="relative z-10">
            {storeCards}
          </div>
        </section>
      </div>
    </div>
  );
}

export { ZiiplyMobileShopsView };
