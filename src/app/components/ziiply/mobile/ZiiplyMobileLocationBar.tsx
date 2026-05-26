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
    <section className="rounded-[1.45rem] bg-white/96 px-2.5 py-1.5 shadow-[0_10px_26px_rgba(15,23,42,0.10)] ring-1 ring-white/80">
      <div className="flex h-[48px] items-center gap-2">
        <button
          type="button"
          onClick={onGpsClick}
          className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[1.05rem] border-2 border-[#d7f1dd] bg-[#eef9f0] text-[23px] shadow-inner active:scale-[0.98]"
          aria-label="Käytä GPS-sijaintia"
        >
          📍
        </button>

        <input
          value={locationInput}
          onChange={(event) => onLocationInputChange(event.target.value)}
          placeholder="05510 tai Hyvinkää"
          className="h-[44px] min-w-0 flex-1 rounded-[1.05rem] border-2 border-[#d7dfec] bg-[#fcfcff] px-3 text-[15px] font-black tracking-[-0.02em] text-[#324255] outline-none placeholder:text-[#96a2b7]"
        />

        <button
          type="button"
          onClick={onApplyLocation}
          disabled={storeSearchLoading}
          className="flex h-[44px] shrink-0 items-center justify-center rounded-[1.05rem] bg-[#03133f] px-4 text-[15px] font-black text-white shadow-[0_7px_18px_rgba(3,19,63,0.20)] active:scale-[0.98] disabled:opacity-60"
        >
          {storeSearchLoading ? "..." : "Käytä"}
        </button>
      </div>

      {(usingOwnLocation || gpsErrorMessage) && (
        <div
          className={[
            "mt-0.5 truncate pl-1 text-[10px] font-black leading-none",
            gpsErrorMessage ? "text-[#b42318]" : "text-[#3d8654]",
          ].join(" ")}
        >
          {gpsErrorMessage || "Käytetään nykyistä sijaintia"}
        </div>
      )}
    </section>
  );
}

export { ZiiplyMobileLocationBar };
