// Bounded provider pagination shared by normal grocery searches.
// The first page is fetched by the caller; extra pages are requested only if full.
export async function appendRuoanhintaPages<T extends { id?: string | number }>(
  firstPage: T[], pageSize: number, fetchPage: (skip: number, signal: AbortSignal) => Promise<T[]>,
  maxPages = 3,
  extraPageTimeoutMs = 1200,
  onPage?: (event: { page: number; status: 'ok' | 'empty' | 'duplicate' | 'timeout' | 'error'; count: number }) => void,
): Promise<T[]> {
  const seen = new Set(firstPage.map(item => String(item.id ?? "")).filter(Boolean));
  const result = [...firstPage];
  let previous = firstPage;
  for (let page = 1; page < maxPages && previous.length === pageSize; page++) {
    let next: T[];
    const controller = new AbortController();
    try {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        next = await Promise.race([
          fetchPage(page * pageSize, controller.signal),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
              controller.abort();
              reject(new Error('Provider pagination timeout'));
            }, extraPageTimeoutMs);
          }),
        ]);
      } finally { if (timer) clearTimeout(timer); }
    }
    catch (error) {
      onPage?.({page, status: error instanceof Error && error.message === 'Provider pagination timeout' ? 'timeout' : 'error', count: 0});
      break;
    } // Retain successful pages if the provider is temporarily unavailable.
    if (!Array.isArray(next) || next.length === 0) { onPage?.({page, status:'empty', count:0}); break; }
    let newCount = 0;
    for (const item of next) {
      const key = String(item.id ?? "");
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      result.push(item);
      newCount++;
    }
    onPage?.({page, status:newCount ? 'ok' : 'duplicate', count:newCount});
    if (!newCount) break;
    previous = next;
  }
  // Do not retry unstable offset pages in the user's interactive request.
  // Extra sweeps increase latency but cannot establish a consistent provider
  // snapshot; correctness requires stable upstream ordering or shared snapshots.
  return result;
}
