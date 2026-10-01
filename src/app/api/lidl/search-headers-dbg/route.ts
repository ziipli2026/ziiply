import { NextRequest, NextResponse } from "next/server";
const VERSION = "LIDL-SEARCH-v6b-20261001";
type Probe = { id: string; headers: Record<string, string> };
export async function GET(req: NextRequest) {
 const q = (req.nextUrl.searchParams.get("q") || "maito").slice(0, 50);
 const cases: Probe[] = [
  { id: "accept-any", headers: { accept: "*/*" } },
  { id: "browser", headers: { accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "accept-language": "fi-FI,fi;q=0.9" } },
  { id: "json-no-language", headers: { accept: "application/json" } },
  { id: "no-explicit-accept", headers: {} },
 ];
 const results = await Promise.all(cases.map(async (probe) => {
  const url = new URL("https://www.lidl.fi/q/api/search");
  url.searchParams.set("q", q);
  try {
   const response = await fetch(url, { headers: probe.headers, cache: "no-store", signal: AbortSignal.timeout(10000) });
   const body = await response.text();
   let parsed: unknown = null;
   try { parsed = JSON.parse(body); } catch { /* Non-JSON response */ }
   const keys = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? Object.keys(parsed).slice(0, 20) : [];
   return { case: probe.id, status: response.status, contentType: response.headers.get("content-type"), length: body.length, keys, sample: body.slice(0, 700) };
  } catch (error) { return { case: probe.id, error: String(error) }; }
 }));
 return NextResponse.json({ debugVersion: VERSION, readOnly: true, q, results, note: "Public Lidl search header comparison only; no authentication bypass or data writes." });
}
