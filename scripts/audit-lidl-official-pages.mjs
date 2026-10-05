#!/usr/bin/env node
/**
 * Read-only Lidl official product page evidence collector.
 * Usage: node scripts/audit-lidl-official-pages.mjs [--limit=10|--all] [--output=path]
 * Never treats a promotional/previous price as a verified regular store price.
 * Does not import inferred barcodes, mutate the EAN bank, or change app data.
 */
import { readFileSync, writeFileSync } from "node:fs";
const source = new URL("../data/lidl/official-product-image-price-audit-2026-10-04.json", import.meta.url);
// Mass GTIN audit run marker: 2026-10-05T15:00Z
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
const normalize = s => String(s || "").toLocaleLowerCase("fi").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const digits = value => String(value ?? "").replace(/\\D/g, "");
const validGtin = value => {
  const d = digits(value);
  if (![8, 12, 13, 14].includes(d.length)) return false;
  const body = d.slice(0, -1);
  const check = Number(d.at(-1));
  let sum = 0, weight = 3;
  for (let i = body.length - 1; i >= 0; i--, weight = weight === 3 ? 1 : 3) sum += Number(body[i]) * weight;
  return (10 - (sum % 10)) % 10 === check;
};
const collectGtins = html => {
  const found = new Set();
  const add = value => { const d = digits(value); if (validGtin(d)) found.add(d); };
  for (const match of html.matchAll(/(?:ean|gtin|barcode|gs1|productCode|itemCode)\\s*["':=]+\\s*["']?([0-9]{8,14})/gi)) add(match[1]);
  for (const script of html.matchAll(/<script\\b[^>]*type=["']application\\/ld\\+json["'][^>]*>([\\s\\S]*?)<\\/script>/gi)) {
    try {
      const parsed = JSON.parse(script[1]);
      const visit = value => {
        if (!value || typeof value !== "object") return;
        if (Array.isArray(value)) return value.forEach(visit);
        for (const [key, item] of Object.entries(value)) {
          if (/gtin|ean|barcode|sku/i.test(key)) add(item);
          if (item && typeof item === "object") visit(item);
        }
      };
      visit(parsed);
    } catch {}
  }
  const marker = "unified_datalayer_product";
  const start = html.indexOf(marker);
  if (start >= 0) {
    const eq = html.indexOf("=", start + marker.length);
    const end = html.indexOf("</script>", eq);
    if (eq >= 0 && end > eq) {
      try {
        const raw = html.slice(eq + 1, end).trim();
        const product = JSON.parse(raw);
        for (const [key, value] of Object.entries(product || {})) if (/gtin|ean|barcode|gs1/i.test(key)) add(value);
      } catch {}
    }
  }
  return [...found];
};
const imageHostAllowed = host => host === "imgproxy-retcat.assets.schwarz" || host === "lidl.fi" || host.endsWith(".lidl.fi") || host === "lidl.net" || host.endsWith(".lidl.net") || host === "lidl.com" || host.endsWith(".lidl.com");
const genericImage = url => /(?:logo|placeholder|default|fallback|no-image|social-share|open-graph|og-image)/i.test(new URL(url).pathname);
const output = [];
for (const item of records.slice(0, limit)) {
  const row = { lidlProductId: item.lidlProductId, name: item.name, officialUrl: item.officialUrl, checkedAt: new Date().toISOString(), httpStatus: null, candidateImageUrl: null, imageVerified: false, regularPriceEur: null, priceVerified: false, ean: null, officialPageGtins: [] };
  try {
    const response = await fetch(item.officialUrl, { redirect: "follow", headers: { "user-agent": "ZiiplyLidlResearch/1.0", accept: "text/html" }, signal: AbortSignal.timeout(12000) });
    row.httpStatus = response.status;
    if (response.ok) {
      const html = await response.text();
      row.officialPageGtins = collectGtins(html);
      const image = meta(html, "og:image") || meta(html, "twitter:image");
      row.metaImagePresent = !!image;
      row.metaImageHost = image ? (() => { try { return new URL(image, response.url).hostname; } catch { return null; } })() : null;
      row.pageTitle = meta(html, "og:title") || null;
      const canonicalTag = (html.match(/<link\b[^>]*>/gi) || []).find(tag => /\brel\s*=\s*["\x27]canonical["\x27]/i.test(tag));
      const canonical = canonicalTag?.match(/href\s*=\s*(["\x27])(.*?)\1/i)?.[2] || null;
      row.canonicalUrl = canonical ? new URL(decode(canonical), response.url).href : null;
      row.productIdInCanonical = !!row.canonicalUrl && new URL(row.canonicalUrl).pathname.replace(/\/$/, "").endsWith(`/p${item.lidlProductId}`);
      row.titleMatchesProduct = !!row.pageTitle && normalize(row.pageTitle).includes(normalize(item.name));
      row.finalUrl = response.url;
      row.htmlTitle = decode(html.match(/<title[^>]*>(.*?)<[/]title>/is)?.[1] || "");
      row.imageMarkupCounts = { img: (html.match(/<img\b/gi) || []).length, picture: (html.match(/<picture\b/gi) || []).length, jsonLd: (html.match(/application[/]ld[+]json/gi) || []).length, nextImage: (html.match(/_next[/]image/gi) || []).length };
      row.htmlBytes = html.length;
      // Collect only structured Product offers, as evidence for later price review.
      // Never infer a current store price from an arbitrary campaign or page text.
      row.structuredPriceEvidence = [];
      for (const script of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
          const parsed = JSON.parse(script[1]);
          const nodes = [];
          const visit = value => {
            if (!value || typeof value !== "object") return;
            if (Array.isArray(value)) { value.forEach(visit); return; }
            if (value["@type"] === "Product" || (Array.isArray(value["@type"]) && value["@type"].includes("Product"))) nodes.push(value);
            if (value["@graph"]) visit(value["@graph"]);
          };
          visit(parsed);
          for (const product of nodes) {
            const offers = Array.isArray(product.offers) ? product.offers : product.offers ? [product.offers] : [];
            for (const offer of offers) {
              if (offer.price == null && offer.priceSpecification?.price == null) continue;
              row.structuredPriceEvidence.push({
                productName: product.name ?? null,
                price: offer.price ?? offer.priceSpecification?.price,
                currency: offer.priceCurrency ?? offer.priceSpecification?.priceCurrency ?? null,
                validFrom: offer.validFrom ?? null,
                validThrough: offer.validThrough ?? offer.priceValidUntil ?? null,
                evidenceType: "jsonld-product-offer-unverified-price-kind",
                usableAsCurrentNormalPrice: false
              });
            }
          }
        } catch { /* malformed or non-product structured metadata is not price evidence */ }
      }
      if (image) { try { const url = new URL(image, response.url); if (url.protocol === "https:" && imageHostAllowed(url.hostname)) row.candidateImageUrl = url.href; else row.imageStatus = "external_or_insecure_meta_image"; } catch { row.imageStatus = "invalid_meta_image_url"; } }
      if (!image) row.imageStatus = "not_found_in_meta";
      else if (row.candidateImageUrl) row.imageStatus = genericImage(row.candidateImageUrl) ? "generic_meta_image" : row.productIdInCanonical && row.titleMatchesProduct ? "product_page_image_candidate" : "page_identity_not_confirmed";
      row.imageVerified = false; // Metadata alone cannot verify the actual image content.
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
for (const row of output) {
  if (row.imageStatus !== "product_page_image_candidate") continue;
  row.imageCheck = "not_checked";
  try {
    const response = await fetch(row.candidateImageUrl, { method: "GET", redirect: "follow", headers: { Range: "bytes=0-1023", Accept: "image/*" }, signal: AbortSignal.timeout(8000) });
    row.imageHttpStatus = response.status;
    row.imageContentType = response.headers.get("content-type");
    row.imageReachable = response.ok && String(row.imageContentType || "").toLowerCase().startsWith("image/");
    row.imageCheck = row.imageReachable ? "http_image_confirmed" : "http_non_image_or_unavailable";
    await response.body?.cancel();
  } catch (error) {
    row.imageReachable = null;
    row.imageCheck = "network_check_inconclusive";
    row.imageError = String(error);
  }
  // Keep a product-identity-matched official metadata URL as a candidate even
  // when a separate CDN request is blocked by the CI runner. Never call it visually verified.
}
const statusCounts = Object.fromEntries([...new Set(output.map(x => x.imageStatus || (x.httpStatus ? `http_${x.httpStatus}` : "network_error")))].map(k => [k, output.filter(x => (x.imageStatus || (x.httpStatus ? `http_${x.httpStatus}` : "network_error")) === k).length]));
const imageCheckCounts = Object.fromEntries([...new Set(output.map(x => x.imageCheck || "no_candidate"))].map(k => [k, output.filter(x => (x.imageCheck || "no_candidate") === k).length]));
const result = { source: "lidl.fi-official-product-page", statusCounts, imageCheckCounts, researchOnly: true, count: output.length, candidateCount: output.filter(x => x.imageStatus === "product_page_image_candidate").length, sharedMetaImageCount: [...imageCounts.values()].filter(n => n > 1).length, records: output };
const json = JSON.stringify(result, null, 2) + "\n";
if (outputArg) { const file = outputArg.slice("--output=".length); if (!file) throw new Error("--output requires a path"); writeFileSync(file, json); process.stderr.write(`Wrote ${output.length} records to ${file}\n`); }
else process.stdout.write(json);
