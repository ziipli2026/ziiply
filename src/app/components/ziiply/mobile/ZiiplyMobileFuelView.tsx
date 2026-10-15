"use client";

import FuelStationBackdrop from "./FuelStationBackdrop";

import { useEffect, useMemo, useState } from "react";
import ZiiplyMobileStoreModeSelector from "./ZiiplyMobileStoreModeSelector";

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
  n == null
    ? "–"
    : n.toLocaleString("fi-FI", {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      });
export default function ZiiplyMobileFuelView({
  coords,
}: {
  coords: { lat: number; lon: number } | null;
  onBack: () => void;
}) {
  const [stations, setStations] = useState<Station[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [stationSide, setStationSide] = useState<"traffic" | "both" | "cold">("both");
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
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
    () => stations
      .filter((s) => stationSide === "both"
        ? [s.diesel, s.price95, s.price98].some((value) => value != null && Number.isFinite(Number(value)) && Number(value) > 0)
        : s.isTrafficStation === (stationSide === "traffic"))
      .sort((a, b) => a.distanceKm - b.distanceKm),
    [stations, stationSide],
  );
  function toggleGroup(key: string) {
    setSelectedGroups((previous) => previous.includes(key)
      ? previous.filter((item) => item !== key)
      : [...previous, key]);
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
                    <span className="flex h-full w-full items-center justify-center gap-px" aria-label="Gulf / Ritoil">
                      <img src="https://commons.wikimedia.org/wiki/Special:FilePath/Gulf_Oil_logo.svg" alt="Gulf" className="h-full w-1/2 object-contain" />
                      <img src="https://commons.wikimedia.org/wiki/Special:FilePath/RITOIL_Logo.svg" alt="Ritoil" className="h-full w-1/2 object-contain" />
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
                  {station?.name ?? (loading ? "Haetaan…" : "Ei asemaa")}
                  </span>
                </span>
                <span className="col-start-1 row-start-2 block text-[11px] font-black leading-[14px] text-black">
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
      {loading && (
        <p role="status" className="mt-2 text-center text-xs">
          Haetaan asemia…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
