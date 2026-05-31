"use client";

// V4_RETRO_EMAMEL_LOCATION_BAR
// Mockupin mukainen location bar:
// - yhtenäisempi tumma vihreä ulkokehys
// - keskiosaan lämmin paperi/emaltti-paneeli
// - messinkiruuvit keskiosaan ja sivunappeihin
// - teksti tummemmaksi ja näkyvämmäksi
// - pinni/kompassi hillitymmiksi samaan sävymaailmaan
// - ei logiikkamuutoksia.

import React from "react";

export type ZiiplyStoreLocaCardProps = {
  locationInput: string;
  onLocationInputChange: (value: string) => void;
  onApplyLocation?: () => void | Promise<void>;
  onUseOwnLocation?: () => void | Promise<void>;
  onDisableOwnLocation?: () => void;
  onOpenShops?: () => void;
  onOpenMap?: () => void;
  usingOwnLocation?: boolean;
  locationMessage?: string;
  locationMessageVisible?: boolean;
  storeSearchLoading?: boolean;
  placeholder?: string;
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const cooperFont = '"Cooper Black", "Cooper Std Black", Georgia, serif';
const copperplateFont = '"Copperplate", "Baskerville", Georgia, serif';

export default function ZiiplyStoreLocaCard({
  locationInput,
  onLocationInputChange,
  onApplyLocation,
  onUseOwnLocation,
  onDisableOwnLocation,
  onOpenShops,
  onOpenMap,
  usingOwnLocation = false,
  locationMessage = "Kirjoita alue tai käytä omaa sijaintia.",
  locationMessageVisible = false,
  storeSearchLoading = false,
  placeholder = "05510 tai Hyvinkää",
  className,
}: ZiiplyStoreLocaCardProps) {
  const statusText = storeSearchLoading ? "HAETAAN KAUPPOJA..." : locationMessage;
  const showStatus = Boolean(locationMessageVisible && statusText.trim());

  const handleGpsClick = () => {
    if (usingOwnLocation) {
      onDisableOwnLocation?.();
      return;
    }

    onLocationInputChange("");
    void onUseOwnLocation?.();
  };

  return (
    <section
      className={cx(
        "ziiply-store-loca-card relative overflow-visible rounded-[2.05rem] border-[4px] border-[#0b4638] bg-[linear-gradient(180deg,#fffaf0_0%,#f7ebcf_48%,#ead2a0_100%)] p-[10px] shadow-[0_0_0_2px_rgba(255,255,255,0.70)_inset,0_5px_0_rgba(50,36,16,0.24),0_14px_24px_rgba(45,31,12,0.14)] ring-1 ring-[#fff7df]/80",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-[3px] rounded-[1.65rem] opacity-[0.10] [background-image:radial-gradient(#b59c67_1.05px,transparent_1.05px)] [background-size:14px_14px]" />

      <p
        className="sr-only"
        style={{ fontFamily: copperplateFont }}
      >
        Kaupat ja sijainti
      </p>

      <div className="relative flex items-center gap-[8px]">
        <button
          type="button"
          aria-pressed={usingOwnLocation}
          aria-label={usingOwnLocation ? "GPS käytössä" : "GPS pois päältä"}
          title={usingOwnLocation ? "GPS käytössä" : "GPS pois päältä"}
          onClick={handleGpsClick}
          className={cx(
            "relative flex h-[62px] w-[64px] shrink-0 items-center justify-center rounded-[1.35rem] border-2 text-2xl font-black shadow-[0_3px_0_rgba(91,72,44,0.16),inset_0_0_0_1px_rgba(255,255,255,0.72)] ring-1 transition active:scale-[0.98] before:pointer-events-none before:absolute before:left-[7px] before:top-[7px] before:h-[5px] before:w-[5px] before:rounded-full before:border before:border-[#b78e48] before:bg-[#f3df9f] after:pointer-events-none after:absolute after:right-[7px] after:top-[7px] after:h-[5px] after:w-[5px] after:rounded-full after:border after:border-[#b78e48] after:bg-[#f3df9f]",
            usingOwnLocation
              ? "border-[#9fc2a9] bg-[linear-gradient(180deg,#e9f7ea_0%,#cfe7d1_100%)] text-[#0b6f35] ring-[#d6f0dc]"
              : "border-[#b9d1bd] bg-[linear-gradient(180deg,#f2fff5_0%,#d8eee0_100%)] text-[#9b1c1c] ring-[#e6f5ea]",
          )}
        >
          📍
        </button>

        <input
          value={locationInput}
          onChange={(event) => onLocationInputChange(event.target.value)}
          onBlur={() => {
            if (locationInput.trim()) void onApplyLocation?.();
          }}
          placeholder={placeholder}
          className="h-[62px] min-w-[0px] flex-1 rounded-[1.35rem] border-2 border-[#b89454] bg-[linear-gradient(180deg,#fff6e1_0%,#f4dfac_54%,#ebca86_100%)] px-5 text-[22px] font-black leading-none text-[#241b13] shadow-[inset_0_2px_8px_rgba(91,65,28,0.16),inset_0_0_0_1px_rgba(255,255,255,0.74),0_2px_0_rgba(80,57,20,0.16)] outline-none placeholder:text-[#7d755f] focus:border-[#0b7f3a] focus:ring-4 focus:ring-[#c4dfbd]"
        />

        <button
          type="button"
          onClick={() => void onOpenMap?.()}
          className="relative flex h-[62px] w-[64px] shrink-0 items-center justify-center overflow-hidden rounded-[1.35rem] border-2 border-[#65a99c] bg-[linear-gradient(180deg,#b8e4dd_0%,#85c9bd_100%)] text-[#143b24] shadow-[0_3px_0_rgba(91,72,44,0.16),inset_0_0_0_1px_rgba(255,255,255,0.55)] ring-1 ring-[#c7f0e8] transition hover:brightness-105 active:scale-[0.98] before:pointer-events-none before:absolute before:left-[7px] before:top-[7px] before:z-10 before:h-[5px] before:w-[5px] before:rounded-full before:border before:border-[#b78e48] before:bg-[#f3df9f] after:pointer-events-none after:absolute after:right-[7px] after:top-[7px] after:z-10 after:h-[5px] after:w-[5px] after:rounded-full after:border after:border-[#b78e48] after:bg-[#f3df9f]"
          aria-label="Avaa kartta"
          title="Avaa kartta"
        >
          <img
            src="/icons/ziiply-compass.png"
            alt=""
            className="h-[52px] w-[52px] object-contain opacity-95 drop-shadow-[0_3px_5px_rgba(7,61,50,0.24)]"
            draggable={false}
          />
        </button>

        <button
          type="button"
          onClick={() => void onOpenShops?.()}
          className="ml-auto hidden h-[66px] min-w-[210px] shrink-0 items-center justify-center gap-3 overflow-hidden rounded-[1.45rem] border-[3px] border-[#17452f] bg-gradient-to-b from-[#f8edc8] via-[#e2bf72] to-[#b98233] px-4 text-[#143b24] shadow-[0_5px_0_rgba(50,36,16,0.30),0_10px_16px_rgba(70,44,14,0.10),inset_0_0_0_2px_rgba(255,255,255,0.36)] transition hover:brightness-105 active:translate-y-[1px] active:shadow-[0_3px_0_rgba(50,36,16,0.34),inset_0_0_0_2px_rgba(255,255,255,0.36)] sm:flex"
          style={{ fontFamily: cooperFont }}
          aria-label="Avaa kauppavalikot"
          title="Avaa kauppavalikot"
        >
          <span className="flex h-[58px] w-[112px] shrink-0 items-center justify-center overflow-hidden rounded-[1.15rem] border-2 border-[#194b31] bg-[#f5e1a7] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.36)]">
            <img
              src="/icons/storesel.png"
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          </span>
          <span className="flex flex-col items-start leading-none">
            <span
              className="text-[11px] font-black uppercase tracking-[0.28em] text-[#6f623f]"
              style={{ fontFamily: copperplateFont }}
            >
              Valitse
            </span>
            <span className="mt-1 text-[25px] font-black text-[#143b24] drop-shadow-[0_1px_0_#fff0c6]">
              Kaupat
            </span>
          </span>
        </button>
      </div>

      {showStatus ? (
        <div className="pointer-events-none absolute left-4 top-[-9px] z-30 inline-flex w-max max-w-none items-center justify-center whitespace-nowrap rounded-[1.05rem] border border-[#caa35d] bg-[#ffe9a8] px-4 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-[#8a3f16] shadow-[0_3px_0_rgba(91,72,44,0.20),0_8px_18px_rgba(80,50,10,0.12)]">
          {statusText}
        </div>
      ) : null}
    </section>
  );
}

export { ZiiplyStoreLocaCard };
