"use client";

import React from "react";

type Option = {
  id: string;
  label: string;
};

type Props = {
  open: boolean;
  options: Option[];
  selectedId?: string;
  onSelect: (id: string) => void;
};

export default function ZiiplyMobileStorePicker({
  open,
  options,
  selectedId,
  onSelect,
}: Props) {
  if (!open) return null;

  return (
    <div className="absolute left-1/2 top-[calc(100%+8px)] z-50 w-[170px] -translate-x-1/2 overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
      {options.map((option) => {
        const active = option.id === selectedId;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelect(option.id)}
            className={[
              "flex w-full items-center justify-between px-3 py-3 text-left text-[13px] font-black transition",
              active
                ? "bg-[#eef9f2] text-[#0a8f43]"
                : "bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            <span>{option.label}</span>
            {active && <span>✓</span>}
          </button>
        );
      })}
    </div>
  );
}
