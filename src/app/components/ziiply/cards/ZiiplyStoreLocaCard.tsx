"use client";

// V3_RESTORE_COMPASS_MAP_BUTTON: palautettu kompassi/karttanappi StoreLoca-korttiin onOpenMap-propilla.

import React from "react";

export type ZiiplyStoreLocaCardProps = {
  locationInput: string;
  onLocationInputChange: (value: string) => void;
  onApplyLocation?: () => void | Promise<void>;
  onUseOwnLocation?: () => void | Promise<void>;
  onDisableOwnLocation?: () => void;
  onOpenMap?: () => void;
  onOpenShops?: () => void;
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
  onOpenMap,
  onOpenShops,
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
        "ziiply-store-loca-card relative overflow-visible rounded-[2.1rem] border-[3px] border-[#b99d62] bg-gradient-to-b from-[#f7e9c3] via-[#f0d9a4] to-[#dfbf7e] p-4 shadow-[0_0_0_2px_#fff3cf_inset,0_7px_0_rgba(80,58,25,0.28),0_18px_28px_rgba(45,31,12,0.12)] ring-1 ring-[#fff7df]/80",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[1.8rem] opacity-[0.18] [background-image:radial-gradient(#b59c67_1.15px,transparent_1.15px)] [background-size:15px_15px]" />

      <p
        className="relative mb-2 text-[13px] font-black uppercase tracking-[0.34em] text-[#746742] drop-shadow-[0_1px_0_#fff7df]"
        style={{ fontFamily: copperplateFont }}
      >
        Kaupat ja sijainti
      </p>

      <div className="relative flex items-center gap-4">
        <button
          type="button"
          aria-pressed={usingOwnLocation}
          aria-label={usingOwnLocation ? "GPS käytössä" : "GPS pois päältä"}
          title={usingOwnLocation ? "GPS käytössä" : "GPS pois päältä"}
          onClick={handleGpsClick}
          className={cx(
            "flex h-[56px] w-[72px] shrink-0 items-center justify-center rounded-[1.35rem] border-2 text-2xl font-black shadow-[0_3px_0_rgba(91,72,44,0.16),inset_0_0_0_1px_rgba(255,255,255,0.65)] ring-1 transition active:scale-[0.98]",
            usingOwnLocation
              ? "border-[#9ac68d] bg-[#ecf9e8] text-green-700 ring-green-200"
              : "border-[#efc5c5] bg-[#fff1f1] text-red-700 ring-red-200",
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
          className="h-[56px] min-w-[220px] basis-[32%] rounded-[1.45rem] border-2 border-[#c6a86d] bg-[#fff9ea] px-5 text-base font-black text-[#27412a] shadow-[inset_0_2px_8px_rgba(91,65,28,0.10),0_1px_0_#fff6dc] outline-none placeholder:text-[#8b846f] focus:border-[#0b7f3a] focus:ring-4 focus:ring-[#c4dfbd]"
        />

        <button
          type="button"
          onClick={() => void onOpenMap?.()}
          disabled={!onOpenMap}
          aria-label="Avaa kartta ja reitit"
          title="Avaa kartta ja reitit"
          className={cx(
            "flex h-[56px] w-[72px] shrink-0 items-center justify-center rounded-[1.35rem] border-2 bg-[#fff9ea] text-[2rem] font-black text-[#143b24] shadow-[0_3px_0_rgba(91,72,44,0.16),inset_0_0_0_1px_rgba(255,255,255,0.65)] ring-1 ring-[#d6bf8f] transition hover:brightness-105 active:scale-[0.98]",
            !onOpenMap && "cursor-not-allowed opacity-45",
          )}
        >
          🧭
        </button>

        <button
          type="button"
          onClick={() => void onOpenShops?.()}
          className="ml-auto flex h-[74px] min-w-[250px] shrink-0 items-center justify-center gap-4 overflow-hidden rounded-[1.6rem] border-[3px] border-[#17452f] bg-gradient-to-b from-[#f8edc8] via-[#e2bf72] to-[#b98233] px-5 text-[#143b24] shadow-[0_6px_0_rgba(50,36,16,0.34),0_12px_18px_rgba(70,44,14,0.12),inset_0_0_0_2px_rgba(255,255,255,0.36)] transition hover:brightness-105 active:translate-y-[1px] active:shadow-[0_3px_0_rgba(50,36,16,0.34),inset_0_0_0_2px_rgba(255,255,255,0.36)]"
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
        <div className="pointer-events-none absolute left-4 top-[6px] z-30 inline-flex w-max max-w-none items-center justify-center whitespace-nowrap rounded-[1.05rem] border border-[#caa35d] bg-[#ffe9a8] px-5 py-1.5 text-[13px] font-black uppercase tracking-[0.14em] text-[#8a3f16] shadow-[0_3px_0_rgba(91,72,44,0.20),0_8px_18px_rgba(80,50,10,0.12)]">
          {statusText}
        </div>
      ) : null}
    </section>
  );
}

export { ZiiplyStoreLocaCard };
