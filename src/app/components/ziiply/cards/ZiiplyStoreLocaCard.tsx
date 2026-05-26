"use client";

import React from "react";

export type ZiiplyStoreLocaCardProps = {
  locationInput: string;
  onLocationInputChange: (value: string) => void;
  onApplyLocation?: () => void | Promise<void>;
  onUseOwnLocation?: () => void | Promise<void>;
  onDisableOwnLocation?: () => void;
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

function AssistantBadge({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <div className="flex h-[216px] w-[216px] shrink-0 items-center justify-center overflow-hidden bg-[#f7e9c3] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.35)]">
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="h-full w-full object-contain"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}

export default function ZiiplyStoreLocaCard({
  locationInput,
  onLocationInputChange,
  onApplyLocation,
  onUseOwnLocation,
  onDisableOwnLocation,
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
        "ziiply-store-loca-card relative overflow-hidden rounded-[2.1rem] border-[3px] border-[#b99d62] bg-gradient-to-b from-[#f7e9c3] via-[#f0d9a4] to-[#dfbf7e] px-[35px] py-[36px] shadow-[0_0_0_2px_#fff3cf_inset,0_7px_0_rgba(80,58,25,0.28),0_18px_28px_rgba(45,31,12,0.12)] ring-1 ring-[#fff7df]/80",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[1.8rem] opacity-[0.18] [background-image:radial-gradient(#b59c67_1.15px,transparent_1.15px)] [background-size:15px_15px]" />

      <div className="relative z-10 grid h-[216px] grid-cols-[550px_310px_432px] items-center justify-center gap-[22px]">
        <div className="relative h-full min-w-0">
          <p
            className="absolute left-[8px] top-[10px] m-0 text-[20px] font-black uppercase leading-none tracking-[0.42em] text-[#746742] drop-shadow-[0_1px_0_#fff7df]"
            style={{ fontFamily: copperplateFont }}
          >
            Sijainti
          </p>

          <div className="absolute left-0 top-[70px] flex h-[112px] w-full items-center gap-[34px]">
            <button
              type="button"
              aria-pressed={usingOwnLocation}
              aria-label={usingOwnLocation ? "GPS käytössä" : "GPS pois päältä"}
              title={usingOwnLocation ? "GPS käytössä" : "GPS pois päältä"}
              onClick={handleGpsClick}
              className={cx(
                "flex h-[112px] w-[144px] shrink-0 items-center justify-center rounded-[2.15rem] border-[3px] text-[36px] font-black shadow-[0_4px_0_rgba(91,72,44,0.16),inset_0_0_0_2px_rgba(255,255,255,0.65)] ring-1 transition active:scale-[0.98]",
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
              className="h-[112px] min-w-0 flex-1 rounded-[2.15rem] border-[3px] border-[#c6a86d] bg-[#fff9ea] px-[40px] text-[30px] font-black leading-none text-[#27412a] shadow-[inset_0_2px_8px_rgba(91,65,28,0.10),0_1px_0_#fff6dc] outline-none placeholder:text-[#8b846f] focus:border-[#0b7f3a] focus:ring-4 focus:ring-[#c4dfbd]"
            />
          </div>
        </div>

        <div className="relative h-full min-w-0">
          <p
            className="absolute left-1/2 top-[10px] m-0 -translate-x-1/2 text-center text-[20px] font-black uppercase leading-none tracking-[0.42em] text-[#746742] drop-shadow-[0_1px_0_#fff7df]"
            style={{ fontFamily: copperplateFont }}
          >
            Kaupat
          </p>

          <button
            type="button"
            onClick={() => void onOpenShops?.()}
            className="absolute left-0 top-[50px] flex h-[146px] w-full shrink-0 items-center justify-center overflow-hidden rounded-[2.05rem] border-[5px] border-[#17452f] bg-gradient-to-b from-[#f8edc8] via-[#e2bf72] to-[#b98233] p-[10px] text-[#143b24] shadow-[0_6px_0_rgba(50,36,16,0.34),0_12px_18px_rgba(70,44,14,0.12),inset_0_0_0_2px_rgba(255,255,255,0.36)] transition hover:brightness-105 active:translate-y-[1px] active:shadow-[0_3px_0_rgba(50,36,16,0.34),inset_0_0_0_2px_rgba(255,255,255,0.36)]"
            style={{ fontFamily: cooperFont }}
            aria-label="Avaa kauppavalikot"
            title="Avaa kauppavalikot"
          >
            <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-[1.45rem] border-2 border-[#194b31] bg-[#f5e1a7] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.36)]">
              <img
                src="/icons/storesel.png"
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            </span>
          </button>
        </div>

        <div className="flex h-[216px] w-[432px] items-center justify-end gap-0 overflow-hidden">
          <AssistantBadge src="/assistants/gosta.png" alt="Gösta" />
          <AssistantBadge src="/assistants/justiina.png" alt="Justiina" />
        </div>
      </div>

      {showStatus ? (
        <div className="pointer-events-none absolute left-[35px] top-[8px] z-30 inline-flex max-w-[calc(100%-70px)] items-center justify-center whitespace-nowrap rounded-[1.05rem] border border-[#caa35d] bg-[#ffe9a8] px-5 py-1.5 text-[13px] font-black uppercase tracking-[0.14em] text-[#8a3f16] shadow-[0_3px_0_rgba(91,72,44,0.20),0_8px_18px_rgba(80,50,10,0.12)]">
          {statusText}
        </div>
      ) : null}
    </section>
  );
}

export { ZiiplyStoreLocaCard };
