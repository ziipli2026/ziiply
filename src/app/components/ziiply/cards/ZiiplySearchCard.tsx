"use client";

import React, { useEffect, useRef, useState } from "react";

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

const cooperFont = '"CooperBT-Light", serif';

export function ZiiplySearchCard({ value, onChange, mode = "single", onModeChange, onCancel, isValid = true, placeholder = "Etsi kauppoja...", activePanel = "none", comparePanel, notFoundTerms = [], gostaLoading, justiinaLoading, onOpenResults, onOpenCompare, className }: SearchCardProps) {
  const [chips, setChips] = useState<SearchChip[]>([]);
  const [inputFocused, setInputFocused] = useState(false);

  useEffect(() => {
    // päivitetään inputin syöttö arvoksi
  }, [value]);

  // ... muu liiketoimintalogiikka, nappien hanlointi jne.

  const instructionText = ["Syötä osoite tai postinumero", "kuntomaan"];
  const loadingText = gostaLoading
    ? ["Etsii", "hinnanhuojennuksia…"]
    : justiinaLoading
      ? ["Etsii", "hinnanhuojennukset"]
      : loading
        ? ["Etsii", "ostoksia…"]
        : ["Etsii", "ostokset"];

  return (
    <section
      className={cx(
        "ziiply-search-card relative isolate h-[374px] min-h-[374px] overflow-hidden rounded-[28px] bg-[#fffaf0] shadow-[0_0_0_2px_#d8bd75_inset,0_13px_0_rgba(60,45,20,0.28)]",
        className,
      )}
    >
      {/* Taustakuvio (varjostus ja pallokuvio) */}
      <div className="pointer-events-none absolute inset-0 rounded-[28px] opacity-45 [background-image:radial-gradient(#d8bd75_1.2px,transparent_1.2px)] [background-size:18px_18px] [box-shadow:inset_0_0_0_3px_#fff9e8]" />

      {/* Hakutoimintojen alue */}
      <div className="relative z-10 grid h-[64px] grid-cols-[minmax(0,1fr)_minmax(220px,286px)] items-start gap-4 px-4">
        {/* Sijainnin syöttökenttä */}
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-[#746749] uppercase">
            Sijainti
          </span>
          <div className="relative mt-1">
            <button
              type="button"
              className="absolute inset-y-0 left-0 flex items-center justify-center px-2"
              onClick={() => {
                navigator.geolocation.getCurrentPosition(
                  (pos) => onChange(`${pos.coords.latitude},${pos.coords.longitude}`),
                  () => {},
                );
              }}
            >
              📍
            </button>
            <input
              type="text"
              className="border-[3px] border-[#7a653e] rounded-[12px] pl-9 pr-3 py-1 w-full bg-[#f8f0d8] text-[16px] font-black leading-none"
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          </div>
        </div>

        {/* Kaupat-valinta */}
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-[#746749] uppercase text-right">
            Kaupat
          </span>
          <button
            type="button"
            className="w-full h-[64px] max-w-[286px] bg-[#f8f0d8] rounded-[12px] shadow-[0_2px_0_rgba(90,70,35,0.18)]"
            onClick={onOpenCompare}
          >
            <img src="kaupat-kuvake.png" className="h-full w-full object-cover rounded-[12px]" alt="Kaupat" />
          </button>
        </div>
      </div>

      {/* Gösta & Justiina kuvat */}
      <div className="absolute bottom-[-64px] left-[36px] right-[36px] z-[6] grid grid-cols-2 gap-5">
        <div className="relative h-[96px] rounded-t-[34px] border-[4px] border-[#d8bd75] bg-[#fff4d3] shadow-[0_0_0_2px_#fff4cd_inset,0_8px_0_rgba(70,50,24,0.25)]">
          <span className="absolute mb-5 text-[21px] font-black uppercase tracking-[0.38em] text-[#746749] left-1/2 transform -translate-x-1/2 top-5">
            Gösta
          </span>
          <img src="gosta.png" className="absolute bottom-[-24px] left-1/2 transform -translate-x-1/2 w-[58px] h-[58px] rounded-[29px] border-[3px] border-[#7a653e] bg-[#f8f0d8]" alt="Gösta" />
        </div>
        <div className="relative h-[96px] rounded-t-[34px] border-[4px] border-[#d8bd75] bg-[#fff4d3] shadow-[0_0_0_2px_#fff4cd_inset,0_8px_0_rgba(70,50,24,0.25)]">
          <span className="absolute mb-5 text-[21px] font-black uppercase tracking-[0.38em] text-[#746749] left-1/2 transform -translate-x-1/2 top-5">
            Justiina
          </span>
          <img src="justiina.png" className="absolute bottom-[-24px] left-1/2 transform -translate-x-1/2 w-[58px] h-[58px] rounded-[29px] border-[3px] border-[#7a653e] bg-[#f8f0d8]" alt="Justiina" />
        </div>
      </div>
    </section>
  );
}
