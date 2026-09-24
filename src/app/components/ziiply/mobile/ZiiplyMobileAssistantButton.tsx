"use client";

import React from "react";

export type ZiiplyAssistantKey = "justiina" | "gosta" | "arvo";

export type ZiiplyMobileAssistantButtonProps = {
  assistant: ZiiplyAssistantKey;
  name: string;
  title: string;
  subtitle: string;
  imageSrc: string;
  featured?: boolean;
  active?: boolean;
  onClick: () => void;
};

const themeByAssistant: Record<
  ZiiplyAssistantKey,
  {
    frame: string;
    glow: string;
    label: string;
  }
> = {
  justiina: {
    frame: "border-[#c69655] bg-gradient-to-b from-[#fff6da] via-[#ffe9a2] to-[#edc66c]",
    glow: "shadow-[0_16px_34px_rgba(147,88,18,0.20),inset_0_0_0_2px_rgba(255,255,255,0.55)]",
    label: "text-[#6b331e]",
  },
  gosta: {
    frame: "border-[#8bb56d] bg-gradient-to-b from-[#f4ffe3] via-[#e0f0bd] to-[#c6dc91]",
    glow: "shadow-[0_16px_34px_rgba(35,94,42,0.18),inset_0_0_0_2px_rgba(255,255,255,0.55)]",
    label: "text-[#244a28]",
  },
  arvo: {
    frame: "border-[#b99d62] bg-gradient-to-b from-[#fff3d0] via-[#ead4a1] to-[#d3b474]",
    glow: "shadow-[0_16px_34px_rgba(69,52,25,0.18),inset_0_0_0_2px_rgba(255,255,255,0.55)]",
    label: "text-[#314633]",
  },
};

export default function ZiiplyMobileAssistantButton({
  assistant,
  name,
  title,
  subtitle,
  imageSrc,
  featured = false,
  active = false,
  onClick,
}: ZiiplyMobileAssistantButtonProps) {
  const theme = themeByAssistant[assistant];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "group relative flex min-w-0 flex-col items-center overflow-hidden rounded-[1.45rem] border-[3px] p-2 text-center transition active:scale-[0.98]",
        featured ? "min-h-[168px]" : "min-h-[152px]",
        theme.frame,
        theme.glow,
        active ? "ring-4 ring-[#0a7f3a]/20" : "ring-1 ring-white/70",
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:radial-gradient(#7f6a3e_1px,transparent_1px)] [background-size:12px_12px]" />

      <div
        className={[
          "relative z-10 mb-1 overflow-hidden rounded-full border-[3px] border-[#f7e7c4] bg-[#314633]",
          featured ? "h-[86px] w-[86px]" : "h-[76px] w-[76px]",
          "shadow-[0_7px_0_rgba(65,45,20,0.18)]",
        ].join(" ")}
      >
        <img
          src={imageSrc}
          alt={name}
          draggable={false}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      </div>

      <div
        className={[
          "relative z-10 leading-none",
          featured ? "text-[23px]" : "text-[20px]",
          "font-black",
          theme.label,
        ].join(" ")}
      >
        {name}
      </div>

      <div className="relative z-10 mt-1 text-[12px] font-black uppercase tracking-[0.08em] text-[#1e2f2a]">
        {title}
      </div>

      <div className="relative z-10 mt-1 line-clamp-2 text-[11px] font-bold leading-tight text-[#687285]">
        {subtitle}
      </div>
    </button>
  );
}

export { ZiiplyMobileAssistantButton };
