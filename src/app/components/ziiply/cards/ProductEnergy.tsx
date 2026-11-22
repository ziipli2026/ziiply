"use client";
import { useEffect, useRef, useState } from "react";

type Energy = { kcal: number | null; kj: number | null; estimated: boolean; basis: "g" | "ml" };
const cache = new Map<string, Promise<Energy | null>>();
function numeric(value: unknown): number | null {
  const raw = value && typeof value === "object" && "value" in value ? (value as {value: unknown}).value : value;
  const n = typeof raw === "number" ? raw : typeof raw === "string" && raw.trim() ? Number(raw.replace(",", ".")) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}
function parseEnergy(data: unknown): Energy | null {
  if (!data || typeof data !== "object") return null;
  const n = data as Record<string, unknown>;
  const values = n.nutrients && typeof n.nutrients === "object" ? n.nutrients as Record<string, unknown> : n.nutriments && typeof n.nutriments === "object" ? n.nutriments as Record<string, unknown> : n;
  const fineliEnergy = values.ENERC;
  const fineliUnit = fineliEnergy && typeof fineliEnergy === "object" && "unit" in fineliEnergy
    ? String(fineliEnergy.unit).trim().toLowerCase()
    : "";
  const kcalInput = numeric(values.kcal_100g ?? values.energy_kcal_100g ?? values.energyKcal100g ?? values["energy-kcal_100g"] ?? values.ENERC_KCAL ?? (fineliUnit === "kcal" ? fineliEnergy : null));
  const kjInput = numeric(values.kj_100g ?? values.energy_kj_100g ?? values.energyKj100g ?? values["energy-kj_100g"] ?? values.ENERC_KJ ?? (fineliUnit === "kj" ? fineliEnergy : null));
  const kcal = kcalInput !== null && kcalInput <= 1000 ? kcalInput : null;
  const kj = kjInput !== null && kjInput <= 4184 ? kjInput : null;
  if (kcal === null && kj === null) return null;
  return {
    kcal: kcal ?? (kj === null ? null : kj / 4.184),
    kj: kj ?? (kcal === null ? null : kcal * 4.184),
    estimated: n.estimated === true || n.source === "fineli-generic" || n.source === "package-variant",
    basis: n.perUnit === "ml" ? "ml" : "g",
  };
}
function load(ean: string): Promise<Energy | null> {
  let existing = cache.get(ean);
  if (!existing) {
    existing = fetch("/api/ean-bank?ean=" + encodeURIComponent(ean))
      .then(response => {
        if (!response.ok) throw new Error("Energy lookup failed");
        return response.json();
      })
      .then(data => parseEnergy(data?.product?.nutrition ?? data?.nutrition))
      .catch(() => {
        cache.delete(ean);
        return null;
      });
    cache.set(ean, existing);
  }
  return existing;
}
/** Shared EAN-based nutrition display; absent/unknown data never blocks product cards. */
export default function ProductEnergy({ ean, nutrition, quantity }: { ean?: string | number | null; nutrition?: unknown; quantity?: string | null }) {
  const code = String(ean ?? "").trim();
  const valid = /^(?:\d{8}|\d{12,14})$/.test(code) ? code : "";
  const suppliedEnergy = parseEnergy(nutrition);
  const needsLookup = Boolean(valid && !suppliedEnergy);
  const anchor = useRef<HTMLSpanElement>(null);
  const [state, setState] = useState<{ean:string;energy:Energy|null}>({ean:"",energy:null});

  useEffect(() => {
    if (!needsLookup) return;
    let active = true;
    const request = () => {
      void load(valid).then(energy => {
        if (active) setState({ ean: valid, energy });
      });
    };
    const target = anchor.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      request();
      return () => { active = false; };
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      request();
    }, { rootMargin: "200px" });
    observer.observe(target);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [valid, needsLookup]);

  const energy = suppliedEnergy ?? (state.ean === valid ? state.energy : null);
  if (!energy) {
    return needsLookup && state.ean !== valid
      ? <span ref={anchor} aria-hidden="true" className="block h-px" />
      : null;
  }
  const format = (n: number | null) => n === null ? "—" : Math.round(n).toLocaleString("fi-FI");
  const amount = String(quantity ?? "").match(/^(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|dl|l)$/i);
  const unit = amount?.[2].toLowerCase();
  // Package totals require a matching basis. Fineli can refer to the edible portion.
  const factors: Record<string, number> = energy.basis === "ml" ? {ml:0.01,cl:0.1,dl:1,l:10} : {kg:10,g:0.01};
  const factor = amount && unit && !energy.estimated ? Number(amount[1].replace(",", ".")) * (factors[unit] ?? 0) : 0;
  return <div className="mt-1 text-[0.68rem] font-semibold leading-tight text-[#496443]">
    {energy.estimated ? "Energia-arvio" : "Energia"}: {format(energy.kcal)} kcal / {format(energy.kj)} kJ / 100 {energy.basis}
    {factor > 0 && factor < 1000 && ` · pakkaus ${format(energy.kcal === null ? null : energy.kcal * factor)} kcal / ${format(energy.kj === null ? null : energy.kj * factor)} kJ`}
  </div>;
}
