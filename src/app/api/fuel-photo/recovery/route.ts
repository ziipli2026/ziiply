import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;
const MAX_BYTES = 6 * 1024 * 1024;
const TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Isolated, opt-in ingestion for failed fuel-price photo recognition.
 * Never publishes OCR guesses. External private storage + worker must be
 * configured separately; otherwise fails closed without retaining images.
 */
export async function POST(request: NextRequest) {
  const endpoint = process.env.ZIIPLY_FUEL_PHOTO_RECOVERY_ENDPOINT;
  const token = process.env.ZIIPLY_FUEL_PHOTO_RECOVERY_TOKEN;
  if (process.env.ZIIPLY_FUEL_PHOTO_RECOVERY_ENABLED !== "1" || !endpoint || !token)
    return NextResponse.json({ ok: false, error: "Recovery not configured" }, { status: 503 });
  let url: URL;
  try { url = new URL(endpoint); } catch { return NextResponse.json({ ok: false }, { status: 503 }); }
  if (url.protocol !== "https:")
    return NextResponse.json({ ok: false, error: "HTTPS required" }, { status: 503 });
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data"))
    return NextResponse.json({ ok: false, error: "Multipart required" }, { status: 415 });
  const form = await request.formData().catch(() => null);
  const photo = form?.get("photo");
  const recognized = Number(form?.get("recognizedCount"));
  const expected = Number(form?.get("expectedCount"));
  if (form?.get("allowRecovery") !== "true")
    return NextResponse.json({ ok: false, error: "Permission required" }, { status: 400 });
  if (!(photo instanceof File) || !TYPES.has(photo.type) || photo.size < 100 || photo.size > MAX_BYTES)
    return NextResponse.json({ ok: false, error: "Invalid photo" }, { status: 400 });
  if (!Number.isSafeInteger(recognized) || !Number.isSafeInteger(expected) ||
      recognized < 0 || expected < 1 || expected > 20 || recognized >= expected)
    return NextResponse.json({ ok: false, error: "Incomplete recognition required" }, { status: 400 });

  const payload = new FormData();
  payload.set("photo", photo, "fuel-price-photo");
  payload.set("recognizedCount", String(recognized));
  payload.set("expectedCount", String(expected));
  payload.set("retentionHours", "24");
  payload.set("mode", "private-recovery-no-publication");
  try {
    const response = await fetch(url, {
      method: "POST", headers: { authorization: `Bearer ${token}` },
      body: payload, cache: "no-store", signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error("Rejected");
    const result = await response.json();
    return NextResponse.json({ ok: true, queued: true, jobId: String(result.jobId ?? "") });
  } catch {
    return NextResponse.json({ ok: false, queued: false, error: "Recovery unavailable" }, { status: 502 });
  }
}
