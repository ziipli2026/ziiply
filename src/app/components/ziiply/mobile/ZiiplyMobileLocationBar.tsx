"use client";

// V7_DEBUG_DIRECT_RETRO_LOCATIONBAR
// TARKOITUKSELLA ERITTÄIN NÄKYVÄ DEBUG/MOCKUP.
// Jos ruudulla ei näy violettia "LOCATION DEBUG V7" -merkkiä,
// tämä komponentti EI ole se layeri, jota ruutu käyttää.
// Ei logiikkamuutoksia.

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

const cooperFont = '"Cooper Black", "Cooper Std Black", Georgia, serif';

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
    (usingOwnLocation ? "Hyvinkää käytössä" : "GPS pois päältä.");

  const statusText =
    rawStatusText === "GPS pois päältä. Kirjoita alue tai postinumero."
      ? "GPS pois päältä."
      : rawStatusText;

  const handleMapClick = () => {
    if (onOpenMap) void onOpenMap();
  };

  return (
    <section className="relative w-full">
      <div className="pointer-events-none absolute -top-[13px] left-[18px] z-[80] rounded-full border-2 border-black bg-[#e100ff] px-3 py-[2px] text-[10px] font-black uppercase tracking-[0.08em] text-white shadow-[0_3px_0_rgba(0,0,0,0.35)]">
        LOCATION DEBUG V7
      </div>

      <div className="relative mx-auto grid h-[86px] w-full grid-cols-[70px_minmax(0,1fr)_96px] items-center gap-[10px] rounded-[2.05rem] border-[4px] border-[#0b4638] bg-[linear-gradient(180deg,#fffdf5_0%,#f9efd4_52%,#e9d09a_100%)] p-[8px] shadow-[0_0_0_2px_rgba(255,255,255,0.78)_inset,0_6px_0_rgba(54,39,17,0.24),0_15px_28px_rgba(50,34,12,0.15)]">
        <div className="pointer-events-none absolute inset-[7px] rounded-[1.65rem] border border-[#ead09a] opacity-80" />

        <button
          type="button"
          onClick={onGpsClick}
          onMouseDown={(event) => event.preventDefault()}
          className={`relative z-10 grid h-[66px] w-[66px] place-items-center rounded-[1.45rem] border-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_3px_8px_rgba(7,61,50,0.12)] active:scale-95 ${
            usingOwnLocation
              ? "border-[#93cfa5] bg-[linear-gradient(180deg,#effff4_0%,#cdebd5_100%)]"
              : "border-[#b9d1bd] bg-[linear-gradient(180deg,#effff4_0%,#d8eee0_100%)]"
          }`}
          aria-label={usingOwnLocation ? "GPS päällä" : "GPS pois päältä"}
        >
          <span className="pointer-events-none absolute left-[7px] top-[7px] h-[5px] w-[5px] rounded-full border border-[#a98545] bg-[#f3df9f]" />
          <span className="pointer-events-none absolute right-[7px] top-[7px] h-[5px] w-[5px] rounded-full border border-[#a98545] bg-[#f3df9f]" />
          <span className="pointer-events-none absolute left-[7px] bottom-[7px] h-[5px] w-[5px] rounded-full border border-[#a98545] bg-[#f3df9f]" />
          <span className="pointer-events-none absolute right-[7px] bottom-[7px] h-[5px] w-[5px] rounded-full border border-[#a98545] bg-[#f3df9f]" />
          <span className="text-[28px] leading-none drop-shadow-sm">📍</span>
        </button>

        <div className="relative z-10 min-w-0 rounded-[1.55rem] border-[2px] border-[#b89552] bg-[linear-gradient(180deg,#fff7e3_0%,#f4dfac_54%,#ebca86_100%)] px-4 py-[8px] shadow-[inset_0_2px_8px_rgba(91,65,28,0.15),inset_0_0_0_1px_rgba(255,255,255,0.70),0_2px_0_rgba(80,57,20,0.15)]">
          <span className="pointer-events-none absolute left-[9px] top-[9px] h-[6px] w-[6px] rounded-full border border-[#9e793d] bg-[#e6c46f]" />
          <span className="pointer-events-none absolute right-[9px] top-[9px] h-[6px] w-[6px] rounded-full border border-[#9e793d] bg-[#e6c46f]" />
          <span className="pointer-events-none absolute left-[9px] bottom-[9px] h-[6px] w-[6px] rounded-full border border-[#9e793d] bg-[#e6c46f]" />
          <span className="pointer-events-none absolute right-[9px] bottom-[9px] h-[6px] w-[6px] rounded-full border border-[#9e793d] bg-[#e6c46f]" />

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
            className="block h-[31px] w-full min-w-0 bg-transparent text-center text-[22px] font-black leading-none tracking-[-0.03em] text-[#241b13] outline-none placeholder:text-[#6f6651]"
            style={{ fontFamily: cooperFont }}
          />

          <div
            className={`mt-[3px] truncate text-center text-[13px] font-black leading-none tracking-[-0.02em] [text-shadow:0_1px_0_rgba(255,255,255,0.78)] ${
              gpsErrorMessage
                ? "text-[#b91c1c]"
                : usingOwnLocation
                  ? "text-[#0b6f35]"
                  : "text-[#b91c1c]"
            }`}
          >
            {storeSearchLoading ? "Haetaan kauppoja…" : statusText}
          </div>
        </div>

        <button
          type="button"
          onClick={handleMapClick}
          className="group relative z-10 grid h-[66px] w-[96px] place-items-center overflow-visible rounded-[1.45rem] border-[2px] border-[#65a99c] bg-[linear-gradient(180deg,#b8e4dd_0%,#85c9bd_100%)] shadow-[0_4px_10px_rgba(7,61,50,0.16),inset_0_1px_0_rgba(255,255,255,0.60)] ring-1 ring-[#c7f0e8] active:scale-95"
          aria-label="Avaa kartta"
        >
          <span className="pointer-events-none absolute left-[8px] top-[8px] h-[5px] w-[5px] rounded-full border border-[#a98545] bg-[#f3df9f]" />
          <span className="pointer-events-none absolute right-[8px] top-[8px] h-[5px] w-[5px] rounded-full border border-[#a98545] bg-[#f3df9f]" />
          <span className="pointer-events-none absolute left-[8px] bottom-[8px] h-[5px] w-[5px] rounded-full border border-[#a98545] bg-[#f3df9f]" />
          <span className="pointer-events-none absolute right-[8px] bottom-[8px] h-[5px] w-[5px] rounded-full border border-[#a98545] bg-[#f3df9f]" />
          <img
            src="/icons/ziiply-compass.png"
            alt=""
            className="h-[58px] w-[58px] object-contain drop-shadow-[0_3px_6px_rgba(7,61,50,0.28)] transition-transform duration-150 group-hover:scale-105 group-active:scale-95"
            draggable={false}
          />
        </button>
      </div>
    </section>
  );
}

export { ZiiplyMobileLocationBar };
