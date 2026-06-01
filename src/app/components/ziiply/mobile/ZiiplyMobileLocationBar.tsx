"use client";

// V6_SUBTLE_RETRO_LOCATIONBAR_ORIGINAL_BASE
// Lähtökohtana alkuperäinen ZiiplyMobileLocationBar-3.tsx.
// Korjaus on hillitty:
// - alkuperäinen korkeus ja layout säilyvät
// - ei tekstin leikkautumista
// - vain lämmin retro/emaltti-sävytys
// - GPS- ja kompassinappi hillitymmin samaan ilmeeseen
// - ei logiikkamuutoksia.

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
      <div className="mx-auto grid h-[72px] w-full grid-cols-[58px_minmax(0,1fr)_86px] items-center gap-2 rounded-[1.7rem] border border-[#ead8ad] bg-[linear-gradient(180deg,#fffdf7_0%,#f7f0df_100%)] p-2 shadow-[0_10px_26px_rgba(92,64,26,0.12),inset_0_1px_0_rgba(255,255,255,0.90)] ring-1 ring-white/80">
        <button
          type="button"
          onClick={onGpsClick}
          onMouseDown={(event) => event.preventDefault()}
          className="grid h-[56px] w-[56px] place-items-center rounded-[1.25rem] border-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.78),0_2px_6px_rgba(20,40,30,0.08)] transition-transform duration-150 active:scale-95"
          style={gpsButtonStyle}
          aria-label={usingOwnLocation ? "GPS päällä" : "GPS pois päältä"}
        >
          <span className="text-[26px] leading-none drop-shadow-sm">📍</span>
        </button>

        <div className="min-w-0 rounded-[1.25rem] border-[2px] border-[#cfd8e6] bg-[linear-gradient(180deg,#fffdfa_0%,#f7fafc_100%)] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_1px_0_rgba(255,246,220,0.75)]">
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
            className="block h-[27px] w-full min-w-0 bg-transparent text-[17px] font-black leading-none text-[#1f2d44] outline-none placeholder:text-[#9aa8bb]"
          />

          <div
            className={`mt-[1px] truncate text-[11px] font-black leading-none tracking-[-0.02em] [text-shadow:0_1px_0_rgba(255,255,255,0.78)] ${
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
          className="group grid h-[56px] w-[86px] place-items-center overflow-visible rounded-[1.25rem] border border-[#72bfb4] bg-[linear-gradient(180deg,#b8e7df_0%,#9fd8d0_100%)] shadow-[0_8px_18px_rgba(7,61,50,0.15),inset_0_1px_0_rgba(255,255,255,0.62)] ring-1 ring-[#6dbbb2] transition-transform duration-150 active:scale-95"
          aria-label="Avaa kartta"
        >
          <img
            src="/icons/ziiply-compass.png"
            alt=""
            className="h-[60px] w-[60px] object-contain drop-shadow-[0_3px_6px_rgba(7,61,50,0.30)] transition-transform duration-150 group-hover:scale-105 group-active:scale-95"
            draggable={false}
          />
        </button>
      </div>
    </section>
  );
}

export { ZiiplyMobileLocationBar };
