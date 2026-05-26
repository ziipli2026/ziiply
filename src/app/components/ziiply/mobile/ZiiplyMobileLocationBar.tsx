"use client";

import React from "react";

export type ZiiplyMobileLocationBarProps = {
  locationInput: string;
  usingOwnLocation: boolean;
  storeSearchLoading: boolean;
  gpsErrorMessage?: string;
  onLocationInputChange: (value: string) => void;
  onGpsClick: () => void;
  onApplyLocation: () => void | Promise<void>;
};

export default function ZiiplyMobileLocationBar({
  locationInput,
  usingOwnLocation,
  storeSearchLoading,
  gpsErrorMessage,
  onLocationInputChange,
  onGpsClick,
  onApplyLocation,
}: ZiiplyMobileLocationBarProps) {
  return (
    <section className="rounded-[1.9rem] bg-white/96 px-3 py-2 shadow-[0_14px_36px_rgba(15,23,42,0.10)] ring-1 ring-white/80">
      <div className="flex h-[64px] items-center gap-2">
        <button
          type="button"
          onClick={onGpsClick}
          className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-[1.3rem] border-2 border-[#d7f1dd] bg-[#eef9f0] text-[28px] shadow-inner active:scale-[0.98]"
          aria-label="Käytä GPS-sijaintia"
        >
          📍
        </button>

        <input
          value={locationInput}
          onChange={(event) => onLocationInputChange(event.target.value)}
          placeholder="05510 tai Hyvinkää"
          className="h-[56px] min-w-0 flex-1 rounded-[1.3rem] border-2 border-[#d7dfec] bg-[#fcfcff] px-4 text-[18px] font-black tracking-[-0.02em] text-[#324255] outline-none placeholder:text-[#96a2b7]"
        />

        <button
          type="button"
          onClick={onApplyLocation}
          disabled={storeSearchLoading}
          className="flex h-[56px] shrink-0 items-center justify-center rounded-[1.3rem] bg-[#03133f] px-5 text-[18px] font-black text-white shadow-[0_8px_24px_rgba(3,19,63,0.22)] active:scale-[0.98] disabled:opacity-60"
        >
          {storeSearchLoading ? "..." : "Käytä"}
        </button>
      </div>

      {usingOwnLocation && (
        <div className="mt-1 pl-1 text-[11px] font-bold text-[#3d8654]">
          Käytetään nykyistä sijaintia
        </div>
      )}

      {gpsErrorMessage && (
        <div className="mt-1 pl-1 text-[11px] font-bold text-[#b42318]">
          {gpsErrorMessage}
        </div>
      )}
    </section>
  );
}

export { ZiiplyMobileLocationBar };
