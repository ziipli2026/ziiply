export type ProductSearchEvent = { type: "batch" | "done" | "error"; data: any };
export function streamProductSearch(run: (emit: (data: any) => void) => Promise<Response>): Response {
  let cancelled = false;
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ProductSearchEvent) => { if (!cancelled) controller.enqueue(encoder.encode(JSON.stringify(event) + "\n")); };
      try {
        const response = await run(data => send({ type: "batch", data }));
        const data = await response.json();
        send({ type: response.ok ? "done" : "error", data });
      } catch (error) { send({ type: "error", data: { error: String(error), items: [] } }); }
      finally { if (!cancelled) controller.close(); }
    },
    cancel() { cancelled = true; },
  });
  return new Response(body, { headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}
export async function readProductSearchStream(response: Response, onEvent: (event: ProductSearchEvent) => void) {
  if (!response.ok) throw new Error("HTTP " + response.status);
  if (!response.headers.get("content-type")?.includes("application/x-ndjson")) {
    onEvent({ type: "done", data: await response.json() }); return;
  }
  if (!response.body) throw new Error("Search response body missing");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let terminal = false;
  const line = (value: string) => {
    if (!value.trim()) return;
    const event: ProductSearchEvent = JSON.parse(value);
    if (!["batch", "done", "error"].includes(event.type)) throw new Error("Unknown search event");
    if (event.type !== "batch") terminal = true;
    onEvent(event);
  };
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      pending += decoder.decode(chunk.value, { stream: true });
      let end: number;
      while ((end = pending.indexOf("\n")) >= 0) { line(pending.slice(0, end)); pending = pending.slice(end + 1); }
    }
    pending += decoder.decode();
    line(pending);
    if (!terminal) throw new Error("Search stream ended before completion");
  } finally { reader.releaseLock(); }
}
