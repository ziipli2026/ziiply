import fs from "node:fs";
const input = JSON.parse(fs.readFileSync("scripts/citymarket/41lv-image-source-candidates.json", "utf8"));
const results = [];
for (const candidate of input.candidates) {
  if (!candidate.imageUrl) continue;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(candidate.imageUrl, { method: "GET", redirect: "follow", signal: controller.signal, headers: { "Accept": "image/*" } });
    const type = response.headers.get("content-type") || "";
    const bytes = response.ok && type.toLowerCase().startsWith("image/") ? (await response.arrayBuffer()).byteLength : 0;
    results.push({ offerId: candidate.offerId, httpStatus: response.status, contentType: type, bytes, reachableImage: response.ok && type.toLowerCase().startsWith("image/") && bytes > 0, approved: false });
  } catch (error) {
    results.push({ offerId: candidate.offerId, reachableImage: false, error: String(error), approved: false });
  } finally { clearTimeout(timer); }
}
fs.writeFileSync("citymarket-image-probe.json", JSON.stringify({ checked: results.length, results }, null, 2) + "\n");
console.log("Image URL reachability checked for " + results.length + " candidate(s). Results are not image approvals.");
