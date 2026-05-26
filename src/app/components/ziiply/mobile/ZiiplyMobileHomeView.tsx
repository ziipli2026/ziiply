"use client";

import React from "react";
import ZiiplyMobileAssistantButton from "./ZiiplyMobileAssistantButton";
import type { ZiiplyAssistantKey } from "./ZiiplyMobileAssistantButton";

type Props = {
  activeAssistant: ZiiplyAssistantKey | null;
  onSelectAssistant: (assistant: ZiiplyAssistantKey) => void;
};

export default function ZiiplyMobileHomeView({
  activeAssistant,
  onSelectAssistant,
}: Props) {
  return (
    <div className="sm:hidden px-4 pb-[150px] pt-3">
      <section
        className="flex flex-col items-center text-center"
        style={{
          minHeight: "32vh",
          justifyContent: "flex-start",
          paddingTop: "4vh",
        }}
      >
        <img
          src="/ziiplylogo_mobile.png"
          alt="Ziiply"
          draggable={false}
          className="mb-4 w-[132px] select-none object-contain"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />

        <h1 className="max-w-[320px] text-[32px] font-black leading-[1.02] tracking-[-0.045em] text-[#050b2b]">
          Viilaa ruokakorisi huokeammaks.
        </h1>

        <p className="mt-4 max-w-[340px] text-[18px] font-black leading-snug tracking-[-0.02em] text-[#7480a1]">
          Gösta, Justiina ja Arvo auttavat arjen valinnoissa.
        </p>
      </section>

      <section className="rounded-[2rem] bg-white/92 p-4 shadow-[0_14px_40px_rgba(15,23,42,0.08)] ring-1 ring-white/80">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[15px] font-black uppercase tracking-[0.18em] text-[#6c7693]">
            AI-APULAISET
          </h2>
        </div>

        <div className="grid grid-cols-3 gap-3">
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
  );
}

export { ZiiplyMobileHomeView };
