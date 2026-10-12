import fs from "node:fs";
const input = JSON.parse(fs.readFileSync("scripts/citymarket/41lv-image-source-candidates.json", "utf8"));
const results = [];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
for (const candidate of input.candidates) {
  if (!candidate.imageUrl) continue;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(candidate.imageUrl, { method: "GET", redirect: "follow", signal: controller.signal, headers: { "Accept": "image/*" } });
    const type = response.headers.get("content-type") || "";
    const lengthHeader = response.headers.get("content-length");
    const declaredSize = lengthHeader === null ? null : Number(lengthHeader);
    const oversized = declaredSize !== null && Number.isFinite(declaredSize) && declaredSize > MAX_IMAGE_BYTES;
    let bytes = 0;
    if (response.ok && type.toLowerCase().startsWith("image/") && !oversized && response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_IMAGE_BYTES) { await reader.cancel(); break; }
      }
    } else { await response.body?.cancel(); }
    const tooLarge = oversized || bytes > MAX_IMAGE_BYTES;
    const validImage = response.ok && /^image\/(jpeg|png|webp|gif|avif|svg\+xml)(?:;|$)/i.test(type) && bytes > 100 && !tooLarge;
    const failureReason = validImage ? null : !response.ok ? "http-error" : !type.toLowerCase().startsWith("image/") ? "not-an-image" : tooLarge ? "image-too-large" : bytes <= 100 ? "empty-or-tiny-image" : "unsupported-image-type";
    results.push({ offerId: candidate.offerId, httpStatus: response.status, contentType: type, bytes, reachableImage: validImage, failureReason, approved: false });
  } catch (error) {
    results.push({ offerId: candidate.offerId, reachableImage: false, failureReason: "request-failed", error: String(error), approved: false });
  } finally { clearTimeout(timer); }
}
fs.writeFileSync("citymarket-image-probe.json", JSON.stringify({ checked: results.length, results }, null, 2) + "\n");
console.log("Image URL reachability checked for " + results.length + " candidate(s). Results are not image approvals.");
