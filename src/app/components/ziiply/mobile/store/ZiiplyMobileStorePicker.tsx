"use client";

import React from "react";
import { createPortal } from "react-dom";

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
  title = "Valitse lähikauppa",
  tone = "neutral",
}: Props) {
  if (!open) return null;

  const activeClass =
    tone === "red"
      ? "bg-[#d90416] text-white"
      : tone === "green"
        ? "bg-[#008f3a] text-white"
        : "bg-slate-900 text-white";

  if (typeof document === "undefined") return null;

  const pickerCard = (
    <div
      className="
        fixed
        left-1/2
        bottom-[calc(env(safe-area-inset-bottom)+6.85rem)]
        z-[999999]
        w-[min(15.85rem,calc(100vw-9.15rem))]
        min-h-[25.5rem]
        rounded-[1.45rem]
        bg-white
        p-2
        text-left
        text-xs
        shadow-[0_22px_60px_rgba(15,23,42,0.22)]
        ring-1
        ring-slate-200
        will-change-transform
        [transform:translate3d(-50%,0,0)]
      "
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0 truncate text-[12px] font-black uppercase tracking-wide text-slate-500">
          {title}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1.5 text-[11px] font-black text-slate-600 active:scale-[0.98]"
          >
            Sulje
          </button>
        )}
      </div>

      <div
        className="
          max-h-[34dvh]
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
                  "flex w-full items-center justify-between gap-1.5 rounded-xl px-2.5 py-3 text-left font-extrabold transition",
                  active
                    ? activeClass
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100",
                ].join(" ")}
              >
                {(() => {
                  const [namePart, detailPart = ""] = option.label.split(" — ");
                  const distanceMatch = detailPart.match(/(?:^| · )(\d+\s*km)$/);
                  const distanceLabel = distanceMatch?.[1] || "";

                  return (
                    <>
                      <span className="min-w-0 flex-1">
                        <span className="block whitespace-normal break-words text-[13px] leading-tight">
                          {namePart}
                        </span>
                        {detailPart && (
                          <span
                            className={`mt-1 block text-[11px] leading-tight ${
                              active ? "text-white/80" : "text-slate-400"
                            }`}
                          >
                            {detailPart}
                          </span>
                        )}
                      </span>

                      {(active || distanceLabel) && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black ${
                            active ? "bg-white/20 text-white" : "bg-white text-slate-400"
                          }`}
                        >
                          {active ? "Valittu" : distanceLabel}
                        </span>
                      )}
                    </>
                  );
                })()}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(pickerCard, document.body);
}

export { ZiiplyMobileStorePicker };
