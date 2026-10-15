// Same-origin delivery for the ZXing-C++ GS1 reader binary.
// Keep this version in sync with the IIFE reader loaded by the mobile scanner.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SOURCES = [
  "https://unpkg.com/zxing-wasm@3.1.5/dist/reader/zxing_reader.wasm",
  "https://cdn.jsdelivr.net/npm/zxing-wasm@3.1.5/dist/reader/zxing_reader.wasm",
  "https://fastly.jsdelivr.net/npm/zxing-wasm@3.1.5/dist/reader/zxing_reader.wasm",
];

export async function GET() {
  for (const url of SOURCES) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(12000), cache: "no-store" });
      if (!response.ok) continue;
      const bytes = await response.arrayBuffer();
      if (bytes.byteLength < 100_000) continue;
      // A WebAssembly module starts with the bytes 00 61 73 6d.
      const magic = new Uint8Array(bytes, 0, 4);
      if (magic[0] !== 0 || magic[1] !== 97 || magic[2] !== 115 || magic[3] !== 109) continue;
      return new Response(bytes, {
        headers: {
          "Content-Type": "application/wasm",
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      // Try the next upstream when one CDN is unreachable.
    }
  }
  return Response.json({ error: "GS1 reader binary unavailable" }, { status: 503 });
}
