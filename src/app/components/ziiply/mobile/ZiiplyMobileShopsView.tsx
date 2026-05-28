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
  gpsStatusText?: string;
  storeMode: StoreMode;
  storeModeChosen: boolean;
  storeCompareScope: StoreCompareScope;
  withinChain: "S" | "K" | null;
  selectedRealChainCount: number;
  missingStoresMessageVisible: boolean;
  foundStoresCount: number;
  hyperStorePairMissing?: boolean;
  storeCards: ReactNode;
  onLocationInputChange: (value: string) => void;
  onGpsClick: () => void;
  onApplyLocation: () => void | Promise<void>;
  onOpenMap?: () => void | Promise<void>;
  onStoreModeChange: (mode: StoreMode) => void;
  onStoreCompareScopeChange: (scope: StoreCompareScope) => void;
  onWithinChainChange?: (chain: "S" | "K" | null) => void;
};

export default function ZiiplyMobileShopsView({
  locationInput,
  usingOwnLocation,
  storeSearchLoading,
  gpsErrorMessage,
  gpsStatusText,
  storeMode,
  storeModeChosen,
  storeCompareScope,
  withinChain,
  selectedRealChainCount,
  missingStoresMessageVisible,
  foundStoresCount,
  hyperStorePairMissing,
  storeCards,
  onLocationInputChange,
  onGpsClick,
  onApplyLocation,
  onOpenMap,
  onStoreModeChange,
  onStoreCompareScopeChange,
  onWithinChainChange,
}: ZiiplyMobileShopsViewProps) {
  return (
    <div className="w-full sm:hidden">
      {/* V408_SHOPS_VIEW_BAR_SCALE_REPAIR:
          Palautetaan palkkien alkuperäinen mittakaava:
          - topbarin alle spacer
          - location omassa taskussa
          - hakutapa omassa kortissa
          - ei h-[100svh], ei overflow-hidden koko näkymässä */}
      <div className="h-[86px]" aria-hidden="true" />

      <div className="mx-auto flex w-full max-w-[390px] flex-col gap-2.5 px-2">
        <div className="rounded-[1.7rem] bg-white/95 p-1.5 shadow-[0_10px_26px_rgba(15,23,42,0.10)] ring-1 ring-white/80">
          <ZiiplyMobileLocationBar
            locationInput={locationInput}
            usingOwnLocation={usingOwnLocation}
            storeSearchLoading={storeSearchLoading}
            gpsErrorMessage={gpsErrorMessage}
            gpsStatusText={gpsStatusText}
            onLocationInputChange={onLocationInputChange}
            onGpsClick={onGpsClick}
            onApplyLocation={onApplyLocation}
            onOpenMap={onOpenMap}
          />
        </div>

        <div className="rounded-[1.9rem] bg-white/95 p-0 shadow-[0_10px_26px_rgba(15,23,42,0.10)] ring-1 ring-white/80">
          <ZiiplyMobileStoreModeSelector
            storeMode={storeMode}
            storeModeChosen={storeModeChosen}
            storeCompareScope={storeCompareScope}
            withinChain={withinChain}
            selectedRealChainCount={selectedRealChainCount}
            missingStoresMessageVisible={missingStoresMessageVisible}
            foundStoresCount={foundStoresCount}
            hyperStorePairMissing={hyperStorePairMissing}
            onStoreModeChange={onStoreModeChange}
            onStoreCompareScopeChange={onStoreCompareScopeChange}
            onWithinChainChange={onWithinChainChange}
          />
        </div>

        <section className="rounded-[1.75rem] bg-white/96 p-2.5 shadow-[0_14px_36px_rgba(15,23,42,0.08)] ring-1 ring-white/80">
          {storeCards}
        </section>
      </div>
    </div>
  );
}

export { ZiiplyMobileShopsView };
