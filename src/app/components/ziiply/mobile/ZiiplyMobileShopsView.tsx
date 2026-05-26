"use client";

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
    <div className="sm:hidden">
      <div className="h-[74px]" aria-hidden="true" />

      <div className="sticky top-[74px] z-[75] bg-[#eaf7f1]/95 px-2 pb-1 pt-0 backdrop-blur">
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

      <div className="space-y-3 px-2 pb-[140px] pt-1">
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

        <section className="rounded-[1.75rem] bg-white/96 p-3 shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-white/80">
          {storeCards}
        </section>
      </div>
    </div>
  );
}

export { ZiiplyMobileShopsView };
