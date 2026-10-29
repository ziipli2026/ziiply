"use client";
import { useEffect, useRef, useState } from 'react';
import { runSimulation, type Snapshot, type Source } from '@/lib/neonSearchSimulation/engine';
import { fixture, scenarios, type Scenario } from '@/lib/neonSearchSimulation/fixtures';
const empty: Snapshot = { rows: [], pricedRows: [], unpricedRows: [], stages: {}, events: [], done: false };
export default function SimulationPage() {
  const [scenario, setScenario] = useState<Scenario>(scenarios[0]);
  const [mode, setMode] = useState('S + K');
  const [query, setQuery] = useState('maito');
  const [liveNeon, setLiveNeon] = useState(true);
  const [realPrices, setRealPrices] = useState(false);
  const [state, setState] = useState<Snapshot>(empty);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<{ scenario: Scenario; mode: string } | null>(null);
  const active = useRef<AbortController | null>(null);
  useEffect(() => { const term = new URLSearchParams(window.location.search).get('q'); if (term?.trim()) setQuery(term.trim()); return () => active.current?.abort(); }, []);
  async function start() {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    setState(empty); setRunning(true); setLastRun({ scenario, mode });
    const neonSource: Source = { id: 'Neon', search: async (term, signal) => {
      const response = await fetch('/api/neon-first-search?q=' + encodeURIComponent(term), { signal, cache: 'no-store' });
      if (!response.ok) throw new Error('Neon HTTP ' + response.status);
      const data = await response.json();
      if (!data.ok || !Array.isArray(data.products)) throw new Error('Invalid Neon response');
      return data.products.map((item: { ean?: string; name?: string; imageUrl?: string | null }) => ({
        ean: item.ean, name: item.name || '', imageUrl: item.imageUrl || null
      }));
    }};
    const source = (id: string, delay: number): Source => ({ id, search: async (_query, signal) => {
      await new Promise<void>((resolve, reject) => {
        const abort = () => { clearTimeout(timer); reject(new Error('Keskeytetty')); };
        const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, delay);
        signal.addEventListener('abort', abort, { once: true });
        if(signal.aborted) abort();
      });
      return fixture(scenario, id);
    }});
    const selected = mode === 'S + K' ? ['S', 'K'] : [mode];
    const lookup = realPrices ? async (product: {ean: string; name: string}, signal: AbortSignal) => {
      const params = new URLSearchParams({ean: product.ean, name: product.name, stores: selected.join(',')});
      const response = await fetch('/api/neon-first-price-lookup?' + params, {signal, cache: 'no-store'});
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data.prices) ? data.prices : [];
    } : undefined;
    await runSimulation(query, liveNeon ? neonSource : source('Neon', 200), selected.map(id => source(id, id === 'S' ? 1800 : 3000)), controller.signal, next => { if(active.current === controller) setState(next); }, undefined, undefined, lookup);
    if(active.current === controller) setRunning(false);
  }
  function save() {
    const blob = new Blob([JSON.stringify({ simulation: true, liveNeon, query, realPrices, ...lastRun, ...state }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'neon-first-simulation.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const button = 'rounded-lg border border-emerald-900 px-4 py-2 font-bold disabled:opacity-40';
  return <main className="min-h-screen bg-[#f6f2e8] p-6 text-[#143c2e]"><div className="mx-auto max-w-5xl space-y-5">
    <p className="font-bold uppercase tracking-widest">Ziiply · erillinen testihaara</p>
    <h1 className="text-3xl font-black">Neon ensin – haun simulaatio</h1>
    <p className="rounded-xl border-2 border-amber-600 bg-amber-100 p-4"><strong>Neon voidaan hakea oikeasta tietokannasta. Kauppojen perushaku ja viiveet ovat testidataa. Valinnainen EAN-varmistettu hintojen lisähaku käyttää oikeaa Ruoanhinta-rajapintaa.</strong> Tämä sivu ei käytä oikeita kauppahakuja eikä tallenna tuotetietoja.</p>
    <div className="flex flex-wrap items-end gap-3"><label className="grid gap-1">Hakusana<input className="rounded border p-2" value={query} onChange={e => setQuery(e.target.value)} /></label><label className="flex gap-2 items-center"><input type="checkbox" checked={liveNeon} onChange={e => setLiveNeon(e.target.checked)} />Oikea Neon (vain luku)</label><label className="flex gap-2 items-center"><input type="checkbox" checked={realPrices} onChange={e => setRealPrices(e.target.checked)} />Oikeat lisähinnat (EAN-tarkistus)</label><label className="grid gap-1">Testitapaus<select className="rounded border p-2" disabled={running} value={scenario} onChange={e => setScenario(e.target.value as Scenario)}>{scenarios.map(item => <option key={item}>{item}</option>)}</select></label><label className="grid gap-1">Taustalla haettavat kaupat<select className="rounded border p-2" disabled={running} value={mode} onChange={e => setMode(e.target.value)}>{['S + K', 'S', 'K'].map(item => <option key={item}>{item}</option>)}</select></label><button className={button} onClick={() => void start()}>{running ? 'Aloita uusi haku' : 'Käynnistä testihaku'}</button><button className={button} disabled={!running} onClick={() => { active.current?.abort(); setRunning(false); }}>Keskeytä</button><button className={button} onClick={save}>Tallenna JSON</button></div>
    <p role="status" className="font-bold">{running ? 'Haku käynnissä' : state.done ? 'Testihaku valmis' : 'Valmis aloittamaan'} · {state.rows.length} tuotetta</p>
    <div className="flex gap-4">{Object.entries(state.stages).map(([key, value]) => <span key={key}>{key}: {value}</span>)}</div>
    <div className="grid gap-3 md:grid-cols-2">{[...state.pricedRows, ...state.unpricedRows].map(row => <article key={row.key} className="rounded-xl border border-emerald-900/30 bg-white p-4"><div className="flex gap-3"><div className="grid h-16 w-16 shrink-0 place-items-center rounded bg-stone-100">{row.imageUrl ? <img src={row.imageUrl} alt="Testikuvan paikkamerkki" className="h-12 w-12 object-contain" /> : <span className="text-xs">Ei kuvaa</span>}</div><div><h2 className="font-bold">{row.name}</h2><p className="text-sm">EAN: {row.ean || 'puuttuu'}</p><p className="text-xs">Lähteet: {row.sources.join(', ')}</p></div></div><div className="mt-3 flex gap-4">{((lastRun?.mode || mode) === 'S + K' ? ['S', 'K'] : [lastRun?.mode || mode]).map(shop => <p key={shop}><strong>{shop}: </strong>{row.prices[shop] != null ? row.prices[shop]!.toFixed(2).replace('.', ',') + ' € (testi / EAN-vahvistettu lisähinta)' : state.stages[shop] === 'loading' || !state.stages[shop] ? 'Haetaan hintaa…' : ['error', 'timeout'].includes(state.stages[shop]) ? 'Hintahaku epäonnistui' : 'Ei vahvistettua hintaa'}</p>)}</div></article>)}</div>
    <details open className="rounded-xl bg-white p-4"><summary className="font-bold">Tapahtumat ja simuloidut ajat</summary><ol className="mt-3 space-y-1 text-sm">{state.events.map((event, i) => <li key={i}>{event.elapsedMs} ms · {event.source} · {event.status}{event.count === undefined ? '' : ` · ${event.count} osumaa`}</li>)}</ol></details>
  </div></main>;
}
