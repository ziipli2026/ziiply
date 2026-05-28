"use client";

import React, { useEffect, useRef, useState } from "react";

export type ZiiplyMobileLocationBarProps = {
  locationInput: string;
  usingOwnLocation: boolean;
  storeSearchLoading: boolean;
  gpsErrorMessage?: string;
  onLocationInputChange: (value: string) => void;
  onGpsClick: () => void;
  onApplyLocation: () => void | Promise<void>;
  onOpenMap?: () => void | Promise<void>;
  gpsStatusText?: string;
};

export default function ZiiplyMobileLocationBar({
  locationInput,
  usingOwnLocation,
  storeSearchLoading,
  gpsErrorMessage,
  onLocationInputChange,
  onGpsClick,
  onApplyLocation,
  onOpenMap,
  gpsStatusText,
}: ZiiplyMobileLocationBarProps) {
  const [gpsClickLocked, setGpsClickLocked] = useState(false);
  const gpsClickUnlockTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (gpsClickUnlockTimerRef.current) {
        window.clearTimeout(gpsClickUnlockTimerRef.current);
        gpsClickUnlockTimerRef.current = null;
      }
    };
  }, []);

  const gpsButtonDisabled = storeSearchLoading || gpsClickLocked;

  function handleGpsClick() {
    if (gpsButtonDisabled) return;

    setGpsClickLocked(true);
    onGpsClick();

    if (gpsClickUnlockTimerRef.current) {
      window.clearTimeout(gpsClickUnlockTimerRef.current);
    }

    gpsClickUnlockTimerRef.current = window.setTimeout(() => {
      setGpsClickLocked(false);
      gpsClickUnlockTimerRef.current = null;
    }, 900);
  }

  const statusText = gpsErrorMessage
    ? gpsErrorMessage
    : gpsStatusText
      ? gpsStatusText
      : storeSearchLoading && usingOwnLocation
        ? "Paikannetaan GPS…"
        : usingOwnLocation
          ? "Käytetään GPS"
          : "";

  return (
    <section className="mx-auto w-full max-w-[390px] rounded-[1.45rem] bg-white/96 px-2.5 py-1.5 shadow-[0_10px_26px_rgba(15,23,42,0.10)] ring-1 ring-white/80">
      <div className="flex h-[56px] items-stretch gap-2">
        <button
          type="button"
          onClick={handleGpsClick}
          onMouseDown={(event) => event.preventDefault()}
          disabled={gpsButtonDisabled}
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center self-center rounded-[1.05rem] border-2 border-[#d7f1dd] bg-[#eef9f0] text-[25px] shadow-inner active:scale-[0.98] disabled:opacity-70"
          aria-label="Käytä GPS-sijaintia"
          aria-pressed={usingOwnLocation}
        >
          📍
        </button>

        <form
          className="relative min-w-0 flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            void onApplyLocation();
          }}
        >
          <input
            value={locationInput}
            onChange={(event) => onLocationInputChange(event.target.value)}
            placeholder="05510 tai Hyvinkää"
            className={[
              "h-[52px] w-full rounded-[1.05rem] border-2 border-[#d7dfec] bg-[#fcfcff] px-3 font-black tracking-[-0.02em] text-[#324255] outline-none placeholder:text-[#96a2b7]",
              statusText ? "pb-[17px] pt-1 text-[15px]" : "py-0 text-[16px]",
            ].join(" ")}
          />

          {statusText && (
            <div
              className={[
                "pointer-events-none absolute inset-x-[12px] bottom-[7px] truncate text-[10px] font-black leading-none",
                gpsErrorMessage ? "text-[#b42318]" : "text-[#3d8654]",
              ].join(" ")}
            >
              {statusText}
            </div>
          )}
        </form>

        <button
          type="button"
          onClick={onOpenMap || onApplyLocation}
          className="flex h-[52px] w-[78px] shrink-0 items-center justify-center self-center rounded-[1.05rem] bg-[#03133f] px-2 text-[13px] font-black text-white shadow-[0_7px_18px_rgba(3,19,63,0.20)] active:scale-[0.98]"
          aria-label="Avaa valitut kaupat kartalla"
          title="Avaa kartta"
        >
          <span className="mr-1 text-[18px] leading-none">🗺️</span>
          <span>Kartta</span>
        </button>
      </div>
    </section>
  );
}

export { ZiiplyMobileLocationBar };
