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
  const statusText = gpsErrorMessage
    ? gpsErrorMessage
    : usingOwnLocation
      ? "Käytetään nykyistä sijaintia"
      : "";

  return (
    <section className="rounded-[1.45rem] bg-white/96 px-2.5 py-1.5 shadow-[0_10px_26px_rgba(15,23,42,0.10)] ring-1 ring-white/80">
      <div className="flex h-[56px] items-stretch gap-2">
        <button
          type="button"
          onClick={onGpsClick}
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center self-center rounded-[1.05rem] border-2 border-[#d7f1dd] bg-[#eef9f0] text-[25px] shadow-inner active:scale-[0.98]"
          aria-label="Käytä GPS-sijaintia"
        >
          📍
        </button>

        <div className="relative min-w-0 flex-1">
          <input
            value={locationInput}
            onChange={(event) => onLocationInputChange(event.target.value)}
            placeholder="05510 tai Hyvinkää"
            className={[
              "h-[52px] w-full rounded-[1.05rem] border-2 border-[#d7dfec] bg-[#fcfcff] px-3 font-black tracking-[-0.02em] text-[#324255] outline-none placeholder:text-[#96a2b7]",
              statusText ? "pb-[17px] pt-1 text-[15px]" : "py-0 text-[16px]",
            ].join(" ")}
          />

          {statusText && (
            <div
              className={[
                "pointer-events-none absolute inset-x-[12px] bottom-[7px] truncate text-[10px] font-black leading-none",
                gpsErrorMessage ? "text-[#b42318]" : "text-[#3d8654]",
              ].join(" ")}
            >
              {statusText}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onApplyLocation}
          disabled={storeSearchLoading}
          className="flex h-[52px] shrink-0 items-center justify-center self-center rounded-[1.05rem] bg-[#03133f] px-4 text-[15px] font-black text-white shadow-[0_7px_18px_rgba(3,19,63,0.20)] active:scale-[0.98] disabled:opacity-60"
        >
          {storeSearchLoading ? "..." : "Käytä"}
        </button>
      </div>
    </section>
  );
}

export { ZiiplyMobileLocationBar };
