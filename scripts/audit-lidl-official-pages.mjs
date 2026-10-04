#!/usr/bin/env node
/**
 * Read-only Lidl official product page evidence collector.
 * Usage: node scripts/audit-lidl-official-pages.mjs [--limit=10]
 * Never treats a promotional/previous price as a verified regular store price.
 * Does not import inferred barcodes, mutate the EAN bank, or change app data.
 */
import { readFileSync } from "node:fs";
const source = new URL("../data/lidl/official-product-image-price-audit-2026-10-04.json", import.meta.url);
const records = JSON.parse(readFileSync(source, "utf8")).records;
const arg = process.argv.find(x => x.startsWith("--limit="));
const limit = arg ? Math.max(0, Math.min(records.length, Number(arg.split("=")[1]) || 0)) : 10;
const decode = s => String(s || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const meta = (html, key) => {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    if (!new RegExp('(?:property|name)\\s*=\\s*["\\']' + key.replace(/[.*+?^$\x7b\x7d()|[\]\\]/g, "\\$&") + '["\\']', "i").test(tag)) continue;
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
process.stdout.write(JSON.stringify({ source: "lidl.fi-official-product-page", researchOnly: true, count: output.length, records: output }, null, 2) + "\n");
