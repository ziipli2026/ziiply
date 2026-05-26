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
    <div className="flex h-[218px] w-[204px] shrink-0 items-center justify-center overflow-visible bg-[#f3dcae]/75">
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
        "ziiply-store-loca-card relative h-[280px] overflow-hidden rounded-[56px] border-[5px] border-[#bba062] bg-gradient-to-b from-[#f8eecb] via-[#ecd095] to-[#ddbc78] px-[38px] py-[36px] shadow-[0_0_0_4px_rgba(255,247,218,0.92)_inset,0_7px_0_rgba(80,58,25,0.30),0_20px_30px_rgba(45,31,12,0.16)] ring-1 ring-[#fff8df]",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-[15px] rounded-[42px] border border-[#ead29a]/45" />
      <div className="pointer-events-none absolute inset-0 rounded-[50px] opacity-[0.20] [background-image:radial-gradient(#b59c67_1.3px,transparent_1.3px)] [background-size:30px_30px]" />
      <div className="pointer-events-none absolute inset-y-[18px] left-[42.6%] w-[120px] bg-gradient-to-r from-transparent via-[#fff7df]/35 to-transparent" />

      <div className="relative z-10 grid h-full grid-cols-[548px_308px_428px] items-center justify-center gap-[24px]">
        <div className="flex h-[188px] min-w-0 flex-col justify-start">
          <p
            className="mb-[35px] pl-[8px] text-[20px] font-black uppercase leading-none tracking-[0.58em] text-[#746742] drop-shadow-[0_1px_0_#fff7df]"
            style={{ fontFamily: copperplateFont }}
          >
            Sijainti
          </p>

          <div className="flex h-[116px] items-center gap-[32px]">
            <button
              type="button"
              aria-pressed={usingOwnLocation}
              aria-label={usingOwnLocation ? "GPS käytössä" : "GPS pois päältä"}
              title={usingOwnLocation ? "GPS käytössä" : "GPS pois päältä"}
              onClick={handleGpsClick}
              className={cx(
                "flex h-[116px] w-[143px] shrink-0 items-center justify-center rounded-[40px] border-[4px] text-[35px] font-black shadow-[0_5px_0_rgba(91,72,44,0.16),inset_0_0_0_3px_rgba(255,255,255,0.62)] ring-1 transition active:scale-[0.98]",
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
              className="h-[110px] min-w-0 flex-1 rounded-[42px] border-[4px] border-[#c2a264] bg-[#fff9ea]/95 px-[38px] text-[30px] font-black leading-none text-[#27412a] shadow-[inset_0_3px_10px_rgba(91,65,28,0.12),0_1px_0_#fff6dc] outline-none placeholder:text-[#8b846f] focus:border-[#0b7f3a] focus:ring-4 focus:ring-[#c4dfbd]"
            />
          </div>
        </div>

        <div className="flex h-[188px] min-w-0 flex-col items-center justify-start">
          <p
            className="mb-[18px] text-center text-[20px] font-black uppercase leading-none tracking-[0.58em] text-[#746742] drop-shadow-[0_1px_0_#fff7df]"
            style={{ fontFamily: copperplateFont }}
          >
            Kaupat
          </p>

          <button
            type="button"
            onClick={() => void onOpenShops?.()}
            className="flex h-[136px] w-[308px] shrink-0 items-center justify-center overflow-hidden rounded-[40px] border-[7px] border-[#17452f] bg-gradient-to-b from-[#f8edc8] via-[#e2bf72] to-[#b98233] p-[10px] text-[#143b24] shadow-[0_6px_0_rgba(50,36,16,0.34),0_12px_18px_rgba(70,44,14,0.12),inset_0_0_0_2px_rgba(255,255,255,0.36)] transition hover:brightness-105 active:translate-y-[1px] active:shadow-[0_3px_0_rgba(50,36,16,0.34),inset_0_0_0_2px_rgba(255,255,255,0.36)]"
            style={{ fontFamily: cooperFont }}
            aria-label="Avaa kauppavalikot"
            title="Avaa kauppavalikot"
          >
            <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-[28px] border-[3px] border-[#194b31] bg-[#f5e1a7] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.36)]">
              <img
                src="/icons/storesel.png"
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            </span>
          </button>
        </div>

        <div className="flex h-[218px] w-[428px] shrink-0 items-center justify-end gap-[8px] overflow-visible">
          <AssistantBadge src="/assistants/gosta.png" alt="Gösta" />
          <AssistantBadge src="/assistants/justiina.png" alt="Justiina" />
        </div>
      </div>

      {showStatus ? (
        <div className="pointer-events-none absolute left-[42px] top-[14px] z-30 inline-flex max-w-[calc(100%-84px)] items-center justify-center whitespace-nowrap rounded-[1.05rem] border border-[#caa35d] bg-[#ffe9a8] px-5 py-1.5 text-[13px] font-black uppercase tracking-[0.14em] text-[#8a3f16] shadow-[0_3px_0_rgba(91,72,44,0.20),0_8px_18px_rgba(80,50,10,0.12)]">
          {statusText}
        </div>
      ) : null}
    </section>
  );
}

export { ZiiplyStoreLocaCard };
