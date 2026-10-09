export class AccountBodyError extends Error {
  readonly status: 400 | 413;
  constructor(status: 400 | 413) { super("Invalid account request body"); this.status = status; }
}
export async function readAccountJson(request: Request): Promise<unknown> {
  if (!request.body) throw new AccountBodyError(400);
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 256_000) { await reader.cancel(); throw new AccountBodyError(413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new AccountBodyError(400); }
}
