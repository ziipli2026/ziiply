"use client";
import React, { useEffect, useState } from "react";

export const RECIPE_DEBUG_KEY = "ziiply-mobile-recipe-search-debug-v1";
export type RecipeDebugEntry = { at: string; stage: string; detail: unknown };
export function appendRecipeDebug(stage: string, detail: unknown) {
  if (typeof window === "undefined") return;
  try {
    const previous: RecipeDebugEntry[] = JSON.parse(sessionStorage.getItem(RECIPE_DEBUG_KEY) || "[]");
    const next = [...(Array.isArray(previous) ? previous : []), { at: new Date().toISOString(), stage, detail }].slice(-150);
    sessionStorage.setItem(RECIPE_DEBUG_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("ziiply-recipe-debug-updated"));
  } catch {}
}
export default function ZiiplyRecipeSearchDebug() {
  const [entries, setEntries] = useState<RecipeDebugEntry[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const refresh = () => {
      try {
        const data = JSON.parse(sessionStorage.getItem(RECIPE_DEBUG_KEY) || "[]");
        setEntries(Array.isArray(data) ? data : []);
      } catch { setEntries([]); }
    };
    refresh();
    window.addEventListener("ziiply-recipe-debug-updated", refresh);
    return () => window.removeEventListener("ziiply-recipe-debug-updated", refresh);
  }, []);
  if (!entries.length) return null;
  const report = JSON.stringify({ kind: "Ziiply mobile recipe search debug", generatedAt: new Date().toISOString(), entries }, null, 2);
  return <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.4rem)] right-2 z-[210] sm:hidden">
    {!open ? <button type="button" onClick={() => setOpen(true)} className="rounded-xl border-2 border-[#bb8a38] bg-[#fff3cb] px-3 py-2 text-xs font-black text-[#493315] shadow-lg">Resepti DEBUG ({entries.length})</button> :
      <section className="flex max-h-[65dvh] w-[min(95vw,420px)] flex-col rounded-xl border-2 border-[#9c793e] bg-[#fff7df] p-3 text-[#243e2b] shadow-2xl" role="dialog" aria-label="Reseptihaun debug">
        <div className="mb-2 flex items-center justify-between gap-2"><strong>Reseptihaun DEBUG</strong><button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-3 py-1">Sulje</button></div>
        <p className="mb-2 text-xs">Reseptin purku, hakusanat ja jokaisen haun vaiheet. Kopioi raportti tänne.</p>
        <div className="mb-2 flex gap-2">
          <button type="button" className="flex-1 rounded-lg bg-[#285039] px-3 py-2 text-xs font-bold text-white" onClick={() => { void navigator.clipboard?.writeText(report).catch(() => undefined); }}>Kopioi DEBUG</button>
          <button type="button" className="rounded-lg border px-3 py-2 text-xs" onClick={() => { sessionStorage.removeItem(RECIPE_DEBUG_KEY); setEntries([]); setOpen(false); }}>Tyhjennä</button>
        </div>
        <textarea readOnly aria-label="Kopioitava debugraportti" value={report} className="min-h-0 flex-1 resize-none rounded-lg border bg-white p-2 font-mono text-[10px]" rows={16} onFocus={event => event.currentTarget.select()} />
      </section>}
  </div>;
}
