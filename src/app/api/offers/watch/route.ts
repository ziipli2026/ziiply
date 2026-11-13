// Desktop preview uses the same offer feed, matching and deduplication as mobile.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL("/api/offers/watch", "https://ziiply.vercel.app");
  url.search = new URL(request.url).search;
  return fetch(url, { cache: "no-store", signal: request.signal });
}
