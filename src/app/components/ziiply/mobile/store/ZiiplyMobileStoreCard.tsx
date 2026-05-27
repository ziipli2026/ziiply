"use client";

import React from "react";

type Props = {
  logoSrc: string;
  chainLabel: string;
  name: string;
  selected: boolean;
  featured?: boolean;
  distance?: string;
  onClick: () => void;
  children?: React.ReactNode;
};

export default function ZiiplyMobileStoreCard({
  logoSrc,
  chainLabel,
  name,
  selected,
  featured,
  distance,
  onClick,
  children,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        // v371_MOBILE_STORE_CARD_RECT:
        // Ei aspect-squarea. Kortti on tarkoituksella matalampi suorakaide,
        // jotta 2x2 kaupparyhmäruudukko mahtuu mobiilinäkymään ilman pystyscrollia.
        "relative h-[112px] min-h-[112px] max-h-[112px] w-full overflow-hidden rounded-[1.35rem] border-2 bg-white px-2 pb-1 pt-1 text-center transition active:scale-[0.985]",
        selected
          ? "border-[#0a8f43] bg-[#eef9f2] shadow-[0_4px_12px_rgba(8,163,67,0.14)]"
          : "border-slate-200",
      ].join(" ")}
    >
      <div
        className={[
          "absolute right-2 top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-[15px] font-black shadow-[0_8px_20px_rgba(15,23,42,0.12)]",
          selected ? "bg-[#008C35] text-white" : "bg-white text-transparent",
        ].join(" ")}
      >
        ✓
      </div>

      <div className="absolute left-2 top-1.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
        <img
          src={logoSrc}
          alt={chainLabel}
          draggable={false}
          className="h-full w-full object-contain"
        />
      </div>

      <div className="flex h-full -translate-y-1 flex-col items-center justify-center pt-3">
        <p className="mt-0 text-[10px] font-black uppercase tracking-wide text-slate-400">
          {chainLabel}
        </p>

        <p className="mx-auto mt-0.5 max-h-[1.75rem] max-w-[8.7rem] overflow-hidden text-center text-[12px] font-black leading-tight text-slate-900">
          {name}
        </p>

        {distance && (
          <p className="mt-0.5 text-[10px] font-black leading-none text-slate-400">
            {distance}
          </p>
        )}

        <div className="relative z-20 mt-0.5 flex min-h-[22px] justify-center">
          {children}
        </div>
      </div>

      {featured && (
        <div className="pointer-events-none absolute inset-0 rounded-[1.35rem] ring-2 ring-[#f0d36c]" />
      )}
    </button>
  );
}

export { ZiiplyMobileStoreCard };
