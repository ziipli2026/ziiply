"use client";

import FuelStationBackdrop from "./FuelStationBackdrop";

import { useEffect, useMemo, useState } from "react";
import ZiiplyMobileStoreModeSelector from "./ZiiplyMobileStoreModeSelector";
import { isValidFuelPrice, sortFuelStations, type FuelComparisonSort } from "./fuelComparison";

type Station = {
  id: string;
  name: string;
  chain: string;
  address: string;
  isTrafficStation: boolean;
  distanceKm: number;
  diesel: number | null;
  price95: number | null;
  price98: number | null;
  observedDiesel: string | null;
  observed95: string | null;
  observed98: string | null;
};
const groups = [
  { key: "Neste", logo: "Neste.png" },
  { key: "ABC", logo: "ABC.png" },
  { key: "Gulf / Ritoil / Muu", logo: null },
  { key: "St1", logo: "St1.png" },
  { key: "SEO", logo: "SEO.jpeg" },
];
function group(s: Station) {
  const text = `${s.chain} ${s.name}`;
  return /neste/i.test(text)
    ? "Neste"
    : /\babc\b/i.test(text)
      ? "ABC"
      : /st1|shell/i.test(text)
        ? "St1"
        : /\bseo\b/i.test(text)
          ? "SEO"
          : "Gulf / Ritoil / Muu";
}
const price = (n: number | null) =>
  !isValidFuelPrice(n)
    ? "–"
    : n.toLocaleString("fi-FI", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      });
export default function ZiiplyMobileFuelView({
  coords,
  comparisonOpen = false,
  onCloseComparison,
  onComparisonReadyChange,
}: {
  coords: { lat: number; lon: number } | null;
  onBack: () => void;
  comparisonOpen?: boolean;
  onCloseComparison?: () => void;
  onComparisonReadyChange?: (ready: boolean) => void;
}) {
  const [stations, setStations] = useState<Station[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [stationSide, setStationSide] = useState<"traffic" | "both" | "cold">("both");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [comparisonSort, setComparisonSort] = useState<FuelComparisonSort>("distance");
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    fetch(
      `/api/fuel/stations?lat=${coords?.lat ?? 64}&lon=${coords?.lon ?? 26}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => {
        if (!data.ok || !Array.isArray(data.stations)) throw Error();
        setStations(data.stations);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Asemien haku epäonnistui. Avaa hintanäkymä uudelleen.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [coords?.lat, coords?.lon]);
  // Match desktop: select chain groups and show the nearest eligible station.
  const filtered = useMemo(
    () => !coords ? [] : stations
      // Station cards are LOCAL discovery, not a nationwide fallback.
      // Missing fuel prices do not make a nearby station disappear.
      .filter((s) => Number.isFinite(s.distanceKm) && s.distanceKm >= 0 && s.distanceKm <= 30)
      .filter((s) => stationSide === "both" || s.isTrafficStation === (stationSide === "traffic"))
      .sort((a, b) => a.distanceKm - b.distanceKm),
    [stations, stationSide, coords],
  );
  function toggleGroup(key: string) {
    setSelectedGroups((previous) => previous.includes(key)
      ? previous.filter((item) => item !== key)
      : [...previous, key]);
  }
  const comparisonReady = selectedGroups.length > 0 && !loading && !error;
  useEffect(() => {
    onComparisonReadyChange?.(comparisonReady);
  }, [comparisonReady, onComparisonReadyChange]);
  const comparisonStations = useMemo(
    () => sortFuelStations(filtered.filter((station) => selectedGroups.includes(group(station))), comparisonSort),
    [filtered, selectedGroups, comparisonSort],
  );
  const distanceText = (station: Station) => coords && Number.isFinite(station.distanceKm)
    ? `${station.distanceKm.toLocaleString("fi-FI", { maximumFractionDigits: 1 })} km`
    : "Sijainti puuttuu";
  const observationText = (value: string | null) => value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString("fi-FI", { timeZone: "Europe/Helsinki", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" }).replace(/\s*klo\s*/u, " ")
    : "Aika puuttuu";

  if (comparisonOpen) {
    return (
      <section aria-label="Göstan polttoainevertailu" className="flex h-full min-h-0 flex-col gap-2 pb-2 text-[#213224]">
        <header className="flex shrink-0 items-center gap-2 rounded-2xl border-2 border-[#b38a4a] bg-[#fcf5de] p-2">
          <button type="button" onClick={onCloseComparison} aria-label="Takaisin asemavalintaan" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-[#17573c] bg-[#fff9dd] text-xl font-black">←</button>
          <img src="/assistants/gosta.png" alt="" className="h-10 w-10 shrink-0 object-contain" />
          <div className="min-w-0">
            <h2 className="text-[13px] font-black leading-tight">Göstan polttoainevertailu</h2>
            <p className="text-[13px] font-bold leading-tight">{stationSide === "traffic" ? "Liikenneasemat" : stationSide === "cold" ? "Kylmäasemat / muut" : "Kaikki asemat"} · €/l</p>
          </div>
        </header>
        <div role="group" aria-label="Polttoainevertailun järjestys" className="grid shrink-0 grid-cols-3 gap-1">
          {([
            ["distance", "Lähimmät"],
            ["diesel", "Halvin diesel"],
            ["price95", "Halvin bensa 95"],
          ] as const).map(([sort, label]) => (
            <button key={sort} type="button" aria-pressed={comparisonSort === sort} onClick={() => setComparisonSort(current => current === sort ? "distance" : sort)} className={`min-h-[40px] rounded-xl border-2 px-1 py-1 text-[10px] font-black leading-tight ${comparisonSort === sort ? "border-[#07502c] bg-[#0a6d39] text-white" : "border-[#d2ad68] bg-[#fff8df] text-[#5a4424]"}`}>{label}</button>
          ))}
        </div>
        <p role="status" className="shrink-0 text-center text-[10px] font-bold leading-tight">
          {loading ? "Päivitetään…" : error ? "Asematietojen päivitys epäonnistui" : `${comparisonStations.length} asemaa · ${comparisonSort === "distance" ? "lähin ensin" : "halvin ensin, tasahinnalla lähin"}`}
        </p>
        <div aria-label="Vertailun asemat" className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-1">
          {!loading && !error && comparisonStations.length === 0 && <p className="rounded-xl bg-[#fff8df] p-3 text-center text-xs">Valituista ketjuista ei löytynyt asemia.</p>}
          {comparisonStations.map(station => (
            <article key={station.id} className="rounded-xl border-2 border-[#d9c18e] bg-[#fffaf0] px-1.5 py-1">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-baseline justify-between gap-1 [&::-webkit-details-marker]:hidden" aria-label={`Aseman tiedot: ${station.name}`}>
                  <div className="flex min-w-0 items-baseline gap-1">
                    <span className="shrink-0 text-[11px] font-bold leading-tight text-[#6a5330]">{station.chain || group(station)}</span>
                    <h3 className="min-w-0 truncate text-[12px] font-black leading-tight" title={station.name}>{station.name}</h3>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-[11px] font-black leading-tight">{distanceText(station)}</span>
                </summary>
                <p className="mt-0.5 break-words text-[10px] leading-tight">{station.name}{station.address ? ` · ${station.address}` : ""}</p>
              </details>
              <div className="mt-1 grid grid-cols-3 justify-items-center gap-1 text-center">
                {([
                  ["Diesel", station.diesel, station.observedDiesel],
                  ["95 E", station.price95, station.observed95],
                  ["98 E", station.price98, station.observed98],
                ] as const).map(([label, value, observed]) => (
                  <div key={label} className="w-full max-w-[96px] rounded-md bg-[#f4e9c7] px-0.5 py-0.5">
                    <div className="flex flex-col items-center justify-center whitespace-nowrap leading-[16px]">
                      <p className="text-[12px] font-bold">{label}</p>
                      <p className="text-[15px] font-black tabular-nums">{price(value)}</p>
                    </div>
                    <p className="whitespace-nowrap text-[8px] leading-[10px]">{isValidFuelPrice(value) ? observationText(observed) : "Ei hintaa"}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }
  return (
    <div className="flex h-full min-h-0 flex-col gap-3 pb-2">
      <ZiiplyMobileStoreModeSelector
        fuelMode
        fuelStationSide={stationSide}
        onFuelStationSideChange={setStationSide}
        storeMode={stationSide === "cold" ? "local" : "hyper"}
        storeModeChosen
        storeCompareScope="between_chains"
        withinChain={null}
        selectedRealChainCount={selectedGroups.length}
        betweenChainSelectionMode="many"
        onStoreModeChange={(mode) => setStationSide(mode === "hyper" ? "traffic" : "cold")}
        onStoreCompareScopeChange={() => {}}
      />
      <div
        className="grid min-h-0 flex-1 grid-cols-2 grid-rows-[repeat(3,minmax(0,1fr))] gap-x-2 gap-y-3 px-1"
        aria-label="Polttoaineasemat"
      >
        {groups.map((g) => {
          const station = filtered.find((s) => group(s) === g.key);
          const chosen = selectedGroups.includes(g.key);
          return (
            <article
              key={g.key}
              className={`relative h-full min-h-0 min-w-0 overflow-hidden rounded-[1.18rem] border-[2.5px] px-2 pt-1 text-center shadow-[0_1px_0_rgba(77,50,18,0.12),0_5px_10px_rgba(52,38,14,0.05),inset_0_0_0_1px_rgba(255,255,255,0.90)] ${g.key === "Gulf / Ritoil / Muu" ? "col-span-2 w-[calc(50%-6px)] justify-self-center" : ""} ${chosen ? "border-[#5c7858] bg-gradient-to-b from-[#fffbe7] to-[#d8dfb5]" : "border-[#d9c18e] bg-gradient-to-b from-[#fffaf0] to-[#f4e9c7]"}`}
            >
              <FuelStationBackdrop chain={g.key === "Gulf / Ritoil / Muu" ? "Muut" : g.key as "Neste" | "ABC" | "St1" | "SEO"} />
              <div
                className="relative grid h-full w-full grid-rows-[minmax(0,1fr)_14px_24px] gap-y-0.5 pb-1 text-center"
              >
                <span className="absolute left-0 top-0 flex h-[22px] w-[30px] items-center justify-center overflow-hidden rounded-[0.45rem] border border-[#b89552] bg-[#fffef9] p-px">
                  {g.logo ? (
                    <img
                      src={`/storelogos/${g.logo}`}
                      alt={g.key}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="relative flex h-full w-full overflow-hidden" aria-label="Gulf / Ritoil">
                      <span className="relative h-full w-1/2 overflow-hidden">
                        <img src="https://commons.wikimedia.org/wiki/Special:FilePath/Gulf_Oil_logo.svg" alt="Gulf" className="absolute left-0 top-0 h-full w-[200%] max-w-none object-contain" />
                      </span>
                      <span className="relative h-full w-1/2 overflow-hidden">
                        <img src="https://commons.wikimedia.org/wiki/Special:FilePath/RITOIL_Logo.svg" alt="Ritoil" className="absolute right-0 top-0 h-full w-[200%] max-w-none object-contain" />
                      </span>
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => toggleGroup(g.key)}
                  aria-label={`Valitse ${g.key}`}
                  aria-pressed={chosen}
                  className={`absolute -right-1 -top-1 z-20 flex h-[28px] w-[28px] items-center justify-center rounded-full border text-[13px] font-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#17573c] ${chosen ? "border-[#536d4f] bg-[#648060] text-white" : "border-[#d0ad68] bg-[#fff8dc] text-transparent"}`}
                >
                  ✓
                </button>
                <span className="col-start-1 row-start-1 flex min-h-0 items-center justify-center overflow-hidden pl-[32px] pr-[26px] text-[clamp(10px,2.8vw,13px)] font-black leading-[1.1] text-[#050505]">
                  <span className="line-clamp-2 break-words">
                  {station?.name ?? (loading ? "Haetaan…" : !coords ? "Sijainti puuttuu" : "Ei lähiasemaa")}
                  </span>
                </span>
                <span className={`col-start-1 row-start-2 text-[11px] font-black leading-[14px] text-black ${g.logo ? "flex w-[30px] justify-self-start justify-center whitespace-nowrap" : "block"}`}>
                  {station
                    ? coords
                      ? `${station.distanceKm.toLocaleString("fi-FI", { maximumFractionDigits: 1 })} km`
                      : "Sijainti puuttuu"
                    : "–"}
                </span>
              </div>
              <div className="pointer-events-none absolute inset-x-1 bottom-1 z-10 grid grid-cols-3 items-end gap-0.5 rounded bg-[#fff9e6]/85 text-center font-black leading-[1.05] text-[#213224]">
                <span className="min-w-0"><span className="block text-[10px]">D</span><span className="block whitespace-nowrap text-[clamp(10px,2.7vw,13px)]">{price(station?.diesel ?? null)}</span></span>
                <span className="min-w-0"><span className="block text-[10px]">95 E</span><span className="block whitespace-nowrap text-[clamp(10px,2.7vw,13px)]">{price(station?.price95 ?? null)}</span></span>
                <span className="min-w-0"><span className="block text-[10px]">98 E</span><span className="block whitespace-nowrap text-[clamp(10px,2.7vw,13px)]">{price(station?.price98 ?? null)}</span></span>
              </div>

            </article>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
