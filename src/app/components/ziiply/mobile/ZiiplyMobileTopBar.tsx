"use client";

import React, { useEffect, useMemo, useState } from "react";

type InfoKind = "weather" | "electricity" | "fuel" | "calendar";

type InfoPanel = {
  id: InfoKind;
  title: string;
  value: string;
  unit?: string;
  detail: string;
  foot?: string;
  graphic: React.ReactNode;
  onClick?: () => void;
};

export type ZiiplyMobileTopBarProps = {
  hidden?: boolean;
  areaLabel?: string;

  weatherValue?: string;
  weatherText?: string;

  electricityValue?: string;
  electricityText?: string;

  fuelValue?: string;
  fuelText?: string;

  calendarValue?: string;
  calendarText?: string;

  onOpenWeather?: () => void;
  onOpenElectricity?: () => void;
  onOpenFuel?: () => void;
  onOpenCalendar?: () => void;
};

function fmtFi(value: number, digits = 1) {
  return value.toLocaleString("fi-FI", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function weatherTextFromCode(code?: number) {
  if (code == null) return "Sää";
  if (code === 0) return "Selkeää";
  if ([1, 2, 3].includes(code)) return "Puolipilvistä";
  if ([45, 48].includes(code)) return "Sumua";
  if ([51, 53, 55, 56, 57].includes(code)) return "Tihkua";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Sadetta";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Lunta";
  if ([95, 96, 99].includes(code)) return "Ukkosta";
  return "Sää";
}

function panelClass(kind: InfoKind) {
  const base =
    "relative h-[56px] min-w-0 overflow-hidden rounded-[0.42rem] border-[1.5px] px-[5px] py-[4px] text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_1px_0_rgba(0,0,0,0.08)] active:scale-[0.985]";

  if (kind === "weather") {
    return `${base} border-[#b9d0ba] bg-[linear-gradient(180deg,#fff9e4_0%,#fff2c5_100%)] text-[#083c32]`;
  }

  if (kind === "electricity") {
    return `${base} border-[#d6b667] bg-[linear-gradient(180deg,#fff4c8_0%,#ffe499_100%)] text-[#593300]`;
  }

  if (kind === "fuel") {
    return `${base} border-[#c98d65] bg-[linear-gradient(180deg,#fff0d7_0%,#ffd3af_100%)] text-[#5a1f00]`;
  }

  return `${base} border-[#caa66d] bg-[linear-gradient(180deg,#fff9de_0%,#ffe9a8_100%)] text-[#3f2b00]`;
}

function cornerBolts() {
  return (
    <>
      <span className="absolute left-[4px] top-[4px] h-[5px] w-[5px] rounded-full border border-[#b38a4d] bg-[#fff2bc]" />
      <span className="absolute right-[4px] top-[4px] h-[5px] w-[5px] rounded-full border border-[#b38a4d] bg-[#fff2bc]" />
      <span className="absolute bottom-[4px] left-[4px] h-[5px] w-[5px] rounded-full border border-[#b38a4d] bg-[#fff2bc]" />
      <span className="absolute bottom-[4px] right-[4px] h-[5px] w-[5px] rounded-full border border-[#b38a4d] bg-[#fff2bc]" />
    </>
  );
}

function WeatherGraphic() {
  return (
    <svg viewBox="0 0 64 64" className="h-[24px] w-[24px] drop-shadow-sm" aria-hidden="true">
      <circle cx="24" cy="23" r="11" fill="#ffd84d" stroke="#e2a400" strokeWidth="3" />
      <path d="M24 4v8M24 34v8M5 23h8M35 23h8M10 9l6 6M38 9l-6 6" stroke="#f5b400" strokeWidth="4" strokeLinecap="round" />
      <path d="M25 47h25a10 10 0 0 0 0-20 14 14 0 0 0-26-3 12 12 0 0 0 1 23Z" fill="#f4fbff" stroke="#b6d5ea" strokeWidth="3" />
    </svg>
  );
}

function ElectricityGraphic() {
  return (
    <svg viewBox="0 0 64 64" className="h-[25px] w-[25px] drop-shadow-sm" aria-hidden="true">
      <path d="M37 3 14 36h18L25 61l25-36H32L37 3Z" fill="#ffc226" stroke="#e58b00" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}

function FuelGraphic() {
  return (
    <svg viewBox="0 0 64 64" className="h-[25px] w-[25px] drop-shadow-sm" aria-hidden="true">
      <rect x="14" y="9" width="28" height="45" rx="5" fill="#d71920" stroke="#9b1117" strokeWidth="4" />
      <rect x="19" y="15" width="18" height="12" rx="2" fill="#fff4e8" />
      <path d="M42 18h6l6 8v24a5 5 0 0 1-10 0V32" fill="none" stroke="#9b1117" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M48 18v12h7" fill="none" stroke="#9b1117" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function CalendarGraphic({ day }: { day: string }) {
  return (
    <svg viewBox="0 0 64 64" className="h-[25px] w-[25px] drop-shadow-sm" aria-hidden="true">
      <rect x="10" y="12" width="44" height="42" rx="6" fill="#fff9e8" stroke="#8a5b1d" strokeWidth="4" />
      <path d="M10 22h44" stroke="#c83927" strokeWidth="8" />
      <path d="M22 8v10M42 8v10" stroke="#8a5b1d" strokeWidth="5" strokeLinecap="round" />
      <text x="32" y="46" textAnchor="middle" fontSize="22" fontWeight="900" fill="#17322a">
        {day}
      </text>
    </svg>
  );
}

export default function ZiiplyMobileTopBar({
  hidden = false,
  areaLabel = "Hyvinkää",

  weatherValue,
  weatherText,

  electricityValue,
  electricityText,

  fuelValue = "—",
  fuelText = "Ei hintaa",

  calendarValue,
  calendarText = "Tänään",

  onOpenWeather,
  onOpenElectricity,
  onOpenFuel,
  onOpenCalendar,
}: ZiiplyMobileTopBarProps) {
  const [autoWeatherValue, setAutoWeatherValue] = useState("+18°");
  const [autoWeatherText, setAutoWeatherText] = useState(areaLabel);
  const [autoElectricityValue, setAutoElectricityValue] = useState("4,2");
  const [autoElectricityText, setAutoElectricityText] = useState("5 min");

  useEffect(() => {
    if (hidden || typeof window === "undefined" || !navigator.geolocation) return;

    let cancelled = false;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
              latitude,
            )}&longitude=${encodeURIComponent(
              longitude,
            )}&current=temperature_2m,weather_code&timezone=auto`,
            { cache: "no-store" },
          );

          if (!response.ok || cancelled) return;

          const data = await response.json();
          const temp = Number(data?.current?.temperature_2m);
          const code = Number(data?.current?.weather_code);

          if (Number.isFinite(temp)) {
            setAutoWeatherValue(`${temp >= 0 ? "+" : ""}${Math.round(temp)}°`);
          }

          setAutoWeatherText(weatherTextFromCode(Number.isFinite(code) ? code : undefined));
        } catch {
          if (!cancelled) setAutoWeatherText(areaLabel);
        }
      },
      () => {
        if (!cancelled) setAutoWeatherText(areaLabel);
      },
      { enableHighAccuracy: false, timeout: 5500, maximumAge: 300000 },
    );

    return () => {
      cancelled = true;
    };
  }, [areaLabel, hidden]);

  useEffect(() => {
    if (hidden || typeof window === "undefined") return;

    let cancelled = false;

    async function loadElectricity() {
      try {
        const response = await fetch("https://api.porssisahko.net/v1/latest-prices.json", {
          cache: "no-store",
        });

        if (!response.ok || cancelled) return;

        const data = await response.json();
        const prices = Array.isArray(data?.prices) ? data.prices : [];
        const now = Date.now();

        const current = prices.find((item: any) => {
          const start = new Date(item.startDate).getTime();
          const end = new Date(item.endDate).getTime();
          return Number.isFinite(start) && Number.isFinite(end) && start <= now && now < end;
        });

        const price = Number(current?.price);
        if (Number.isFinite(price)) {
          setAutoElectricityValue(fmtFi(price, 1));
          setAutoElectricityText("c/kWh");
        }
      } catch {
        // jätetään viimeisin arvo
      }
    }

    loadElectricity();
    const interval = window.setInterval(loadElectricity, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [hidden]);

  const dayValue = useMemo(() => {
    if (calendarValue) return calendarValue;
    return String(new Date().getDate());
  }, [calendarValue]);

  const openCalendar = () => {
    if (onOpenCalendar) {
      onOpenCalendar();
      return;
    }

    // Selain ei saa varmasti avattua iOS/Androidin omaa kalenteria ilman natiivisillan/deep linkin tukea.
    // Tämä on turvallinen fallback: käyttäjän oma callback kannattaa kytkeä sovelluksen puolella.
    window.location.href = "webcal://";
  };

  const panels: InfoPanel[] = [
    {
      id: "weather",
      title: "SÄÄ",
      value: weatherValue || autoWeatherValue,
      detail: weatherText || autoWeatherText,
      graphic: <WeatherGraphic />,
      onClick: onOpenWeather,
    },
    {
      id: "electricity",
      title: "SÄHKÖ",
      value: electricityValue || autoElectricityValue,
      unit: "c/kWh",
      detail: electricityText || autoElectricityText,
      graphic: <ElectricityGraphic />,
      onClick: onOpenElectricity,
    },
    {
      id: "fuel",
      title: "BENSA",
      value: fuelValue,
      unit: fuelValue === "—" ? undefined : "€/l",
      detail: fuelText,
      graphic: <FuelGraphic />,
      onClick: onOpenFuel,
    },
    {
      id: "calendar",
      title: "KAL",
      value: dayValue,
      detail: calendarText,
      foot: "Avaa",
      graphic: <CalendarGraphic day={dayValue} />,
      onClick: openCalendar,
    },
  ];

  if (hidden) return null;

  return (
    <div className="fixed inset-x-0 top-[max(env(safe-area-inset-top),0px)] z-[90] mx-auto block w-full px-[6px] pt-[4px] sm:hidden">
      <div className="mx-auto flex h-[78px] w-[calc(100vw-12px)] max-w-none items-center overflow-hidden rounded-[1.65rem] border-[4px] border-[#073d32] bg-[#fff5d9] px-[7px] shadow-[0_10px_28px_rgba(8,42,35,0.18),inset_0_0_0_2px_rgba(255,255,255,0.7)]">
        <div className="grid min-w-0 flex-1 grid-cols-4 gap-[6px]">
          {panels.map((panel) => {
            const inner = (
              <>
                {cornerBolts()}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.70),transparent_55%)]" />

                <div className="relative z-10 flex h-full flex-col items-center justify-center text-center leading-none">
                  <div className="flex items-center justify-center gap-[2px]">
                    {panel.graphic}
                    <div className="text-[10px] font-black uppercase tracking-[0.04em]">
                      {panel.title}
                    </div>
                  </div>

                  <div className="mt-[1px] flex items-end justify-center gap-[2px]">
                    <span className="text-[18px] font-black leading-none tracking-[-0.04em] text-[#041b19]">
                      {panel.value}
                    </span>
                    {panel.unit && (
                      <span className="pb-[1px] text-[8px] font-black leading-none opacity-80">
                        {panel.unit}
                      </span>
                    )}
                  </div>

                  <div className="mt-[2px] max-w-full truncate px-1 text-[8px] font-black leading-none opacity-75">
                    {panel.foot || panel.detail}
                  </div>
                </div>
              </>
            );

            const cls = panelClass(panel.id);

            if (panel.onClick) {
              return (
                <button
                  key={panel.id}
                  type="button"
                  onClick={panel.onClick}
                  className={cls}
                  aria-label={panel.title}
                >
                  {inner}
                </button>
              );
            }

            return (
              <div key={panel.id} className={cls}>
                {inner}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { ZiiplyMobileTopBar };
