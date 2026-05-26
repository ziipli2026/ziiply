"use client";

import React from "react";
import ZiiplyMobileAssistantButton, {
  type ZiiplyAssistantKey,
} from "./ZiiplyMobileAssistantButton";

export type ZiiplyMobileHomeViewProps = {
  activeAssistant?: ZiiplyAssistantKey | null;
  onSelectAssistant: (assistant: ZiiplyAssistantKey) => void;
};

export default function ZiiplyMobileHomeView({
  activeAssistant = null,
  onSelectAssistant,
}: ZiiplyMobileHomeViewProps) {
  return (
    <main className="sm:hidden">
      <div className="mx-auto flex min-h-[calc(100svh-210px)] max-w-[520px] flex-col px-4 pb-[128px] pt-[150px]">
        <section className="flex flex-col items-center text-center">
          <img
            src="/ziiplylogo_mobile.png"
            alt="Ziiply"
            draggable={false}
            className="h-[82px] w-auto object-contain"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />

          <h1 className="mt-8 text-[27px] font-black leading-tight text-[#071123]">
            Villaa ruokakorisi huokeammaks.
          </h1>

          <p className="mt-3 text-[19px] font-black leading-snug text-[#6b7890]">
            Gösta, Justiina ja Arvo auttavat arjen valinnoissa.
          </p>
        </section>

        <section className="mt-9 rounded-[2rem] bg-white/72 p-3 shadow-[0_20px_55px_rgba(7,47,37,0.10)] ring-1 ring-white/80 backdrop-blur">
          <div className="mb-3 px-1 text-left text-[13px] font-black uppercase tracking-[0.22em] text-[#6b7890]">
            AI-apulaiset
          </div>

          <div className="grid grid-cols-3 items-end gap-2">
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
          </div>
        </section>
      </div>
    </main>
  );
}

export { ZiiplyMobileHomeView };
