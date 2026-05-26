"use client";

import React from "react";

export type SearchMode = "cart" | "single";
export type SearchPanelKind = "none" | "results" | "compare";

export type SearchChip = {
  id: string;
  label: string;
  onClick?: () => void;
};

export type SearchCardProps = {
  value: string;
  onChange: (value: string) => void;
  mode: SearchMode;
  onModeChange?: (mode: SearchMode) => void;
  onCancel?: () => void;
  isValid?: boolean;
  placeholder?: string;
  activePanel?: SearchPanelKind;
  comparePanel?: React.ReactNode;
  notFoundTerms?: string[];
  gostaLoading?: boolean;
  justiinaLoading?: boolean;
  onOpenResults?: () => void;
  onOpenCompare?: () => void;
  className?: string;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function ZiiplySearchCard({
  value,
  onChange,
  placeholder = "Etsi kauppoja...",
  onOpenCompare,
  className,
}: SearchCardProps) {
  return (
    <section
      className={cx(
        "ziiply-search-card relative isolate h-[374px] min-h-[374px] overflow-hidden rounded-[28px] bg-[#fffaf0] shadow-[0_0_0_2px_#d8bd75_inset,0_13px_0_rgba(60,45,20,0.28)]",
        className,
      )}
    >
      {/* Taustakuvio: bg-position-[9px_0] korjaa oikean reunan taustakuvion kohdistusvirheen. */}
      <div className="pointer-events-none absolute inset-0 rounded-[28px] opacity-45 [background-image:radial-gradient(#d8bd75_1.2px,transparent_1.2px)] [background-size:18px_18px] [background-position:9px_0] [box-shadow:inset_0_0_0_3px_#fff9e8]" />

      {/* Hakutoimintojen alue */}
      <div className="relative z-10 grid h-[64px] grid-cols-[minmax(0,1fr)_minmax(220px,286px)] items-start gap-4 px-4">
        {/* Sijainnin syöttökenttä */}
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase text-[#746749]">
            Sijainti
          </span>

          <div className="relative mt-1">
            <button
              type="button"
              className="absolute inset-y-0 left-0 flex items-center justify-center px-2"
              onClick={() => {
                navigator.geolocation.getCurrentPosition(
                  (pos) =>
                    onChange(`${pos.coords.latitude},${pos.coords.longitude}`),
                  () => {},
                );
              }}
            >
              📍
            </button>

            <input
              type="text"
              className="w-full rounded-[12px] border-[3px] border-[#7a653e] bg-[#f8f0d8] py-1 pl-9 pr-3 text-[16px] font-black leading-none"
              placeholder={placeholder}
              value={value}
              onChange={(event) => onChange(event.target.value)}
            />
          </div>
        </div>

        {/* Kaupat-valinta */}
        <div className="flex flex-col">
          <span className="text-right text-[10px] font-black uppercase text-[#746749]">
            Kaupat
          </span>

          <button
            type="button"
            className="h-[64px] w-full max-w-[286px] rounded-[12px] bg-[#f8f0d8] shadow-[0_2px_0_rgba(90,70,35,0.18)]"
            onClick={onOpenCompare}
          >
            <img
              src="kaupat-kuvake.png"
              className="h-full w-full rounded-[12px] object-cover"
              alt="Kaupat"
            />
          </button>
        </div>
      </div>

      {/* Gösta & Justiina kuvat */}
      <div className="absolute bottom-[-64px] left-[36px] right-[36px] z-[6] grid grid-cols-2 gap-5">
        <div className="relative h-[96px] rounded-t-[34px] border-[4px] border-[#d8bd75] bg-[#fff4d3] shadow-[0_0_0_2px_#fff4cd_inset,0_8px_0_rgba(70,50,24,0.25)]">
          <span className="absolute left-1/2 top-5 mb-5 -translate-x-1/2 text-[21px] font-black uppercase tracking-[0.38em] text-[#746749]">
            Gösta
          </span>

          <img
            src="gosta.png"
            className="absolute bottom-[-24px] left-1/2 h-[58px] w-[58px] -translate-x-1/2 rounded-[29px] border-[3px] border-[#7a653e] bg-[#f8f0d8]"
            alt="Gösta"
          />
        </div>

        <div className="relative h-[96px] rounded-t-[34px] border-[4px] border-[#d8bd75] bg-[#fff4d3] shadow-[0_0_0_2px_#fff4cd_inset,0_8px_0_rgba(70,50,24,0.25)]">
          <span className="absolute left-1/2 top-5 mb-5 -translate-x-1/2 text-[21px] font-black uppercase tracking-[0.38em] text-[#746749]">
            Justiina
          </span>

          <img
            src="justiina.png"
            className="absolute bottom-[-24px] left-1/2 h-[58px] w-[58px] -translate-x-1/2 rounded-[29px] border-[3px] border-[#7a653e] bg-[#f8f0d8]"
            alt="Justiina"
          />
        </div>
      </div>
    </section>
  );
}

export { ZiiplySearchCard };
export default ZiiplySearchCard;
