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
      {/* V406_SHOPS_VIEW_LAYOUT_RESET:
          Ei omaa h-[100svh]/sticky/top-spacer-rakennetta.
          Page.tsx hoitaa overlayn; tämä komponentti hoitaa vain Kaupat-sisällön. */}
      <div className="mx-auto flex w-full max-w-[390px] flex-col gap-2.5 px-0">
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

        <section className="rounded-[1.75rem] bg-white/96 p-2.5 shadow-[0_14px_36px_rgba(15,23,42,0.08)] ring-1 ring-white/80">
          {storeCards}
        </section>
      </div>
    </div>
  );
}

export { ZiiplyMobileShopsView };
