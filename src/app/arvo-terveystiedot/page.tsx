"use client";

import { useRef, useState } from "react";

type Day = {
  localDate: string;
  steps?: number;
  activeEnergyKcal?: number;
  stepsGoal?: number;
  activeEnergyKcalGoal?: number;
};
const metrics = [
  { key: "steps", goal: "stepsGoal", label: "Askeleet", unit: "askelta" },
  { key: "activeEnergyKcal", goal: "activeEnergyKcalGoal", label: "Aktiivisuusenergia", unit: "kcal" },
] as const;
const shortDate = new Intl.DateTimeFormat("fi-FI", {
  day: "numeric", month: "numeric", timeZone: "UTC",
});
const displayDate = (date: string) => shortDate.format(new Date(date));
const format = new Intl.NumberFormat("fi-FI", { maximumFractionDigits: 1 });

function parseDays(input: unknown): Day[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > 30) throw new Error();
  const seen = new Set<string>();
  return input.map((row): Day => {
    if (!row || typeof row !== "object") throw new Error();
    const { localDate, steps, activeEnergyKcal, stepsGoal, activeEnergyKcalGoal } = row;
    if (typeof localDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(localDate) ||
        new Date(localDate).toISOString().slice(0, 10) !== localDate || seen.has(localDate)) throw new Error();
    if (steps === undefined && activeEnergyKcal === undefined) throw new Error();
    if (steps !== undefined && (!Number.isSafeInteger(steps) || steps < 0)) throw new Error();
    if (activeEnergyKcal !== undefined &&
        (!Number.isFinite(activeEnergyKcal) || activeEnergyKcal < 0)) throw new Error();
    if (stepsGoal !== undefined && (!Number.isSafeInteger(stepsGoal) || stepsGoal <= 0)) throw new Error();
    if (activeEnergyKcalGoal !== undefined &&
        (!Number.isFinite(activeEnergyKcalGoal) || activeEnergyKcalGoal <= 0)) throw new Error();
    seen.add(localDate);
    return { localDate, steps, activeEnergyKcal, stepsGoal, activeEnergyKcalGoal };
  }).sort((a, b) => a.localDate.localeCompare(b.localDate));
}

type Metric = typeof metrics[number];
type ChartDay = { date: string; actual?: number; estimate?: number; goal?: number; partial: boolean };

function estimateFor(days: Day[], date: string, key: Metric["key"]) {
  const dayMs = 86_400_000;
  const dateMs = Date.parse(date);
  const history = days.flatMap(day => {
    const age = (dateMs - Date.parse(day.localDate)) / dayMs;
    const value = day[key];
    return age > 0 && age <= 28 && value !== undefined ? [{ age, value }] : [];
  });
  const weekdays = history.filter(day => day.age % 7 === 0);
  const recent = history.filter(day => day.age <= 14);
  const source = weekdays.length === 4 ? weekdays : recent.length >= 7 ? recent : [];
  const values = source.map(day => day.value).sort((a, b) => a - b);
  if (!values.length) return undefined;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
}

