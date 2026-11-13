// Desktop preview uses the same offer feed, matching and deduplication as mobile.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const responseHeaders = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const url = new URL("/api/offers/watch", "https://ziiply.vercel.app");
  url.search = new URL(request.url).search;

  try {
    const upstream = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(55000)]),
    });
    // fetch decodes the upstream body. Let Next.js generate fresh transport headers.
    return Response.json(await upstream.json(), { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    console.error("[desktop offer watch] Upstream request failed", error);
    return Response.json(
      { ok: false, error: "Tarjousvahdin tietoja ei saatu haettua.", results: [] },
      { status: 502, headers: responseHeaders },
    );
  }
}
