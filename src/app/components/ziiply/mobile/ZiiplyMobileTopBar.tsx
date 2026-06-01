"use client";

// ZIIPLY_MOBILE_TOPBAR_V5_FULL_REBUILD
// Uudelleen rakennettu yläpalkki.
// Säilyttää saman public props -rajapinnan kuin V4.
// Korjaukset:
// - sää: turvallinen GPS/API fallback, ei jää rikkinäiseen tilaan
// - sähkö: useampi API-haara + selkeä hintaluokkaindikaattori
// - ajoneuvo: ei harhaanjohtavaa "BENSA"-otsikkoa vaan "AJOAINE"
// - kalenteri: ei pakota webcal://-avausta ellei callbackia ole annettu
// - ulkoasu: sama retro/emaltti-perhe kuin location barissa
// - paneelit ovat tasaisemmat, tekstit eivät leikkaannu yhtä helposti

import React, { useEffect, useMemo, useState } from "react";

type InfoKind = "weather" | "electricity" | "fuel" | "calendar";
type PriceLevel = "low" | "normal" | "high" | "unknown";

type InfoPanel = {
  id: InfoKind;
  title: string;
  value: string;
  unit?: string;
  detail: string;
  graphic: React.ReactNode;
  onClick?: () => void;
  level?: PriceLevel;
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

function readNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const text = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");

  const match = text.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  const number = Number(match[0]);
  return Number.isFinite(number) ? number : null;
}

function weatherTextFromCode(code?: number) {
  if (code == null || !Number.isFinite(code)) return "Sää";
  if (code === 0) return "Selkeää";
  if ([1, 2, 3].includes(code)) return "Puolipilvistä";
  if ([45, 48].includes(code)) return "Sumua";
  if ([51, 53, 55, 56, 57].includes(code)) return "Tihkua";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Sadetta";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Lunta";
  if ([95, 96, 99].includes(code)) return "Ukkosta";
  return "Sää";
}

function electricityLevel(value: string): PriceLevel {
  const number = readNumber(value);
  if (number == null) return "unknown";
  if (number < 8) return "low";
  if (number <= 16) return "normal";
  return "high";
}

function levelDotClass(level: PriceLevel) {
  if (level === "low") return "bg-[#159447] shadow-[0_0_0_2px_rgba(21,148,71,0.18),0_1px_4px_rgba(6,74,33,0.35)]";
  if (level === "normal") return "bg-[#d8a928] shadow-[0_0_0_2px_rgba(216,169,40,0.18),0_1px_4px_rgba(89,57,0,0.28)]";
  if (level === "high") return "bg-[#c93632] shadow-[0_0_0_2px_rgba(201,54,50,0.18),0_1px_4px_rgba(96,20,16,0.35)]";
  return "bg-[#b8a77e] shadow-[0_0_0_2px_rgba(184,167,126,0.15),0_1px_4px_rgba(75,52,16,0.20)]";
}

function panelClass(kind: InfoKind) {
  const base =
    "relative h-[58px] min-w-0 overflow-hidden rounded-[0.56rem] border-[1.5px] px-[5px] py-[4px] text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_1px_0_rgba(77,55,19,0.10)] active:scale-[0.985]";

  if (kind === "weather") {
    return `${base} border-[#b5cbb4] bg-[linear-gradient(180deg,#fffbe9_0%,#fff2c9_100%)] text-[#063f35]`;
  }

  if (kind === "electricity") {
    return `${base} border-[#d2b363] bg-[linear-gradient(180deg,#fff5ca_0%,#ffe391_100%)] text-[#573300]`;
  }

  if (kind === "fuel") {
    return `${base} border-[#c78b63] bg-[linear-gradient(180deg,#fff1da_0%,#ffd0aa_100%)] text-[#5a1f00]`;
  }

  return `${base} border-[#c9a86d] bg-[linear-gradient(180deg,#fff9df_0%,#ffe8a6_100%)] text-[#3f2b00]`;
}

function cornerBolts() {
  return (
    <>
      <span className="absolute left-[4px] top-[4px] h-[5px] w-[5px] rounded-full border border-[#b08a4d] bg-[#fff2bc] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" />
      <span className="absolute right-[4px] top-[4px] h-[5px] w-[5px] rounded-full border border-[#b08a4d] bg-[#fff2bc] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" />
      <span className="absolute bottom-[4px] left-[4px] h-[5px] w-[5px] rounded-full border border-[#b08a4d] bg-[#fff2bc] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" />
      <span className="absolute bottom-[4px] right-[4px] h-[5px] w-[5px] rounded-full border border-[#b08a4d] bg-[#fff2bc] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" />
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

function monthAbbrFi(date = new Date()) {
  return ["TAM", "HEL", "MAA", "HUI", "TOU", "KES", "HEI", "ELO", "SYY", "LOK", "MAR", "JOU"][
    date.getMonth()
  ];
}

export default function ZiiplyMobileTopBar({
  hidden = false,
  areaLabel = "Hyvinkää",

  weatherValue,
  weatherText,

  electricityValue,
  electricityText,

  fuelValue = "—",
  fuelText = "Ajoaine",

  calendarValue,
  calendarText,

  onOpenWeather,
  onOpenElectricity,
  onOpenFuel,
  onOpenCalendar,
}: ZiiplyMobileTopBarProps) {
  const [autoWeatherValue, setAutoWeatherValue] = useState("+18°");
  const [autoWeatherText, setAutoWeatherText] = useState(areaLabel);
  const [autoElectricityValue, setAutoElectricityValue] = useState("—");
  const [autoElectricityText, setAutoElectricityText] = useState("haetaan");

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

    function toCentsPerKwh(value: unknown, unit: "cents" | "eur" = "cents") {
      const number = readNumber(value);
      if (number == null) return null;

      const cents = unit === "eur" ? number * 100 : number;
      if (!Number.isFinite(cents) || Math.abs(cents) > 500) return null;

      return cents;
    }

    function readPrice(item: any) {
      if (!item || typeof item !== "object") return null;

      return (
        toCentsPerKwh(item.price, "cents") ??
        toCentsPerKwh(item.value, "cents") ??
        toCentsPerKwh(item.priceWithTax, "cents") ??
        toCentsPerKwh(item.PriceWithTax, "cents") ??
        toCentsPerKwh(item.spotPrice, "cents") ??
        toCentsPerKwh(item.SpotPrice, "cents") ??
        toCentsPerKwh(item.centsPerKwh, "cents") ??
        toCentsPerKwh(item.cents_per_kwh, "cents") ??
        toCentsPerKwh(item.EUR_per_kWh, "eur") ??
        toCentsPerKwh(item.eur_per_kwh, "eur") ??
        toCentsPerKwh(item.eurPerKwh, "eur")
      );
    }

    function readTime(...values: unknown[]) {
      for (const value of values) {
        if (value == null) continue;
        const time = new Date(String(value)).getTime();
        if (Number.isFinite(time)) return time;
      }

      return null;
    }

    async function fetchJson(url: string) {
      const separator = url.includes("?") ? "&" : "?";
      const response = await fetch(`${url}${separator}ziiply_no_cache=${Date.now()}`, {
        cache: "no-store",
        headers: { accept: "application/json" },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }

    async function readFromLatestPrices() {
      const urls = [
        "https://api.porssisahko.net/v1/latest-prices.json",
        "https://api.porssisahko.net/v2/latest-prices.json",
      ];

      let lastMessage = "ei listaa";

      for (const url of urls) {
        try {
          const data = await fetchJson(url);
          const rawPrices = Array.isArray(data?.prices)
            ? data.prices
            : Array.isArray(data)
              ? data
              : [];

          const windows = rawPrices
            .map((item: any) => {
              const price = readPrice(item);
              const startMs = readTime(
                item.startDate,
                item.start,
                item.StartDate,
                item.time_start,
                item.date,
                item.Date,
              );
              const endMs = readTime(
                item.endDate,
                item.end,
                item.EndDate,
                item.time_end,
              );

              if (price == null || startMs == null || endMs == null) return null;
              return { price, startMs, endMs };
            })
            .filter(Boolean)
            .sort((a: any, b: any) => a.startMs - b.startMs) as Array<{
              price: number;
              startMs: number;
              endMs: number;
            }>;

          if (windows.length === 0) {
            lastMessage = "tyhjä lista";
            continue;
          }

          const now = Date.now();
          const current = windows.find((item) => item.startMs <= now && now < item.endMs);

          if (!current) {
            lastMessage = "ei nykyhetkeä";
            continue;
          }

          return current.price;
        } catch (error) {
          lastMessage = error instanceof Error ? error.message : "api virhe";
        }
      }

      throw new Error(lastMessage);
    }

    async function readFromDirectPrice() {
      const iso = new Date().toISOString();
      const data = await fetchJson(
        `https://api.porssisahko.net/v2/price.json?date=${encodeURIComponent(iso)}`,
      );

      const price = readPrice(data);
      if (price == null) throw new Error("ei hintaa");

      return price;
    }

    async function loadElectricity() {
      if (cancelled) return;
      setAutoElectricityText("haetaan");

      try {
        let price: number | null = null;
        let latestError = "";

        try {
          price = await readFromLatestPrices();
        } catch (error) {
          latestError = error instanceof Error ? error.message : "listahaku";
        }

        if (price == null) {
          try {
            price = await readFromDirectPrice();
          } catch (error) {
            const directError = error instanceof Error ? error.message : "suorahaku";
            throw new Error(`${latestError} / ${directError}`);
          }
        }

        if (cancelled) return;

        setAutoElectricityValue(fmtFi(price, 1));
        setAutoElectricityText("c/kWh");
      } catch (error) {
        if (cancelled) return;

        const message = error instanceof Error ? error.message : "api virhe";
        setAutoElectricityValue("—");

        if (message.includes("Failed to fetch")) setAutoElectricityText("fetch");
        else if (message.includes("HTTP")) setAutoElectricityText(message.slice(0, 10));
        else if (message.includes("ei nykyhetkeä")) setAutoElectricityText("ei nyt");
        else if (message.includes("tyhjä lista")) setAutoElectricityText("ei listaa");
        else if (message.includes("ei hintaa")) setAutoElectricityText("ei hintaa");
        else setAutoElectricityText("api");
      }
    }

    loadElectricity();
    const interval = window.setInterval(loadElectricity, 5 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [hidden]);

  const today = useMemo(() => new Date(), []);
  const dayValue = useMemo(() => {
    if (calendarValue) return calendarValue;
    return String(today.getDate());
  }, [calendarValue, today]);

  const monthLabel = useMemo(() => calendarText || monthAbbrFi(today), [calendarText, today]);

  const effectiveElectricityValue = electricityValue || autoElectricityValue;
  const effectiveElectricityText = electricityText || autoElectricityText;
  const electricityPriceLevel = electricityLevel(effectiveElectricityValue);

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
      value: effectiveElectricityValue,
      unit: effectiveElectricityText === "c/kWh" ? "c/kWh" : undefined,
      detail: effectiveElectricityText,
      graphic: <ElectricityGraphic />,
      onClick: onOpenElectricity,
      level: electricityPriceLevel,
    },
    {
      id: "fuel",
      title: "AJOAINE",
      value: fuelValue,
      unit: fuelValue === "—" ? undefined : "€/l",
      detail: fuelText,
      graphic: <FuelGraphic />,
      onClick: onOpenFuel,
    },
    {
      id: "calendar",
      title: monthLabel,
      value: dayValue,
      detail: "PVM",
      graphic: <CalendarGraphic day={dayValue} />,
      onClick: onOpenCalendar,
    },
  ];

  if (hidden) return null;

  return (
    <div className="fixed inset-x-0 top-[max(env(safe-area-inset-top),0px)] z-[90] mx-auto block w-full px-[6px] pt-[4px] sm:hidden">
      <div className="mx-auto flex h-[82px] w-[calc(100vw-12px)] max-w-none items-center overflow-hidden rounded-[1.75rem] border-[4px] border-[#073d32] bg-[linear-gradient(180deg,#fffdf3_0%,#fff5d9_62%,#ead49a_100%)] px-[7px] shadow-[0_0_0_2px_rgba(255,255,255,0.70)_inset,0_5px_0_rgba(54,39,17,0.20),0_15px_28px_rgba(8,42,35,0.16)]">
        <div className="grid min-w-0 flex-1 grid-cols-[0.92fr_1.02fr_1.25fr_0.86fr] gap-[6px]">
          {panels.map((panel) => {
            const inner = (
              <>
                {cornerBolts()}
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.76),transparent_55%)]" />

                {panel.id === "electricity" && (
                  <span
                    className={`absolute right-[15px] top-[30px] z-20 h-[9px] w-[9px] rounded-full border border-[#7c5c22] ${levelDotClass(
                      panel.level || "unknown",
                    )}`}
                    aria-hidden="true"
                  />
                )}

                <div className="relative z-10 flex h-full flex-col items-center justify-center text-center leading-none">
                  <div className="flex items-center justify-center gap-[3px]">
                    {panel.graphic}
                    <div className="text-[10px] font-black uppercase tracking-[0.045em]">
                      {panel.title}
                    </div>
                  </div>

                  <div className="mt-[1px] flex items-end justify-center gap-[2px]">
                    <span className="text-[19px] font-black leading-none tracking-[-0.05em] text-[#041b19]">
                      {panel.value}
                    </span>
                    {panel.unit && (
                      <span className="pb-[1px] text-[8px] font-black leading-none opacity-80">
                        {panel.unit}
                      </span>
                    )}
                  </div>

                  <div className="mt-[2px] max-w-full truncate px-1 text-[8px] font-black leading-none opacity-75">
                    {panel.detail}
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
