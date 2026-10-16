"use client";

// V640_RETRO_SHOPS_VISUAL_ONLY_REBUILT
// Rebuilt from original working shops view base.

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
  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#efe2bc] sm:hidden">
      <div className="h-[86px] shrink-0" aria-hidden="true" />

      <div className="relative z-[75] shrink-0 bg-[#efe2bc]/95 px-2 pb-1 pt-1 backdrop-blur">
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

      <div className="min-h-0 flex-1 space-y-2 overflow-x-hidden overflow-y-auto overscroll-contain px-2 pb-[calc(env(safe-area-inset-bottom)+112px)] pt-1 [-webkit-overflow-scrolling:touch]">
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

        <section className="rounded-[1.8rem] border-[2px] border-[#d1b47a] bg-[#f7edd0] p-2.5 shadow-[0_14px_32px_rgba(70,48,20,0.16)]">
          {storeCards}
        </section>
      </div>
    </div>
  );
}
