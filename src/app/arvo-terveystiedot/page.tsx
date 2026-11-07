"use client";

import { useRef, useState } from "react";

type Day = { localDate: string; steps?: number; activeEnergyKcal?: number };
const metrics = [
  { key: "steps", label: "Askeleet", unit: "askelta" },
  { key: "activeEnergyKcal", label: "Aktiivisuusenergia", unit: "kcal" },
] as const;
const format = new Intl.NumberFormat("fi-FI", { maximumFractionDigits: 1 });

function parseDays(input: unknown): Day[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > 30) throw new Error();
  const seen = new Set<string>();
  return input.map((row): Day => {
    if (!row || typeof row !== "object") throw new Error();
    const { localDate, steps, activeEnergyKcal } = row;
    if (typeof localDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(localDate) ||
        new Date(localDate).toISOString().slice(0, 10) !== localDate || seen.has(localDate)) throw new Error();
    if (steps === undefined && activeEnergyKcal === undefined) throw new Error();
    if (steps !== undefined && (!Number.isSafeInteger(steps) || steps < 0)) throw new Error();
    if (activeEnergyKcal !== undefined &&
        (!Number.isFinite(activeEnergyKcal) || activeEnergyKcal < 0)) throw new Error();
    seen.add(localDate);
    return { localDate, steps, activeEnergyKcal };
  }).sort((a, b) => a.localDate.localeCompare(b.localDate));
}

export default function ArvoHealthPage() {
  const [days, setDays] = useState<Day[]>([]);
  const [period, setPeriod] = useState(7);
  const [error, setError] = useState("");
  const load = useRef(0);
  const lastDate = days.at(-1)?.localDate;
  const cutoff = lastDate ? new Date(lastDate) : null;
  cutoff?.setUTCDate(cutoff.getUTCDate() - period + 1);
  const start = cutoff?.toISOString().slice(0, 10) ?? "";
  const visible = days.filter(day => day.localDate >= start);

  async function importDays(file: File) {
    const request = ++load.current;
    setError("");
    try {
      if (file.size > 64_000) throw new Error();
      const imported = parseDays(JSON.parse(await file.text()));
      if (request === load.current) setDays(imported);
    } catch {
      if (request === load.current) setError("Tiedoston lukeminen epäonnistui. Valitse JSON-tiedosto, jossa on 1–30 päiväkoostetta.");
    }
  }

  return <main className="min-h-screen bg-[#f8f5ed] px-4 py-8 text-[#173b2b]">
    <div className="mx-auto max-w-2xl space-y-5">
      <a href="/arvo-tilastot" className="underline">← Arvon tilastot</a>
      <h1 className="text-3xl font-black">Terveys ja aktiivisuus</h1>
      <p>Katso askelten ja aktiivisuusenergian päiväkoosteet. Automaattinen tuonti iPhone-sovelluksesta odottaa yhteyden kytkemistä.</p>
      <section className="space-y-3 rounded-xl border border-[#d3c9ad] bg-white p-4">
        <label htmlFor="health-summary" className="block font-bold">Avaa päiväkooste selaimessa</label>
        <input id="health-summary" type="file" accept=".json,application/json" className="max-w-full"
          onChange={event => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = "";
            if (file) void importDays(file);
          }} />
        <p className="text-sm">Tiedot käsitellään tässä välilehdessä ja tyhjentyvät, kun poistut sivulta.</p>
        <details className="text-sm">
          <summary>Tiedoston muoto</summary>
          <code className="break-all">{'[{"localDate":"2026-11-07","steps":3063,"activeEnergyKcal":210}]'}</code>
        </details>
        {error && <p role="alert" className="text-red-800">{error}</p>}
      </section>
      {days.length > 0 && <>
        <div className="flex flex-wrap items-center gap-2">
          {[1, 7, 30].map(value => <button key={value} type="button" aria-pressed={period === value}
            className={`rounded-lg border border-[#173b2b] px-3 py-2 ${period === value ? "bg-[#173b2b] text-white" : "bg-white"}`}
            onClick={() => setPeriod(value)}>{value === 1 ? "1 päivä" : `${value} päivää`}</button>)}
          <button type="button" className="ml-auto underline" onClick={() => {
            ++load.current;
            setDays([]);
            setError("");
          }}>Tyhjennä tiedot</button>
        </div>
        <p className="text-sm">{start} – {lastDate}</p>
        {metrics.map(metric => {
          const samples = visible.flatMap(day => {
            const value = day[metric.key];
            return value === undefined ? [] : [{ date: day.localDate, value }];
          });
          const max = Math.max(1, ...samples.map(sample => sample.value));
          return <section key={metric.key} className="space-y-3 rounded-xl border border-[#d3c9ad] bg-white p-4">
            <h2 className="text-xl font-bold">{metric.label}</h2>
            {samples.length === 0 ? <p>Jaksolta ei ole mittauksia.</p> : <>
              <p>Yhteensä <strong>{format.format(samples.reduce((total, sample) => total + sample.value, 0))} {metric.unit}</strong></p>
              <ul className="space-y-2">
                {samples.map(sample => <li key={sample.date} className="grid grid-cols-[6rem_1fr_auto] items-center gap-2 text-sm">
                  <time dateTime={sample.date}>{sample.date}</time>
                  <div aria-hidden="true" className="h-3 rounded bg-[#e4eee6]">
                    <div className="h-full rounded bg-[#316848]" style={{ width: `${sample.value / max * 100}%` }} />
                  </div>
                  <span>{format.format(sample.value)}</span>
                </li>)}
              </ul>
            </>}
          </section>;
        })}
      </>}
      <p className="text-sm">iPhonessa näet Apple Terveys -tietosi Ziiply Arvo -testisovelluksen Terveys-välilehdellä. Valitse siellä, mitkä tiedot Arvo saa lukea.</p>
    </div>
  </main>;
}
