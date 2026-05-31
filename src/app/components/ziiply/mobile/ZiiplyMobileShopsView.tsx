"use client";

// V6_RETRO_C_VISUAL_ONLY_SHOPS_VIEW
// Vain ulkoasu: komponenttien toiminnallinen rakenne, propit ja handlerit säilytetty.

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
      data-ziiply-mobile-shops-view-version="V6_RETRO_C_VISUAL_ONLY"
      className="h-[100svh] overflow-hidden bg-[#eaf7f1] sm:hidden"
    >
      <div className="h-[86px]" aria-hidden="true" />

      <div className="sticky top-[86px] z-[75] bg-[#eaf7f1]/95 px-2 pb-1 pt-1 backdrop-blur">
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

      <div className="space-y-2 overflow-hidden px-2 pb-0 pt-1">
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
          data-store-mode={isLocalMode ? "local" : "hyper"}
          className={`relative isolate overflow-hidden rounded-[1.9rem] border-[2px] border-[#d9bd77] bg-[#f7edcb] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.34),0_14px_34px_rgba(91,72,44,0.14)] ring-1 ring-white/70 ${
            isLocalMode ? "px-2.5 pb-2.5 pt-4" : "p-2.5"
          }`}
        >
          <div className="pointer-events-none absolute inset-0 z-0 opacity-40 [background-image:radial-gradient(#d8bd75_1.1px,transparent_1.1px)] [background-size:15px_15px]" />
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.55),transparent_58%)]" />

          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-3 top-[7.2rem] z-0 h-[8.2rem] rounded-[1.4rem] border border-[#d8bd75]/35 bg-center bg-no-repeat opacity-[0.20] mix-blend-multiply ${
              isLocalMode ? "ziiply-village-shop-bg" : "ziiply-department-store-bg"
            }`}
          />

          <style>{`
            .ziiply-department-store-bg {
              background-size: 92% auto;
              background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 260'%3E%3Cg fill='none' stroke='%23896d34' stroke-width='7' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M80 205h740'/%3E%3Cpath d='M135 205V92h630v113'/%3E%3Cpath d='M170 92 450 38l280 54'/%3E%3Cpath d='M208 205v-72h76v72M360 205v-78h180v78M616 205v-72h76v72'/%3E%3Cpath d='M191 112h518M236 70v-28h95v15M580 70V42h95v15'/%3E%3Cpath d='M397 164h106'/%3E%3C/g%3E%3Ctext x='450' y='105' text-anchor='middle' font-family='Georgia' font-size='46' font-weight='700' fill='%23896d34'%3ETAVARATALO%3C/text%3E%3C/svg%3E");
            }
            .ziiply-village-shop-bg {
              background-size: 92% auto;
              background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 900 260'%3E%3Cg fill='none' stroke='%23896d34' stroke-width='7' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M90 210h720'/%3E%3Cpath d='M145 210V100h520v110'/%3E%3Cpath d='M120 100 405 42l285 58'/%3E%3Cpath d='M660 210v-78h95v78'/%3E%3Cpath d='M197 210v-60h84v60M330 210v-60h84v60M463 210v-60h84v60'/%3E%3Cpath d='M178 119h465M712 132h58M712 158h58M712 184h58'/%3E%3Cpath d='M250 76v-33h85v16'/%3E%3C/g%3E%3Ctext x='405' y='105' text-anchor='middle' font-family='Georgia' font-size='44' font-weight='700' fill='%23896d34'%3EKYLÄKAUPPA%3C/text%3E%3C/svg%3E");
            }
          `}</style>

          <div className="relative z-10">
            {storeCards}
          </div>
        </section>
      </div>
    </div>
  );
}

export { ZiiplyMobileShopsView };
