"use client";

import React from "react";

type InfoItem = {
  id: string;
  label: string;
  value: string;
  emoji: string;
};

export type ZiiplyMobileTopBarProps = {
  areaLabel: string;
  hidden?: boolean;
  onOpenArea: () => void;
};

const MOBILE_INFO_ITEMS: InfoItem[] = [
  { id: "weather", label: "SÄÄ", value: "+18°", emoji: "🌤️" },
  { id: "electricity", label: "SÄHKÖ", value: "4,2", emoji: "⚡" },
  { id: "fuel", label: "BENSA", value: "1,65", emoji: "⛽" },
  { id: "calendar", label: "KAL", value: "3", emoji: "📅" },
];

export default function ZiiplyMobileTopBar({
  areaLabel,
  hidden = false,
  onOpenArea,
}: ZiiplyMobileTopBarProps) {
  if (hidden) return null;

  return (
    <div className="fixed inset-x-0 top-[max(env(safe-area-inset-top),0px)] z-[90] mx-auto block w-full px-[6px] pt-[4px] sm:hidden">
      <div className="mx-auto flex h-[78px] w-[calc(100vw-12px)] max-w-none items-center gap-1 overflow-hidden rounded-[1.65rem] border-[4px] border-[#073d32] bg-[#fff5d9] px-2 shadow-[0_10px_28px_rgba(8,42,35,0.18),inset_0_0_0_2px_rgba(255,255,255,0.7)]">
        <div className="flex h-full w-[70px] shrink-0 items-center justify-center">
          <img
            src="/ziiplylogo_mobile.png"
            alt="Ziiply"
            draggable={false}
            className="h-[54px] w-[54px] object-contain"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        </div>

        <div className="grid min-w-0 flex-1 grid-cols-4 gap-1">
          {MOBILE_INFO_ITEMS.map((item) => (
            <div
              key={item.id}
              className="flex h-[54px] min-w-0 flex-col items-center justify-center border border-[#d9bea3] bg-[#fff8e8] leading-none"
            >
              <div className="text-[22px] leading-none">{item.emoji}</div>
              <div className="mt-0.5 text-[10px] font-black uppercase tracking-[0.03em] text-[#2d4b3f]">
                {item.label}
              </div>
              <div className="text-[16px] font-black leading-none text-[#062f29]">
                {item.value}
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={onOpenArea}
          className="ml-1 flex h-[44px] w-[138px] shrink-0 items-center justify-center gap-1 rounded-full border-2 border-[#bdc8bd] bg-[#fffbed] px-2 text-[16px] font-black text-[#0a3f35] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] active:scale-[0.98]"
          aria-label="Avaa sijainti"
          title="Avaa sijainti"
        >
          <span className="text-[18px] leading-none">📍</span>
          <span className="truncate">{areaLabel}</span>
        </button>
      </div>
    </div>
  );
}

export { ZiiplyMobileTopBar };
