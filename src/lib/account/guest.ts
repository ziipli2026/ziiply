export const GUEST_KEY = "ziiply-account-guest-v1";
export type GuestIdentity = { version: 1; id: string; persistent: boolean };
export function getGuestIdentity(storage: Pick<Storage, "getItem" | "setItem">): GuestIdentity {
  try {
    const saved = JSON.parse(storage.getItem(GUEST_KEY) || "null");
    if (saved?.version === 1 && typeof saved.id === "string" && /^[0-9a-f-]{36}$/i.test(saved.id))
      return { version: 1, id: saved.id, persistent: true };
  } catch { /* blocked/corrupt storage remains usable */ }
  const guest: GuestIdentity = { version: 1, id: crypto.randomUUID(), persistent: false };
  try { storage.setItem(GUEST_KEY, JSON.stringify(guest)); guest.persistent = true; } catch {}
  return guest;
}
// Explicit allowlist: no GPS, search/price caches, analytics, credentials or comparison prices.
export const IMPORT_KEYS = ["ziiply-cart-v1", "ziiply-saved-shopping-lists-v1", "ziiply-shopping-checks-v1", "ziiply-desktop-ostelusvihko-v1", "ziiply-desktop-current-cart-v1"] as const;
export type ImportKey = typeof IMPORT_KEYS[number];
export type GuestSnapshot = { version: 1; values: Partial<Record<ImportKey, unknown>> };
export function validateGuestSnapshot(value: unknown): GuestSnapshot {
  if (!value || typeof value !== "object") throw new Error("Invalid snapshot");
  const input = value as Record<string, unknown>;
  if (input.version !== 1 || !input.values || typeof input.values !== "object" || Array.isArray(input.values)) throw new Error("Invalid snapshot");
  const values = input.values as Record<string, unknown>;
  if (Object.keys(values).some(key => !(IMPORT_KEYS as readonly string[]).includes(key))) throw new Error("Unexpected storage key");
  if (new TextEncoder().encode(JSON.stringify(value)).length > 256_000) throw new Error("Snapshot too large");
  for (const [key, data] of Object.entries(values)) {
    if (!data || typeof data !== "object") throw new Error(`Invalid ${key}`);
    const list = Array.isArray(data) ? data : (data as Record<string, unknown>).items ?? (data as Record<string, unknown>).lists;
    if (key !== "ziiply-shopping-checks-v1" && !Array.isArray(list)) throw new Error(`Invalid ${key}`);
    if (Array.isArray(list) && list.length > 1000) throw new Error("Too many items");
  }
  return { version: 1, values: values as GuestSnapshot["values"] };
}
export function captureGuestSnapshot(local: Pick<Storage, "getItem">, session: Pick<Storage, "getItem">): GuestSnapshot {
  const values: GuestSnapshot["values"] = {};
  for (const key of IMPORT_KEYS) {
    try {
      const raw = (key === "ziiply-desktop-current-cart-v1" ? session : local).getItem(key);
      if (raw) values[key] = JSON.parse(raw);
    } catch { /* keep original storage intact */ }
  }
  return validateGuestSnapshot({ version: 1, values });
}
