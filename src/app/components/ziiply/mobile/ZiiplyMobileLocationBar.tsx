"use client";

// V417_COMPASS_IMAGE_MAP_BUTTON: Kartta-napissa public/icons/compass.png ilman tekstiä.

// V417_MAP_BUTTON_ICON_ONLY: -napin tekstin tilalla pelkkä kompassi/karttakuvake.

// V405_GPS_CAN_ALWAYS_TOGGLE_OFF: GPS-nappi ei lukitu storeSearchLoading-tilassa.

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

  // GPS pitää saada aina pois päältä myös paikannuksen/kauppahaun aikana.
  // Estetään vain tuplaklikkaus, ei storeSearchLoading-tilaa.
  const gpsButtonDisabled = gpsClickLocked;

  function handleGpsClick() {
    // v382_GPS_BUTTON_DEBOUNCE:
    // Estää GPS pois/päälle -tuplapainalluksesta syntyvän välirenderin,
    // jossa kaupan valintaikkuna ehtii vilahtaa ennen kuin uusi sijaintihaku on valmis.
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
    <section className="rounded-[1.45rem] bg-white/96 px-2.5 py-1.5 shadow-[0_10px_26px_rgba(15,23,42,0.10)] ring-1 ring-white/80">
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

        <div className="relative min-w-0 flex-1">
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
        </div>

        <button
          type="button"
          onClick={onOpenMap || onApplyLocation}
          disabled={false}
          className="flex h-[52px] w-[78px] shrink-0 items-center justify-center self-center rounded-[1.05rem] bg-[#03133f] px-2 text-[13px] font-black text-white shadow-[0_7px_18px_rgba(3,19,63,0.20)] active:scale-[0.98]"
          aria-label="Avaa valitut kaupat kartalla"
          title="Avaa kartta"
        >
        <img
          src="/icons/ziiply-compass.png"
          alt="Kartta"
          className="h-10 w-10 object-contain drop-shadow-sm transition-transform duration-150 group-hover:scale-105 group-active:scale-95"
          draggable={false}
        />
      </button>
      </div>
    </section>
  );
}

export { ZiiplyMobileLocationBar };
