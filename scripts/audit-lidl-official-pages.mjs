#!/usr/bin/env node
/**
 * Read-only Lidl official product page evidence collector.
 * Usage: node scripts/audit-lidl-official-pages.mjs [--limit=10]
 * Never treats a promotional/previous price as a verified regular store price.
 * Does not import inferred barcodes, mutate the EAN bank, or change app data.
 */
import { readFileSync, writeFileSync } from "node:fs";
const source = new URL("../data/lidl/official-product-image-price-audit-2026-10-04.json", import.meta.url);
const records = JSON.parse(readFileSync(source, "utf8")).records;
const arg = process.argv.find(x => x.startsWith("--limit="));
const limit = process.argv.includes("--all") ? records.length : arg ? Math.max(0, Math.min(records.length, Number(arg.split("=")[1]) || 0)) : 10;
const outputArg = process.argv.find(x => x.startsWith("--output="));
const decode = s => String(s || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const meta = (html, key) => {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1] !== key) continue;
    return decode(tag.match(/content\s*=\s*(["'])(.*?)\1/i)?.[2] || "");
  }
  return null;
};
const output = [];
for (const item of records.slice(0, limit)) {
  const row = { lidlProductId: item.lidlProductId, name: item.name, officialUrl: item.officialUrl, checkedAt: new Date().toISOString(), httpStatus: null, candidateImageUrl: null, imageVerified: false, regularPriceEur: null, priceVerified: false, ean: null };
  try {
    const response = await fetch(item.officialUrl, { redirect: "follow", headers: { "user-agent": "ZiiplyLidlResearch/1.0", accept: "text/html" }, signal: AbortSignal.timeout(12000) });
    row.httpStatus = response.status;
    if (response.ok) {
      const html = await response.text();
      const image = meta(html, "og:image") || meta(html, "twitter:image");
      if (image) row.candidateImageUrl = new URL(image, response.url).href;
      row.pageTitle = meta(html, "og:title") || null;
      row.imageStatus = image ? "candidate_needs_product_identity_review" : "not_found_in_meta";
    }
  } catch (error) { row.error = String(error); }
  output.push(row);
}
const imageCounts = new Map();
for (const row of output) if (row.candidateImageUrl) imageCounts.set(row.candidateImageUrl, (imageCounts.get(row.candidateImageUrl) || 0) + 1);
for (const row of output) {
  if (row.candidateImageUrl && imageCounts.get(row.candidateImageUrl) > 1) {
    row.imageStatus = "shared_meta_image_not_product_verified";
    row.imageVerified = false;
  }
}
const result = { source: "lidl.fi-official-product-page", researchOnly: true, count: output.length, sharedMetaImageCount: [...imageCounts.values()].filter(n => n > 1).length, records: output };
const json = JSON.stringify(result, null, 2) + "\n";
if (outputArg) { const file = outputArg.slice("--output=".length); if (!file) throw new Error("--output requires a path"); writeFileSync(file, json); process.stderr.write(`Wrote ${output.length} records to ${file}\\n`); }
else process.stdout.write(json);
