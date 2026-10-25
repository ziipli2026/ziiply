"use client";
import { useEffect, useState } from "react";

type RecipeResult = { title: string; url: string; source: string };
const sources = [
  { name: "K-Ruoka", domain: "k-ruoka.fi" },
  { name: "Valio", domain: "valio.fi" },
  { name: "Kotiliesi", domain: "kotiliesi.fi" },
  { name: "Martat", domain: "martat.fi" },
];
export default function RecipesPage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [source, setSource] = useState("kaikki");
  const search = (value: string) => setSubmitted(value.trim());
  useEffect(() => {
    if (!query.trim()) { setSubmitted(""); return; }
    const timer = window.setTimeout(() => search(query), 450);
    return () => window.clearTimeout(timer);
  }, [query]);
  const results: RecipeResult[] = submitted ? sources.filter(item => source === "kaikki" || source === item.domain).map(item => ({
    title: submitted + " – " + item.name,
    source: item.name,
    url: "https://www.google.com/search?" + new URLSearchParams({q: "site:" + item.domain + "/reseptit " + submitted}).toString(),
  })) : [];
  return <main className="min-h-screen bg-[#f8f0d9] px-3 py-8 text-[#17573c]">
    <section className="mx-auto w-full max-w-[760px] rounded-[24px] border-[3px] border-[#17573c] bg-[#fff4cf] p-4 shadow-xl sm:p-7">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div><a href="/" className="text-sm font-bold underline">Ziiply.fi</a><h1 className="mt-2 text-3xl font-black">Justiinan reseptit</h1><p className="mt-2 text-sm">Etsi reseptejä verkosta ruokalajin tai raaka-aineen nimellä.</p></div>
        <a href="/" aria-label="Sulje" className="rounded-full border-2 border-[#17573c] px-3 py-1 text-2xl">×</a>
      </header>
      <form onSubmit={event => {event.preventDefault();search(query)}} className="flex flex-col gap-3">
        <label htmlFor="recipe-search" className="font-bold">Hae reseptejä verkosta</label>
        <input id="recipe-search" autoFocus type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Esim. lohikeitto, kanapasta, perunamuusi..." className="w-full rounded-xl border-2 border-[#17573c] bg-white px-4 py-4 text-lg outline-offset-2"/>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Reseptilähde" value={source} onChange={event=>setSource(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-[#17573c] bg-white p-3"><option value="kaikki">Kaikki lähteet</option>{sources.map(item=><option key={item.domain} value={item.domain}>{item.name}</option>)}</select>
          <button type="submit" className="rounded-xl bg-[#17573c] px-6 py-3 font-bold text-white">Hae</button>
        </div>
      </form>
      <div className="mt-5" aria-live="polite">
        {!submitted ? <p className="rounded-xl bg-white/70 p-4">Kirjoita hakusana. Verkkohakujen linkit ilmestyvät automaattisesti.</p> : <>
          <h2 className="mb-3 text-lg font-black">Hae verkosta: {submitted}</h2>
          <p className="mb-3 text-sm">Avaa haluamasi lähteen verkkohaku nähdäksesi ajantasaiset reseptit. Ziiply ei vielä nouda yksittäisiä reseptituloksia tähän näkymään.</p>
          <div className="grid gap-3 sm:grid-cols-2">{results.map(item=><a key={item.source} href={item.url} target="_blank" rel="noopener noreferrer" className="rounded-xl border-2 border-[#17573c] bg-white p-4 font-bold hover:bg-[#e3edc9]">{item.title} ↗<span className="mt-1 block text-xs font-normal">Avaa {item.source} -reseptihaku</span></a>)}</div>
        </>}
      </div>
      <div className="mt-6 border-t border-[#b99d62] pt-4"><a href="/reseptit" className="inline-block rounded-xl border-2 border-[#17573c] bg-[#e3edc9] px-5 py-3 font-black">Näytä reseptit</a></div>
    </section>
  </main>;
}
