"use client";

import React from "react";
import ZiiplyMobileAssistantButton from "./ZiiplyMobileAssistantButton";
import type { ZiiplyAssistantKey } from "./ZiiplyMobileAssistantButton";

type Props = {
  activeAssistant: ZiiplyAssistantKey | null;
  onSelectAssistant: (assistant: ZiiplyAssistantKey) => void;
};

/**
 * The home panel is a real responsive layout, not a fixed-size illustration.
 * The parent owns the utility strip and bottom navigation; this panel only
 * distributes the available space between the brand header and assistant cards.
 */
export default function ZiiplyMobileHomeView({ activeAssistant, onSelectAssistant }: Props) {
  return (
    <main
      className="relative isolate -mx-4 flex min-h-0 flex-1 flex-col overflow-hidden px-3 sm:hidden"
      style={{
        background: "linear-gradient(180deg, #f8f5e9 0%, #e9efe4 62%, #e9efe4 100%)",
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col justify-end"
        style={{ paddingTop: "clamp(12px, 10dvh, 130px)" }}>
        <header className="flex shrink-0 flex-col items-center text-center">
          <img
            src="/ziiplylogo_mobile.png"
            alt="Ziiply"
            width={94}
            height={94}
            draggable={false}
            className="h-[clamp(54px,10dvh,94px)] w-[clamp(54px,10dvh,94px)] object-contain"
          />
          <h1 className="mt-1 max-w-[390px] text-[clamp(24px,6.5vw,36px)] font-black leading-[1.04] tracking-[-0.045em] text-[#050b2b]">
            <span className="block">Viilaa ruokakorisi</span>
            <span className="block">huokeammaks</span>
          </h1>
          <p className="mt-2 max-w-[390px] text-[clamp(13px,3.6vw,17px)] font-bold leading-[1.17] text-[#686d5c]">
            Gösta, Justiina ja Arvo auttavat arjen<br className="hidden min-[370px]:block" /> valinnoissa
          </p>
        </header>

        <section
          aria-label="Ziiplyn avustajat"
          className="mt-[clamp(10px,2dvh,24px)] grid shrink-0 grid-cols-3 gap-2 rounded-[2rem] bg-[#f8f5ed]/95 p-2 pb-3 shadow-[0_16px_38px_rgba(34,54,43,0.14)] ring-1 ring-[#fffaf0]/95"
        >
          <ZiiplyMobileAssistantButton
            assistant="gosta"
            name="Gösta"
            title="Tarjoukset"
            subtitle="Hinnat ja tarjoukset"
            imageSrc="/assistants/gosta.png"
            active={activeAssistant === "gosta"}
            onClick={() => onSelectAssistant("gosta")}
          />
          <ZiiplyMobileAssistantButton
            assistant="justiina"
            name="Justiina"
            title="Reseptit"
            subtitle="Ruokaideat ja haku"
            imageSrc="/assistants/justiina.png"
            featured
            active={activeAssistant === "justiina"}
            onClick={() => onSelectAssistant("justiina")}
          />
          <ZiiplyMobileAssistantButton
            assistant="arvo"
            name="Arvo"
            title="Asetukset"
            subtitle="Omat valinnat"
            imageSrc="/assistants/arvo.png"
            active={activeAssistant === "arvo"}
            onClick={() => onSelectAssistant("arvo")}
          />
        </section>
      </div>
    </main>
  );
}

export { ZiiplyMobileHomeView };
