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
  if (hidden) return null;

  return (
    <div className="fixed inset-x-0 top-[max(env(safe-area-inset-top),0px)] z-[80] m-0 px-2 pt-1 pb-0 sm:relative sm:top-auto sm:z-auto sm:mx-auto sm:max-w-[1180px] sm:px-4 sm:pt-1">
      <div className="mx-auto w-[calc(100vw-16px)] max-w-[820px] sm:w-full sm:max-w-none">
        <TopbarResponsiveCard
          areaLabel={areaLabel}
          storeModeLabel=""
          logoImageSrc="/ziiplylogo_mobile.png"
          infoItems={MOBILE_INFO_ITEMS}
          onOpenArea={onOpenArea}
        />
      </div>
    </div>
  );
}

export { ZiiplyMobileTopBar };
