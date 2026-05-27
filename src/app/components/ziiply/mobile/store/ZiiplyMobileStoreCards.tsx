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
        "relative aspect-square overflow-hidden rounded-[1.35rem] border-2 bg-white px-2.5 pb-2 pt-2 text-center transition active:scale-[0.985]",
        selected
          ? "border-[#0a8f43] bg-[#eef9f2] shadow-[0_4px_12px_rgba(8,163,67,0.14)]"
          : "border-slate-200",
      ].join(" ")}
    >
      <div
        className={[
          "absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black",
          selected
            ? "bg-[#008C35] text-white"
            : "bg-slate-100 text-transparent",
        ].join(" ")}
      >
        ✓
      </div>

      <div className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
        <img
          src={logoSrc}
          alt={chainLabel}
          draggable={false}
          className="h-full w-full object-contain"
        />
      </div>

      <div className="h-5" />

      <p className="mt-0 text-[8px] font-black uppercase tracking-wide text-slate-400">
        {chainLabel}
      </p>

      <p className="mx-auto mt-0 h-[1.7rem] max-w-[8.2rem] overflow-hidden text-center text-[11px] font-black leading-tight text-slate-900">
        {name}
      </p>

      {distance && (
        <p className="mt-0 text-[9px] font-black text-slate-400">
          {distance}
        </p>
      )}

      <div className="relative z-20 mt-0.5 flex justify-center">
        {children}
      </div>

      {featured && (
        <div className="pointer-events-none absolute inset-0 rounded-[1.35rem] ring-2 ring-[#f0d36c]" />
      )}
    </button>
  );
}
