"use client";

import React from "react";
import * as TopbarResponsiveCardModule from "../cards/TopbarResponsiveCard";

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

const TopbarResponsiveCard = ((TopbarResponsiveCardModule as any).default ||
  (TopbarResponsiveCardModule as any).TopbarResponsiveCard ||
  (TopbarResponsiveCardModule as any).ZiiplyTopBar ||
  (TopbarResponsiveCardModule as any).ZiiplyTopbarResponsiveCard) as any;

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
  return (
    <div
      className={`relative z-[80] m-0 p-0 mt-1 mb-0 ziiply-desktop-debug-compact sm:mx-auto sm:max-w-[1180px] sm:px-4 ${hidden ? "hidden" : ""}`}
    >
      <TopbarResponsiveCard
        areaLabel={areaLabel}
        storeModeLabel=""
        logoImageSrc="/ziiplylogo_mobile.png"
        infoItems={MOBILE_INFO_ITEMS}
        onOpenArea={onOpenArea}
      />
    </div>
  );
}

export { ZiiplyMobileTopBar };
