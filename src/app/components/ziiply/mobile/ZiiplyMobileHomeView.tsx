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
    <div
      className="relative isolate sm:hidden -mx-4 px-4 pb-[150px] pt-0 overflow-hidden"
      style={{
        // 70 % rauhallinen salvianvihreä, 20 % lämmin paperi, 10 % vanha kauppakirja.
        background:
          "radial-gradient(circle at 50% 4%, rgba(255,248,226,0.92) 0%, rgba(237,235,218,0.88) 25%, rgba(224,231,219,0.94) 48%, rgba(210,222,211,1) 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.28]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 16%, rgba(255,255,255,0.58) 0 1px, transparent 1.6px), radial-gradient(circle at 72% 42%, rgba(122,97,49,0.11) 0 1px, transparent 1.8px), linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0))",
          backgroundSize: "22px 22px, 31px 31px, 100% 100%",
        }}
      />

      <section
        className="flex flex-col items-center text-center"
        style={{
          minHeight: "24vh",
          justifyContent: "flex-start",
          paddingTop: "0.5vh",
        }}
      >
        <img
          src="/ziiplylogo_mobile.png"
          alt="Ziiply"
          draggable={false}
          className="mb-2 w-[106px] select-none object-contain drop-shadow-[0_4px_10px_rgba(21,79,50,0.10)]"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />

        <h1 className="max-w-[320px] text-[31px] font-black leading-[1.02] tracking-[-0.045em] text-[#050b2b] drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]">
          Viilaa ruokakorisi huokeammaks.
        </h1>

        <p className="mt-2 mb-2 max-w-[340px] text-[17px] font-black leading-snug tracking-[-0.02em] text-[#65718f] drop-shadow-[0_1px_0_rgba(255,255,255,0.48)]">
          Gösta, Justiina ja Arvo auttavat arjen valinnoissa.
        </p>
      </section>

      <section className="mt-0 rounded-[2rem] bg-[#fffdf6]/92 px-4 pb-4 pt-3 shadow-[0_16px_42px_rgba(34,54,43,0.10)] ring-1 ring-white/85 backdrop-blur-[2px]">
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
