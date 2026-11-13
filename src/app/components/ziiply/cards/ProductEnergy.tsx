"use client";
import { useEffect, useState } from "react";

type Energy = { kcal: number | null; kj: number | null; estimated: boolean };
const cache = new Map<string, Promise<Energy | null>>();
function numeric(value: unknown): number | null {
  const raw = value && typeof value === "object" && "value" in value ? (value as {value: unknown}).value : value;
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() ? Number(raw.replace(",", ".")) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function parseEnergy(data: unknown): Energy | null {
  if (!data || typeof data !== "object") return null;
  const n = data as Record<string, unknown>;
  const values = n.nutrients && typeof n.nutrients === "object" ? n.nutrients as Record<string, unknown> : n;
  const kcal = numeric(values.kcal_100g ?? values["energy-kcal_100g"] ?? values.ENERC);
  const kj = numeric(values.kj_100g ?? values["energy-kj_100g"] ?? values.ENERC_KJ);
  if (kcal === null && kj === null) return null;
  if ((kcal !== null && kcal > 1000) || (kj !== null && kj > 4184)) return null;
  return { kcal: kcal ?? (kj === null ? null : kj / 4.184), kj: kj ?? (kcal === null ? null : kcal * 4.184), estimated: n.estimated === true || n.source === "fineli-generic" };
}
function load(ean: string): Promise<Energy | null> {
  let existing = cache.get(ean);
  if (!existing) {
    existing = fetch("/api/ean-bank?ean=" + encodeURIComponent(ean))
      .then(r => r.ok ? r.json() : null)
      .then(data => parseEnergy(data?.product?.nutrition))
      .catch(() => null);
    cache.set(ean, existing);
  }
  return existing;
}
/** Shared EAN-based nutrition display; absent/unknown data never blocks product cards. */
export default function ProductEnergy({ ean }: { ean?: string | number | null }) {
  const code = String(ean ?? "").replace(/\D/g, "");
  const valid = /^\d{8,14}$/.test(code) ? code : "";
  const [state, setState] = useState<{ean:string;energy:Energy|null}>({ean:"",energy:null});
  useEffect(() => {
    if (!valid) return;
    let active = true;
    load(valid).then(energy => { if (active) setState({ean:valid,energy}); });
    return () => { active = false; };
  }, [valid]);
  const energy = state.ean === valid ? state.energy : null;
  if (!energy) return null;
  const format = (n:number|null) => n === null ? "—" : Math.round(n).toLocaleString("fi-FI");
  return <div className="mt-1 text-[0.68rem] font-semibold leading-tight text-[#496443]" title={energy.estimated ? "Fineli-arvio, ei tuotteen vahvistettu ravintoarvo" : "EAN-kohtainen ravintoarvo"}>
    {energy.estimated ? "Energia-arvio" : "Energia"}: {format(energy.kcal)} kcal / {format(energy.kj)} kJ / 100 g
  </div>;
}