function ActivityChart({ points, metric }: { points: ChartDay[]; metric: Metric }) {
  const peak = Math.max(1, ...points.flatMap(point => [point.actual ?? 0, point.estimate ?? 0, point.goal ?? 0]));
  const magnitude = 10 ** Math.floor(Math.log10(peak));
  const max = Math.ceil(peak / magnitude) * magnitude;
  const last = points.at(-1)!;
  if (points.length === 1) {
    return <>
      <p>Toteuma <strong>{last.actual === undefined ? "Ei mittausta" : `${format.format(last.actual)} ${metric.unit}`}</strong>
        {last.partial && last.actual !== undefined && " · päivä voi olla kesken"}</p>
      {last.estimate !== undefined && <p>Arvon arvio {format.format(last.estimate)} {metric.unit}</p>}
      {last.goal !== undefined && <p>Tavoite {format.format(last.goal)} {metric.unit}
        {last.actual !== undefined && ` · ${format.format(Math.round(last.actual / last.goal * 100))} %`}
        {last.actual !== undefined && (last.actual >= last.goal ? " · tavoite saavutettu" :
          ` · ${last.partial ? "jäljellä" : "tavoitteesta jäi"} ${format.format(last.goal - last.actual)} ${metric.unit}`)}</p>}
      {last.actual !== undefined && <div aria-hidden="true" className="relative h-3 rounded bg-[#e4eee6]">
        <div className="h-full rounded bg-[#316848]" style={{ width: `${last.actual / max * 100}%` }} />
        {last.estimate !== undefined && <div className="absolute inset-y-0 border-l-2 border-[#28528a]" style={{ left: `${last.estimate / max * 100}%` }} />}
        {last.goal !== undefined && <div className="absolute inset-y-0 border-l-2 border-dashed border-[#8a541c]" style={{ left: `${last.goal / max * 100}%` }} />}
      </div>}
    </>;
  }

  const width = 480;
  const height = 150;
  const axis = 52;
  const step = (width - axis) / points.length;
  const y = (value: number) => height - value / max * (height - 8);
  const series = [
    { key: "estimate", label: "Arvon arvio", color: "#28528a", dash: undefined },
    { key: "goal", label: "Tavoite", color: "#8a541c", dash: "4 3" },
  ] as const;
  return <>
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <span><span aria-hidden="true" className="text-[#316848]">■ </span>Toteuma</span>
      {last.actual !== undefined && <span><span aria-hidden="true" className="text-[#316848]">□ </span>Viimeisin päivä voi olla kesken</span>}
      {series.filter(({ key }) => points.some(point => point[key] !== undefined)).map(({ key, label, color, dash }) =>
        <span key={key}><span aria-hidden="true" style={{ color }}>{dash ? "┄ " : "━ "}</span>{label}</span>)}
    </div>
    <svg aria-hidden="true" viewBox={`0 0 ${width} ${height}`} className="w-full rounded bg-[#f5f8f5]">
      {[0, max / 2, max].map(value => <g key={value}>
        <line x1={axis} x2={width} y1={y(value)} y2={y(value)} stroke="#d2ded4" />
        <text x={axis - 5} y={Math.max(12, Math.min(height - 3, y(value) + 4))}
          textAnchor="end" fontSize="12" fill="#173b2b">{format.format(value)}</text>
      </g>)}
      {points.map(({ date, actual, partial }, index) => actual !== undefined &&
        <rect key={date} x={axis + (index + 0.2) * step} y={Math.min(y(actual), height - 1)} width={step * 0.6}
          height={Math.max(1, height - y(actual))} fill={partial ? "#c7dbcc" : "#316848"} />)}
      {series.map(({ key, color, dash }) => points.map((point, index) => {
        const value = point[key];
        if (value === undefined) return null;
        const x = axis + (index + 0.5) * step;
        const previous = points[index - 1]?.[key];
        return <g key={`${key}-${point.date}`}>
          {previous !== undefined && <line x1={x - step} y1={y(previous)} x2={x} y2={y(value)}
            stroke={color} strokeWidth="2" strokeDasharray={dash} />}
          <circle cx={x} cy={y(value)} r="2.5" fill={color} />
        </g>;
      }))}
    </svg>
    <div aria-hidden="true" className="flex justify-between text-sm">
      <span>{displayDate(points[0].date)}</span><span>{displayDate(last.date)}</span>
    </div>
    <details className="text-sm">
      <summary>Päiväkohtaiset luvut ({metric.unit})</summary>
      <table className="mt-2 w-full text-right">
        <thead><tr><th scope="col" className="text-left">Päivä</th><th scope="col">Toteuma</th>
          <th scope="col">Arvio</th><th scope="col">Tavoite</th></tr></thead>
        <tbody>{points.map(point => <tr key={point.date}>
          <th scope="row" className="text-left font-normal">{displayDate(point.date)}{point.partial && " (voi olla kesken)"}</th>
          {[point.actual, point.estimate, point.goal].map((value, index) =>
            <td key={index}>{value === undefined ? "–" : format.format(value)}</td>)}
        </tr>)}</tbody>
      </table>
    </details>
  </>;
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
  const summaries = metrics.map(metric => {
    const samples = visible.flatMap(day => {
      const value = day[metric.key];
      return value === undefined ? [] : [{ date: day.localDate, value }];
    });
    const total = samples.reduce((sum, sample) => sum + sample.value, 0);
    const peak = samples.reduce<(typeof samples)[number] | undefined>(
      (highest, sample) => !highest || sample.value > highest.value ? sample : highest,
      undefined,
    );
    return { ...metric, samples, total, peak };
  });

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
          <code className="break-all">{'[{"localDate":"2026-11-07","steps":3063,"activeEnergyKcal":210,"stepsGoal":7000,"activeEnergyKcalGoal":400}]'}</code>
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
        <section className="space-y-2 rounded-xl border border-[#d3c9ad] bg-white p-4">
          <h2 className="text-xl font-bold">Jakson yhteenveto</h2>
          {summaries.map(({ key, label, unit, samples, total, peak }) => (
            <p key={key}>
              <strong>{label}</strong>{" · "}
              {samples.length === 0 ? "Jaksolta ei ole mittauksia." : <>
                {format.format(total)} {unit}
                {period > 1 && <>
                  {" yhteensä, keskimäärin "}
                  <strong>{format.format(Math.round(total / samples.length))} {unit} päivässä</strong>
                  {samples.length < period && ` (${samples.length} mittauspäivää)`}
                  {key === "steps" && samples.length > 1 && peak &&
                    `. Eniten askelia kertyi ${displayDate(peak.date)} (${format.format(peak.value)} askelta)`}
                </>}.
              </>}
            </p>
          ))}
          <p className="text-sm">Kooste kattaa tiedot vientihetkeen asti. Viimeisin päivä voi olla kesken.</p>
        </section>
        {summaries.map(metric => {
          const points = Array.from({ length: period }, (_, index): ChartDay => {
            const day = new Date(start);
            day.setUTCDate(day.getUTCDate() + index);
            const date = day.toISOString().slice(0, 10);
            const entry = days.find(sample => sample.localDate === date);
            return { date, actual: entry?.[metric.key], goal: entry?.[metric.goal],
              estimate: estimateFor(days, date, metric.key), partial: date === lastDate };
          }).filter(point => point.date >= days[0].localDate);
          return <section key={metric.key} className="space-y-3 rounded-xl border border-[#d3c9ad] bg-white p-4">
            <h2 className="text-xl font-bold">{metric.label}</h2>
            <ActivityChart points={points} metric={metric} />
            <label className="block text-sm">
              Viimeisimmän päivän tavoite ({metric.unit})
              <input key={lastDate} type="number" min={metric.key === "steps" ? 1 : 0}
                step={metric.key === "steps" ? 1 : "any"} inputMode={metric.key === "steps" ? "numeric" : "decimal"}
                className="ml-2 w-28 rounded border border-[#d3c9ad] p-1"
                value={days.at(-1)?.[metric.goal] ?? ""}
                onChange={event => {
                  const input = event.currentTarget;
                  if (input.validity.badInput || (input.value && !input.validity.valid)) return;
                  const goal = input.value ? input.valueAsNumber : undefined;
                  if (goal !== undefined && (goal <= 0 || (metric.key === "steps" && !Number.isSafeInteger(goal)))) return;
                  setDays(current => current.map(day => day.localDate === lastDate ? { ...day, [metric.goal]: goal } : day));
                }} />
            </label>
          </section>;
        })}
        <p className="text-sm">Arvon arvio perustuu neljän edeltävän saman viikonpäivän mediaaniin.
          Jos niitä on vähemmän, arvio lasketaan edeltävien 14 päivän mediaanista, kun mittauspäiviä on vähintään seitsemän.
          Sivulla syötetty tavoite säilyy tässä välilehdessä päiväkoosteen mukana.</p>
      </>}
      <p className="text-sm">iPhonessa näet Apple Terveys -tietosi Ziiply Arvo -testisovelluksen Terveys-välilehdellä. Valitse siellä, mitkä tiedot Arvo saa lukea.</p>
    </div>
  </main>;
}
