"use client";

import React from "react";
import type { ZiiplyAssistantKey } from "./ZiiplyMobileAssistantButton";

export type ZiiplyMobileAssistantPanelProps = {
  activeAssistant: ZiiplyAssistantKey | null;
  onClose: () => void;
};

const assistantContent: Record<
  ZiiplyAssistantKey,
  {
    name: string;
    title: string;
    imageSrc: string;
    body: string;
  }
> = {
  justiina: {
    name: "Justiina",
    title: "Reseptit ja ruokaideat",
    imageSrc: "/assistants/justiina.png",
    body: "Tähän tulee reseptihaku, ateriavinkit ja korin perusteella ehdotetut ruuat.",
  },
  gosta: {
    name: "Gösta",
    title: "Tarjoukset ja hintatiedot",
    imageSrc: "/assistants/gosta.png",
    body: "Tähän tulee tarjoukset, hintahavainnot, säästövinkit ja tarjousvahdit.",
  },
  arvo: {
    name: "Arvo",
    title: "Arvon asetukset",
    imageSrc: "/assistants/arvo.png",
    body: "Tähän tulee omat parametrit: ruokavaliot, suosikit, kaupat, sijainti ja muut pysyvät valinnat.",
  },
};

export default function ZiiplyMobileAssistantPanel({
  activeAssistant,
  onClose,
}: ZiiplyMobileAssistantPanelProps) {
  if (!activeAssistant) return null;

  const content = assistantContent[activeAssistant];

  return (
    <div className="fixed inset-x-0 bottom-[116px] z-[70] px-4 sm:hidden">
      <section className="mx-auto max-w-[520px] overflow-hidden rounded-[2rem] border-[3px] border-[#b99d62] bg-[#fff7df] shadow-[0_22px_60px_rgba(7,47,37,0.28)]">
        <div className="flex items-center gap-3 bg-gradient-to-b from-[#fff1c6] to-[#e3c17b] p-3">
          <div className="h-[64px] w-[64px] shrink-0 overflow-hidden rounded-full border-[3px] border-[#f8e8bf] bg-[#314633]">
            <img
              src={content.imageSrc}
              alt={content.name}
              draggable={false}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-[24px] font-black leading-none text-[#27412a]">
              {content.name}
            </div>
            <div className="mt-1 text-[13px] font-black uppercase tracking-[0.08em] text-[#705f37]">
              {content.title}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-white/80 text-[24px] font-black text-[#3e3420] shadow-inner active:scale-[0.98]"
            aria-label="Sulje"
            title="Sulje"
          >
            ×
          </button>
        </div>

        <div className="p-4 text-[15px] font-bold leading-snug text-[#374151]">
          {content.body}
        </div>
      </section>
    </div>
  );
}

export { ZiiplyMobileAssistantPanel };
