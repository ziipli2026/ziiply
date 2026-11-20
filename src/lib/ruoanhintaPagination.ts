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
  // Upstream results are not consistently ordered between requests. A second
  // bounded pass reduces page-boundary omissions without relying on product names.
  // Keep the first pass intact if the provider fails or times out.
  if (firstPage.length === pageSize && maxPages > 1) {
    for (let page = 0; page < maxPages; page++) {
      const controller = new AbortController();
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const next = await Promise.race([
          fetchPage(page * pageSize, controller.signal),
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => { controller.abort(); reject(new Error('Provider verification timeout')); }, extraPageTimeoutMs);
          }),
        ]);
        if (!Array.isArray(next)) break;
        for (const item of next) {
          const key = String(item.id ?? '');
          if (key && seen.has(key)) continue;
          if (key) seen.add(key);
          result.push(item);
        }
        if (next.length < pageSize) break;
      } catch { break; }
      finally { if (timer) clearTimeout(timer); }
    }
  }
  return result;
}
