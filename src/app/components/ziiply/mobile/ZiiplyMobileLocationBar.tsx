"use client";

// V10_LOCATIONBAR_SEAM_AND_PLACEHOLDER_FIX
// Pohjana V9.
// Korjaus:
// - poistettu näkyvät ylä-/alasaumat location barin ympäriltä
// - ulkokehän shadowa pehmennetty
// - keskikentälle lisää todellista leveyttä
// - placeholder pienemmäksi ja tiukemmaksi, jotta "05510 tai Hyvinkää" näkyy kokonaan
// - GPS/kompassi säilyvät V8/V9-tyylisinä
// - ei logiikka-, state- tai handler-muutoksia.

// V9_LOCATIONBAR_FINAL_POLISH
// Pohjana toimiva V8/V7-debug-haara.
// Korjaus:
// - debug-merkki poistettu
// - keskikentän teksti mahtuu kokonaan paremmin
// - GPS päällä/pois säilyy selvästi vihreä/punainen
// - location bar hieman rauhallisempi ja vähemmän päälleliimattu
// - ei logiikka-, state- tai handler-muutoksia.

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
      <div className="relative mx-auto grid h-[82px] w-full grid-cols-[60px_minmax(0,1fr)_82px] items-center gap-[7px] rounded-[2.05rem] border-[4px] border-[#0b4638] bg-[linear-gradient(180deg,#fffdf5_0%,#f9efd4_56%,#ecd39d_100%)] p-[8px] shadow-[0_0_0_1px_rgba(255,255,255,0.58)_inset,0_3px_0_rgba(54,39,17,0.14),0_8px_16px_rgba(50,34,12,0.09)]">
        <div className="pointer-events-none absolute inset-[7px] rounded-[1.65rem] border border-[#ead09a]/35 opacity-35" />

        <button
          type="button"
          onClick={onGpsClick}
          onMouseDown={(event) => event.preventDefault()}
          className={`relative z-10 grid h-[60px] w-[60px] place-items-center rounded-[1.45rem] border-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_3px_8px_rgba(7,61,50,0.12)] active:scale-95 ${
            usingOwnLocation
              ? "border-[#2f9f58] bg-[linear-gradient(180deg,#ebfff0_0%,#98dfad_100%)] ring-4 ring-[#7ee39c]/40"
              : "border-[#c77a7a] bg-[linear-gradient(180deg,#fff1f1_0%,#f0caca_100%)] opacity-95"
          }`}
          aria-label={usingOwnLocation ? "GPS päällä" : "GPS pois päältä"}
        >
          <span className="pointer-events-none absolute left-[7px] top-[7px] h-[5px] w-[5px] rounded-full border border-[#a98545] bg-[#f3df9f]" />
          <span className="pointer-events-none absolute right-[7px] top-[7px] h-[5px] w-[5px] rounded-full border border-[#a98545] bg-[#f3df9f]" />
          <span className="pointer-events-none absolute left-[7px] bottom-[7px] h-[5px] w-[5px] rounded-full border border-[#a98545] bg-[#f3df9f]" />
          <span className="pointer-events-none absolute right-[7px] bottom-[7px] h-[5px] w-[5px] rounded-full border border-[#a98545] bg-[#f3df9f]" />
          <div className="relative h-[34px] w-[22px]">
            <div
              className={`absolute left-1/2 top-0 h-[20px] w-[20px] -translate-x-1/2 rounded-full border-2 ${
                usingOwnLocation
                  ? "border-[#176b2f] bg-[#35d05d] shadow-[0_0_10px_rgba(53,208,93,0.65)]"
                  : "border-[#8b1d1d] bg-[#e53935] shadow-[0_0_8px_rgba(229,57,53,0.45)]"
              }`}
            />
            <div className="absolute left-1/2 top-[16px] h-[16px] w-[2px] -translate-x-1/2 rounded-full bg-[#5a4030]" />
          </div>
        </button>

        <div className="relative z-10 min-w-0 rounded-[1.42rem] border-[2px] border-[#b89552] bg-[linear-gradient(180deg,#fff7e3_0%,#f4dfac_54%,#ebca86_100%)] px-[8px] py-[8px] shadow-[inset_0_2px_8px_rgba(91,65,28,0.15),inset_0_0_0_1px_rgba(255,255,255,0.70),0_2px_0_rgba(80,57,20,0.15)]">
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
            className="block h-[30px] w-full min-w-0 bg-transparent text-center text-[15px] font-black leading-none tracking-[-0.065em] text-[#241b13] outline-none placeholder:text-[#6f6651] placeholder:text-[15px]"
            style={{ fontFamily: cooperFont }}
          />

          <div
            className={`mt-[3px] truncate text-center text-[11.5px] font-black leading-none tracking-[-0.02em] [text-shadow:0_1px_0_rgba(255,255,255,0.78)] ${
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
          className="group relative z-10 grid h-[60px] w-[82px] place-items-center overflow-visible rounded-[1.45rem] border-[2px] border-[#65a99c] bg-[linear-gradient(180deg,#b8e4dd_0%,#85c9bd_100%)] shadow-[0_4px_10px_rgba(7,61,50,0.16),inset_0_1px_0_rgba(255,255,255,0.60)] ring-1 ring-[#c7f0e8] active:scale-95"
          aria-label="Avaa kartta"
        >
          <span className="pointer-events-none absolute left-[8px] top-[8px] h-[5px] w-[5px] rounded-full border border-[#a98545] bg-[#f3df9f]" />
          <span className="pointer-events-none absolute right-[8px] top-[8px] h-[5px] w-[5px] rounded-full border border-[#a98545] bg-[#f3df9f]" />
          <span className="pointer-events-none absolute left-[8px] bottom-[8px] h-[5px] w-[5px] rounded-full border border-[#a98545] bg-[#f3df9f]" />
          <span className="pointer-events-none absolute right-[8px] bottom-[8px] h-[5px] w-[5px] rounded-full border border-[#a98545] bg-[#f3df9f]" />
          <img
            src="/icons/ziiply-compass.png"
            alt=""
            className="h-[50px] w-[50px] object-contain drop-shadow-[0_3px_6px_rgba(7,61,50,0.28)] transition-transform duration-150 group-hover:scale-105 group-active:scale-95"
            draggable={false}
          />
        </button>
      </div>
    </section>
  );
}

export { ZiiplyMobileLocationBar };
