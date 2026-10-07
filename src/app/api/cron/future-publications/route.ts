import { NextResponse } from "next/server";
import { recordPublicationRun } from "@/app/components/ziiply/offerSearch/publicationRunLog";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const SOURCES = [
  { chain: "K-SUPERMARKET", source: "future-publication-discovery", url: "https://www.k-ruoka.fi/k-supermarket/tarjouslehti" },
  { chain: "K-MARKET", source: "future-publication-discovery", url: "https://www.k-ruoka.fi/k-market/tarjouslehti" },
  { chain: "TOKMANNI-SPAR", source: "future-publication-discovery", url: "https://www.tokmanni.fi/tarjouslehti" },
] as const;

function fiDate(offsetDays = 0) {
  const now = new Date();
  now.setUTCDate(now.getUTCDate() + offsetDays);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

function dateCandidates(html: string) {
  const text = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/\s+/g, " ");
  const hits = [...text.matchAll(/(?:voimassa\s*)?(\d{1,2})\.(\d{1,2})\.(?:(20\d{2}))?\s*[–-]\s*(\d{1,2})\.(\d{1,2})\.(?:(20\d{2}))?/gi)];
  const year = Number(new Intl.DateTimeFormat("en", { timeZone: "Europe/Helsinki", year: "numeric" }).format(new Date()));
  return hits.map(m => {
    const fromYear = Number(m[3] || year);
    const toYear = Number(m[6] || fromYear);
    const iso = (y:number,mo:string,d:string) => String(y).padStart(4,"0")+"-"+String(mo).padStart(2,"0")+"-"+String(d).padStart(2,"0");
    return { from: iso(fromYear,m[2],m[1]), to: iso(toYear,m[5],m[4]) };
  });
}

async function probe(entry: typeof SOURCES[number]) {
  const checkedAt = new Date().toISOString();
  try {
    const response = await fetch(entry.url, {
      headers: { accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8", "accept-language": "fi-FI,fi;q=0.9,en;q=0.8", "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36", "upgrade-insecure-requests": "1" },
      cache: "no-store", signal: AbortSignal.timeout(20000),
    });
    const html = await response.text();
    const today = fiDate();
    const horizon = fiDate(14);
    const periods = dateCandidates(html);
    const future = periods.filter(p => p.from > today && p.from <= horizon).sort((a,b)=>a.from.localeCompare(b.from));
    const outcome = !response.ok ? "future-discovery-http-error" : future.length ? "future-publication-found" : "future-publication-not-yet-found";
    const ok = response.ok;
    await recordPublicationRun({
      chain: entry.chain, source: entry.source, ok, count: future.length, outcome,
      details: { checkedAt, url: entry.url, http: response.status, today, horizon, future: future.slice(0,10), periods: periods.slice(0,20) },
    }).catch(() => undefined);
    return { chain: entry.chain, ok, http: response.status, outcome, future: future.slice(0,10) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordPublicationRun({ chain: entry.chain, source: entry.source, ok: false, count: 0, outcome: "future-discovery-error", details: { checkedAt, url: entry.url, error: message } }).catch(() => undefined);
    return { chain: entry.chain, ok: false, outcome: "future-discovery-error", error: message };
  }
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: "Cron unavailable" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const results = await Promise.all(SOURCES.map(probe));
  const ok = results.every(r => r.ok);
  return NextResponse.json({ ok, checkedAt: new Date().toISOString(), results }, {
    status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" },
  });
}
