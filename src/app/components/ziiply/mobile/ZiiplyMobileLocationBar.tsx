"use client";

// V430_LOCATIONBAR_CLEAN_REBUILD:
// Puhdas build-kelpoinen versio. GPS-nappi on/off-väreillä ja kompassinappi merilasi/aquamarine-taustalla.

import React from "react";

export type ZiiplyMobileLocationBarProps = {
  locationInput: string;
  usingOwnLocation: boolean;
  storeSearchLoading: boolean;
  gpsErrorMessage?: string;
  gpsStatusText?: string;
  onLocationInputChange: (value: string) => void;
  onGpsClick: () => void;
  onApplyLocation: () => void | Promise<void>;
  onOpenMap?: () => void | Promise<void>;
};

export default function ZiiplyMobileLocationBar({
  locationInput,
  usingOwnLocation,
  storeSearchLoading,
  gpsErrorMessage,
  gpsStatusText,
  onLocationInputChange,
  onGpsClick,
  onApplyLocation,
  onOpenMap,
}: ZiiplyMobileLocationBarProps) {
  const statusText =
    gpsErrorMessage ||
    gpsStatusText ||
    (usingOwnLocation ? "Paikannetaan GPS…" : "GPS pois päältä.");

  const gpsButtonStyle: React.CSSProperties = {
    borderColor: usingOwnLocation ? "#b7efcf" : "#ef4444",
    background: usingOwnLocation ? "#eafff2" : "#fff1f1",
    boxShadow: usingOwnLocation
      ? "0 0 0 2px rgba(34,197,94,0.14)"
      : "0 0 0 2px rgba(239,68,68,0.22)",
  };

  const handleMapClick = () => {
    if (onOpenMap) {
      void onOpenMap();
      return;
    }

    void onApplyLocation();
  };

  return (
    <section className="w-full">
      <div className="mx-auto grid h-[72px] w-full grid-cols-[58px_minmax(0,1fr)_86px] items-center gap-2 rounded-[1.7rem] bg-white/96 p-2 shadow-[0_10px_26px_rgba(15,23,42,0.10)] ring-1 ring-white/80">
        <button
          type="button"
          onClick={onGpsClick}
          onMouseDown={(event) => event.preventDefault()}
          className="grid h-[56px] w-[56px] place-items-center rounded-[1.25rem] border-2 transition-transform duration-150 active:scale-95"
          style={gpsButtonStyle}
          aria-label={usingOwnLocation ? "GPS päällä" : "GPS pois päältä"}
        >
          <span className="text-[26px] leading-none drop-shadow-sm">📍</span>
        </button>

        <div className="min-w-0 rounded-[1.25rem] border-[2px] border-[#d7dfec] bg-white/90 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <input
            value={locationInput}
            onChange={(event) => onLocationInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur();
                void onApplyLocation();
              }
            }}
            placeholder="05510 tai Hyvinkää"
            className="block h-[27px] w-full min-w-0 bg-transparent text-[18px] font-black leading-none text-[#17223b] outline-none placeholder:text-[#94a3b8]"
          />

          <div
            className={`mt-[1px] truncate text-[12px] font-black leading-none ${
              gpsErrorMessage
                ? "text-[#dc2626]"
                : usingOwnLocation
                  ? "text-[#087a3a]"
                  : "text-[#b91c1c]"
            }`}
          >
            {storeSearchLoading ? "Haetaan kauppoja…" : statusText}
          </div>
        </div>

        <button
          type="button"
          onClick={handleMapClick}
          className="group grid h-[56px] w-[86px] place-items-center rounded-[1.25rem] bg-[#9fd8d0] shadow-[0_8px_18px_rgba(7,61,50,0.18),inset_0_1px_0_rgba(255,255,255,0.55)] ring-1 ring-[#6dbbb2] transition-transform duration-150 active:scale-95"
          aria-label="Avaa kartta"
        >
          <img
            src="/icons/ziiply-compass.png"
            alt=""
            className="h-11 w-11 object-contain drop-shadow-[0_2px_5px_rgba(7,61,50,0.35)] transition-transform duration-150 group-hover:scale-105 group-active:scale-95"
            draggable={false}
          />
        </button>
      </div>
    </section>
  );
}

export { ZiiplyMobileLocationBar };
