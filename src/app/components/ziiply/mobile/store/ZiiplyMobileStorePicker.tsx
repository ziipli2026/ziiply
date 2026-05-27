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
  onClose?: () => void;
  title?: string;
  tone?: "green" | "red" | "neutral";
};

export default function ZiiplyMobileStorePicker({
  open,
  options,
  selectedId,
  onSelect,
  onClose,
  title = "Valitse kauppa",
  tone = "neutral",
}: Props) {
  if (!open) return null;

  const activeClass =
    tone === "red"
      ? "bg-[#d90416] text-white"
      : tone === "green"
        ? "bg-[#008f3a] text-white"
        : "bg-slate-900 text-white";

  return (
    <div
      className="
        fixed
        left-1/2
        bottom-[calc(env(safe-area-inset-bottom)+7.6rem)]
        z-[999999]
        w-[min(18.5rem,calc(100vw-5.5rem))]
        -translate-x-1/2
        rounded-[1.6rem]
        bg-white
        p-3
        text-left
        text-xs
        shadow-[0_22px_60px_rgba(15,23,42,0.22)]
        ring-1
        ring-slate-200
      "
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="truncate text-[13px] font-black uppercase tracking-[0.05em] text-slate-500">
          {title}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-[12px] font-black text-slate-600 active:scale-[0.98]"
          >
            Sulje
          </button>
        )}
      </div>

      <div
        className="
          max-h-[33dvh]
          overflow-y-auto
          overscroll-contain
          pr-0.5
          [-webkit-overflow-scrolling:touch]
          touch-pan-y
        "
      >
        <div className="space-y-2">
          {options.map((option) => {
            const active = option.id === selectedId;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option.id)}
                className={[
                  "flex w-full items-center justify-between gap-3 rounded-[1rem] px-3 py-3 text-left text-[13px] font-black transition active:scale-[0.99]",
                  active
                    ? activeClass
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100",
                ].join(" ")}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {active && (
                  <span className="shrink-0 rounded-full bg-white/20 px-2 py-1 text-[11px]">
                    Valittu
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { ZiiplyMobileStorePicker };
