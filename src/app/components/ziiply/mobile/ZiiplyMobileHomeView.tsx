"use client";

import React from "react";
import type { ZiiplyAssistantKey } from "./ZiiplyMobileAssistantButton";

type Props = {
  activeAssistant: ZiiplyAssistantKey | null;
  onSelectAssistant: (assistant: ZiiplyAssistantKey) => void;
};

const assistants = [
  { key: "gosta", name: "Gösta", title: "Tarjoukset", image: "/assistants/gosta.png", color: "#dcefc5", border: "#8bb56d" },
  { key: "justiina", name: "Justiina", title: "Reseptit", image: "/assistants/justiina.png", color: "#ffe7aa", border: "#c69655" },
  { key: "arvo", name: "Arvo", title: "Asetukset", image: "/assistants/arvo.png", color: "#e8d5a9", border: "#b99d62" },
] as const;

export default function ZiiplyMobileHomeView({ activeAssistant, onSelectAssistant }: Props) {
  return (
    <main
      className="relative isolate -mx-4 flex min-h-0 flex-col items-center justify-between overflow-hidden px-3 pt-3 pb-5 sm:hidden"
      style={{
        minHeight: "max(390px, calc(100dvh - 360px))",
        background: "linear-gradient(180deg, #f8f5e9 0%, #e9efe4 62%, #d5e2d7 100%)",
      }}
    >
      <header className="flex w-full max-w-[440px] shrink-0 flex-col items-center text-center">
        <img
          src="/ziiplylogo_mobile.png"
          alt="Ziiply"
          width={76}
          height={76}
          draggable={false}
          className="h-[clamp(48px,9dvh,76px)] w-[clamp(48px,9dvh,76px)] object-contain"
        />
        <h1 className="mt-1 text-[clamp(21px,5.5vw,28px)] font-black leading-[1.05] tracking-tight text-[#07122d]">
          Viilaa ruokakorisi huokeammaks
        </h1>
        <p className="mt-1 text-[clamp(12px,3.4vw,15px)] font-semibold leading-tight text-[#59665c]">
          Gösta, Justiina ja Arvo auttavat arjen valinnoissa
        </p>
      </header>

      <section aria-label="Ziiplyn avustajat" className="mt-auto grid w-full max-w-[440px] grid-cols-3 gap-2 rounded-[22px] bg-white/65 p-2 shadow-lg">
        {assistants.map((assistant) => (
          <button
            key={assistant.key}
            type="button"
            aria-pressed={activeAssistant === assistant.key}
            onClick={() => onSelectAssistant(assistant.key)}
            className="flex min-w-0 flex-col items-center justify-center rounded-[18px] border-2 px-1 py-3 text-center shadow-sm transition-transform active:scale-95"
            style={{ backgroundColor: assistant.color, borderColor: assistant.border }}
          >
            <img
              src={assistant.image}
              alt=""
              draggable={false}
              className="h-[clamp(46px,11vw,72px)] w-[clamp(46px,11vw,72px)] rounded-full border-[3px] border-white/80 object-cover"
            />
            <span className="mt-2 text-[clamp(14px,4vw,19px)] font-black leading-none text-[#263b2d]">{assistant.name}</span>
            <span className="mt-1 text-[clamp(10px,2.8vw,12px)] font-bold leading-tight text-[#405248]">{assistant.title}</span>
          </button>
        ))}
      </section>
    </main>
  );
}

export { ZiiplyMobileHomeView };
