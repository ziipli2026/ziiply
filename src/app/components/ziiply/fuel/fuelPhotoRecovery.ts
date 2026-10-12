/**
 * Submit a fuel price photo for private recovery only when initial OCR is incomplete.
 * Never block the user's immediate OCR result on background recovery.
 * Consent must be an explicit user action, not a prechecked default.
 */
export async function submitIncompleteFuelPhoto(params: {
  photo: File;
  recognizedCount: number;
  expectedCount: number;
  allowRecovery: boolean;
}): Promise<{ queued: boolean; jobId?: string }> {
  if (!params.allowRecovery || params.expectedCount <= 0 ||
      params.recognizedCount >= params.expectedCount) return { queued: false };
  const body = new FormData();
  body.set("photo", params.photo);
  body.set("recognizedCount", String(params.recognizedCount));
  body.set("expectedCount", String(params.expectedCount));
  body.set("allowRecovery", "true");
  try {
    const response = await fetch("/api/fuel-photo/recovery", {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return { queued: false };
    const data = await response.json();
    return { queued: data.queued === true, jobId: data.jobId };
  } catch {
    return { queued: false };
  }
}
