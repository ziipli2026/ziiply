"use client";

// V5_RETRO_C_VISUAL_ONLY_SHOPS_VIEW:
// Vain visuaalinen C-tyylinen muutos. StoreCards-toiminnot ja kaikki handlerit jätetty ennalleen.

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

const hyperMarketBackground =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 180'%3E%3Cg fill='none' stroke='%237c5a24' stroke-width='3' opacity='.16' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M34 124h352M50 124V70l160-38 160 38v54M80 124V84h64v40M178 124V80h64v44M276 124V84h64v40'/%3E%3Cpath d='M64 70h292M114 54h190M34 140h352'/%3E%3C/g%3E%3C/svg%3E\")";

const localVillageBackground =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 420 180'%3E%3Cg fill='none' stroke='%237c5a24' stroke-width='3' opacity='.18' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M38 124h344M66 124V78l70-38 70 38v46M218 124V70h120v54'/%3E%3Cpath d='M54 78h166M230 70l48-34 76 34M94 124V92h42v32M158 124V94h28v30M250 124V90h66v34M340 124V92h22'/%3E%3Cpath d='M82 60h108M242 70h110M54 140h328'/%3E%3C/g%3E%3C/svg%3E\")";

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
  const isLocal = storeMode === "local";

  return (
    <div className="h-[100svh] overflow-hidden bg-[#eaf7f1] sm:hidden">
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
          className={`relative isolate overflow-hidden rounded-[1.75rem] border-[2px] border-[#dec47d] bg-[#fbf0c9] shadow-[0_6px_0_rgba(92,65,25,0.16),0_16px_38px_rgba(15,23,42,0.10),inset_0_0_0_2px_rgba(255,255,255,0.36)] ${
            isLocal ? "pt-4 pb-2.5 px-2.5" : "p-2.5"
          }`}
        >
          <div className="pointer-events-none absolute inset-0 z-0 opacity-42 [background-image:radial-gradient(#d8bd75_1px,transparent_1px)] [background-size:15px_15px]" />
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.56),transparent_58%)]" />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-4 top-[5.4rem] z-0 h-[8.8rem] rounded-[1.35rem] bg-center bg-no-repeat opacity-100 mix-blend-multiply ${
              isLocal ? "bg-[length:86%_auto]" : "bg-[length:92%_auto]"
            }`}
            style={{
              backgroundImage: isLocal ? localVillageBackground : hyperMarketBackground,
            }}
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-6 top-[6.15rem] z-0 h-[6.8rem] rounded-[1.4rem] ${
              isLocal
                ? "bg-gradient-to-b from-[#fff6d9]/20 via-[#f4db9f]/22 to-transparent"
                : "bg-gradient-to-b from-[#fff6d9]/16 via-[#e7d4a1]/18 to-transparent"
            }`}
          />

          <div className="relative z-10">{storeCards}</div>
        </section>
      </div>
    </div>
  );
}

export { ZiiplyMobileShopsView };
