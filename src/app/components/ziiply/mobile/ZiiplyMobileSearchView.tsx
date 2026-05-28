"use client";

import React from "react";

/**
 * TEMP SAFE BUILD VERSION
 *
 * Tämä tiedosto on tarkoituksella erittäin salliva välivaiheen komponentti.
 * Sen tehtävä on estää Next/TypeScript-buildin kaatuminen sillä aikaa,
 * kun P394 page.tsx pidetään viimeisimpänä toimivana mobiilinäkymänä.
 *
 * Kun varsinainen SearchView irrotetaan P394:stä uudelleen hallitusti,
 * tämä korvataan täydellä toteutuksella.
 */
export type ZiiplyMobileSearchViewProps = {
  open?: boolean;
  closing?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
};

export default function ZiiplyMobileSearchView({
  open = true,
  closing = false,
  className = "",
  children,
}: ZiiplyMobileSearchViewProps) {
  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[84] block bg-[#eef7f2]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+6.1rem)] pt-[calc(env(safe-area-inset-top)+6.8rem)] backdrop-blur-xl sm:hidden ${
        closing ? "ziiply-soft-close" : "ziiply-soft-open"
      } ${className}`}
    >
      <div className="mx-auto h-full max-w-[34rem] overflow-y-auto rounded-[2rem] bg-white/92 p-3 shadow-[0_18px_55px_rgba(15,23,42,0.16)] ring-1 ring-white/80">
        {children}
      </div>
    </div>
  );
}

export { ZiiplyMobileSearchView };
