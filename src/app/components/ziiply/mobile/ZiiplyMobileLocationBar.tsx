"use client";

// V432_NO_MAP_LOCATION_FALLBACK: kompassi ei fallbackaa sijaintihakuun; avaa vain kartan.

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
  const rawStatusText =
    gpsErrorMessage ||
    gpsStatusText ||
    (usingOwnLocation ? "Paikannetaan GPS…" : "GPS pois päältä.");

  const statusText =
    rawStatusText === "GPS pois päältä. Kirjoita alue tai postinumero."
      ? "GPS pois päältä."
      : rawStatusText;

  const gpsButtonStyle: React.CSSProperties = {
    borderColor: usingOwnLocation ? "#b7efcf" : "#ef4444",
    background: usingOwnLocation ? "#eafff2" : "#fff1f1",
    boxShadow: usingOwnLocation
      ? "0 0 0 2px rgba(34,197,94,0.14)"
      : "0 0 0 2px rgba(239,68,68,0.22)",
  };

  const handleMapClick = () => {
    // Kompassi/karttanappi ei saa koskaan käynnistää GPS- tai sijaintihakua.
    // Jos kartta-overlayä ei ole annettu, nappi ei tee mitään.
    if (onOpenMap) {
      void onOpenMap();
    }
  };

  return (
    <section className="w-full">
      <div className="mx-auto grid h-[82px] w-full grid-cols-[64px_minmax(0,1fr)_92px] items-center gap-3 rounded-[2rem] bg-[#f5f1e4] p-[8px] shadow-[0_14px_34px_rgba(90,62,24,0.18),inset_0_2px_0_rgba(255,255,255,0.75)] ring-[3px] ring-[#efe6c9] border-[2px] border-[#d8c08a]">
        <button
          type="button"
          onClick={onGpsClick}
          onMouseDown={(event) => event.preventDefault()}
          className="grid h-[62px] w-[62px] place-items-center rounded-[1.55rem] border-[3px] transition-transform duration-150 active:scale-95 shadow-[0_5px_12px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.7)]"
          style={gpsButtonStyle}
          aria-label={usingOwnLocation ? "GPS päällä" : "GPS pois päältä"}
        >
          <span className="text-[26px] leading-none drop-shadow-sm">📍</span>
        </button>

        <div className="min-w-0 rounded-[1.7rem] border-[3px] border-[#cfd7e6] bg-[#f8fafc] px-4 py-[10px] shadow-[inset_0_2px_0_rgba(255,255,255,0.95),0_2px_8px_rgba(148,163,184,0.10)]">
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
            className="block h-[28px] w-full min-w-0 bg-transparent text-[18px] font-black tracking-[-0.03em] leading-none text-[#24324a] outline-none placeholder:text-[#a5b4c8]"
          />

          <div
            className={`mt-[3px] truncate text-[12px] font-black leading-none tracking-[-0.02em] ${
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
          className="group grid h-[62px] w-[92px] place-items-center overflow-visible rounded-[1.55rem] bg-[linear-gradient(180deg,#b7ebe5_0%,#8fd4cb_100%)] border-[2px] border-[#6dbbb2] shadow-[0_8px_18px_rgba(7,61,50,0.18),inset_0_1px_0_rgba(255,255,255,0.55)] ring-1 ring-[#6dbbb2] transition-transform duration-150 active:scale-95"
          aria-label="Avaa kartta"
        >
          <img
            src="/icons/ziiply-compass.png"
            alt=""
            className="h-[64px] w-[64px] object-contain drop-shadow-[0_3px_7px_rgba(7,61,50,0.38)] transition-transform duration-150 group-hover:scale-105 group-active:scale-95"
            draggable={false}
          />
        </button>
      </div>
    </section>
  );
}

export { ZiiplyMobileLocationBar };
