"use client";

import React, { useEffect, useState } from "react";
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
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    let delayedMeasure: ReturnType<typeof setTimeout> | null = null;

    const measureViewport = () => {
      const nextHeight = Math.round(window.visualViewport?.height ?? window.innerHeight);
      if (nextHeight > 0) setViewportHeight((current) => current === nextHeight ? current : nextHeight);
    };

    const resumeMeasure = () => {
      measureViewport();
      requestAnimationFrame(measureViewport);
      if (delayedMeasure) clearTimeout(delayedMeasure);
      delayedMeasure = setTimeout(measureViewport, 320);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") resumeMeasure();
    };

    resumeMeasure();
    window.addEventListener("pageshow", resumeMeasure);
    window.addEventListener("focus", resumeMeasure);
    window.addEventListener("resize", measureViewport);
    window.addEventListener("orientationchange", resumeMeasure);
    window.visualViewport?.addEventListener("resize", measureViewport);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (delayedMeasure) clearTimeout(delayedMeasure);
      window.removeEventListener("pageshow", resumeMeasure);
      window.removeEventListener("focus", resumeMeasure);
      window.removeEventListener("resize", measureViewport);
      window.removeEventListener("orientationchange", resumeMeasure);
      window.visualViewport?.removeEventListener("resize", measureViewport);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <div
      className="relative isolate sm:hidden -mx-4 px-4 pb-[150px] pt-0 overflow-hidden"
      style={{
        minHeight: viewportHeight ? `${viewportHeight}px` : "100dvh",
        // V3: 70 % rauhallinen salvianvihreä, 20 % lämmin paperi, 10 % vanha kauppakirja.
        // Sävy pidetty lämpimänä, mutta ei liian antiikkisena eikä startup-turkoosina.
        background:
          "radial-gradient(circle at 50% 3%, rgba(255,249,232,0.95) 0%, rgba(240,237,220,0.9) 24%, rgba(225,232,220,0.96) 50%, rgba(209,221,211,1) 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.105]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 16%, rgba(255,255,255,0.56) 0 1px, transparent 1.8px), radial-gradient(circle at 72% 42%, rgba(122,97,49,0.10) 0 1px, transparent 2px), linear-gradient(180deg, rgba(255,255,255,0.32), rgba(255,255,255,0))",
          backgroundSize: "34px 34px, 48px 48px, 100% 100%",
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[210px]"
        style={{
          background:
            "linear-gradient(180deg, rgba(210,222,211,0) 0%, rgba(226,232,219,0.38) 48%, rgba(233,241,237,0.9) 100%)",
        }}
      />

      <section
        className="flex flex-col items-center text-center"
        style={{
          minHeight: viewportHeight ? `${Math.round(viewportHeight * 0.23)}px` : "23dvh",
          justifyContent: "flex-start",
          paddingTop: "0.25vh",
        }}
      >
        <div className="mb-2 flex h-[94px] w-[94px] shrink-0 items-center justify-center">
          <img
            src="/ziiplylogo_mobile.png"
            alt="Ziiply"
            width={94}
            height={94}
            draggable={false}
            className="block h-[94px] w-[94px] select-none object-contain drop-shadow-[0_4px_10px_rgba(21,79,50,0.10)]"
            onError={(event) => {
              event.currentTarget.style.visibility = "hidden";
            }}
          />
        </div>

        <h1 className="max-w-[318px] text-[30px] font-black leading-[1.02] tracking-[-0.045em] text-[#050b2b] drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]">
          Viilaa ruokakorisi huokeammaks
        </h1>

        <p className="mt-2 mb-2 max-w-[330px] text-[16px] font-black leading-[1.18] tracking-[-0.02em] text-[#686d5c] drop-shadow-[0_1px_0_rgba(255,255,255,0.48)]">
          Gösta, Justiina ja Arvo auttavat arjen valinnoissa
        </p>
      </section>

      <section className="mt-0 rounded-[2rem] bg-[#f8f5ed]/94 px-4 pb-4 pt-3 shadow-[0_24px_54px_rgba(34,54,43,0.16)] ring-1 ring-[#fffaf0]/95 backdrop-blur-[2px]">
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
