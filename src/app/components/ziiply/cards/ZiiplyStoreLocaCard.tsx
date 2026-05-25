"use client";

import React from "react";

export type ZiiplyStoreLocaCardProps = {
  locationInput: string;
  onLocationInputChange: (value: string) => void;
  onApplyLocation?: () => void | Promise<void>;
  onUseOwnLocation?: () => void | Promise<void>;
  onDisableOwnLocation?: () => void;
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

      <div className="relative flex items-center gap-3">
        <button
          type="button"
          aria-pressed={usingOwnLocation}
          aria-label={usingOwnLocation ? "GPS käytössä" : "GPS pois päältä"}
          title={usingOwnLocation ? "GPS käytössä" : "GPS pois päältä"}
          onClick={handleGpsClick}
          className={cx(
            "flex h-[46px] w-[64px] shrink-0 items-center justify-center rounded-2xl text-xl font-black shadow-sm ring-1 transition active:scale-[0.98]",
            usingOwnLocation
              ? "bg-green-50 text-green-700 ring-green-200"
              : "bg-red-50 text-red-700 ring-red-200",
          )}
        >
          📍
        </button>

        <input
          value={locationInput}
          onChange={(event) => onLocationInputChange(event.target.value)}
          placeholder={placeholder}
          className="min-w-0 flex-1 rounded-[1.35rem] border-2 border-[#c6a86d] bg-[#fff9ea] px-5 py-3 text-base font-black text-[#27412a] shadow-[inset_0_2px_8px_rgba(91,65,28,0.10),0_1px_0_#fff6dc] outline-none placeholder:text-[#8b846f] focus:border-[#0b7f3a] focus:ring-4 focus:ring-[#c4dfbd]"
        />

        <button
          type="button"
          onClick={() => void onApplyLocation?.()}
          className="rounded-[1.35rem] border-[3px] border-[#7a6338] bg-gradient-to-b from-[#f0d39a] to-[#c89a52] px-8 py-3 text-base font-black text-[#26351f] shadow-[0_4px_0_rgba(91,72,44,0.30),inset_0_0_0_2px_rgba(255,255,255,0.35)] transition hover:brightness-105 active:translate-y-[1px] active:shadow-[0_2px_0_rgba(91,72,44,0.30),inset_0_0_0_2px_rgba(255,255,255,0.35)]"
          style={{ fontFamily: cooperFont }}
        >
          Käytä
        </button>

        <span className="hidden h-[46px] min-w-[1px] 2xl:block" aria-hidden="true" />
      </div>

      {showStatus ? (
        <div className="pointer-events-none absolute left-1/2 top-[22px] z-20 inline-flex w-max max-w-[calc(100%-220px)] -translate-x-1/2 items-center justify-center whitespace-nowrap rounded-[1.05rem] border border-[#caa35d] bg-[#ffe9a8] px-5 py-1.5 text-[13px] font-black uppercase tracking-[0.14em] text-[#8a3f16] shadow-[0_3px_0_rgba(91,72,44,0.20),0_8px_18px_rgba(80,50,10,0.12)]">
          <span className="block max-w-full truncate">{statusText}</span>
        </div>
      ) : null}
    </section>
  );
}

export { ZiiplyStoreLocaCard };
