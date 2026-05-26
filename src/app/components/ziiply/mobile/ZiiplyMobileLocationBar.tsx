"use client";

import React from "react";

export type ZiiplyMobileLocationBarProps = {
  locationInput: string;
  usingOwnLocation: boolean;
  storeSearchLoading: boolean;
  gpsErrorMessage?: string;
  onLocationInputChange: (value: string) => void;
  onGpsClick: () => void;
  onApplyLocation: () => void | Promise<void>;
};

export default function ZiiplyMobileLocationBar({
  locationInput,
  usingOwnLocation,
  storeSearchLoading,
  gpsErrorMessage,
  onLocationInputChange,
  onGpsClick,
  onApplyLocation,
}: ZiiplyMobileLocationBarProps) {
  return (
    <section className="sticky top-0 z-[75] -mx-2 border-b border-white/70 bg-[#EAF4F1]/95 px-2 pb-2 pt-1 shadow-[0_12px_28px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:static sm:mx-0 sm:rounded-[1.35rem] sm:border sm:border-slate-200 sm:bg-white/95 sm:p-3 sm:shadow-sm">
      <div className="rounded-[1.45rem] border border-white/80 bg-white/96 p-2 shadow-[0_10px_30px_rgba(15,23,42,0.08)] ring-1 ring-emerald-100/70">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-pressed={usingOwnLocation}
            onClick={onGpsClick}
            title="Käytä omaa sijaintia"
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.35rem] text-2xl font-black shadow-sm ring-1 transition active:scale-[0.98] ${
              usingOwnLocation
                ? "bg-green-50 text-green-600 ring-green-100"
                : "bg-red-50 text-red-600 ring-red-100"
            }`}
          >
            📍
          </button>

          <input
            value={locationInput}
            onChange={(event) => onLocationInputChange(event.target.value)}
            placeholder="05510 tai Hyvinkää"
            className="min-w-0 flex-1 rounded-[1.15rem] border border-slate-300 bg-white px-4 py-3 text-[16px] font-semibold text-slate-900 shadow-inner outline-none placeholder:text-slate-400 focus:border-green-600 focus:ring-4 focus:ring-green-100"
          />

          <button
            type="button"
            onClick={() => void onApplyLocation()}
            disabled={storeSearchLoading}
            className="min-h-[3.35rem] min-w-[82px] shrink-0 rounded-[1.15rem] bg-slate-950 px-4 text-base font-black text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {storeSearchLoading ? "..." : "Käytä"}
          </button>
        </div>

        {gpsErrorMessage ? (
          <div className="mt-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-extrabold text-red-700 shadow-sm">
            {gpsErrorMessage}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export { ZiiplyMobileLocationBar };
