#!/usr/bin/env node
/**
 * Lidl leaflet parser regression archive.
 *
 * Every successfully parsed official Lidl.fi edition is stored as an immutable
 * normalized snapshot. Before a new edition can be accepted, the parser is run
 * against every archived HTML fixture and the normalized result is compared
 * with its approved snapshot. This is deliberately the same "old editions must
 * still parse" principle used by the Citymarket leaflet pipeline.
 */
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve("data/lidl/parser-regression");
const mode = process.argv[2] || "verify";

const normalize = value => String(value ?? "").toLocaleLowerCase("fi")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/\s+/g, " ").trim();

function canonical(rows) {
  return rows.map(row => ({
    name: normalize(row.name || row.title),
    brandName: normalize(row.brandName || row.brand),
    price: Number(row.price ?? row.offerPrice ?? 0),
    priceBasis: row.priceBasis || "unit",
    validFrom: String(row.validFrom || "").slice(0, 10),
    validUntil: String(row.validUntil || row.validThrough || "").slice(0, 10),
    eligibility: row.eligibility || (row.requiresLidlPlus ? "lidl-plus" : "open"),
    category: row.category || "",
  })).filter(row => row.name && row.price > 0 && row.validFrom && row.validUntil)
    .sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

async function files(dir) {
  try { return (await fs.readdir(dir)).sort(); } catch { return []; }
}

const manifests = (await files(root)).filter(name => name.endsWith(".expected.json"));
if (mode === "verify") {
  if (!manifests.length) {
    console.log("Lidl parser regression archive is empty: bootstrap required after first approved HTML capture.");
    process.exit(0);
  }
  let failed = 0;
  for (const name of manifests) {
    const expected = JSON.parse(await fs.readFile(path.join(root, name), "utf8"));
    const actualPath = path.join(root, name.replace(".expected.json", ".actual.json"));
    let actual;
    try { actual = JSON.parse(await fs.readFile(actualPath, "utf8")); }
    catch { console.error("Missing parser output:", actualPath); failed++; continue; }
    const a = canonical(actual), e = canonical(expected);
    if (JSON.stringify(a) !== JSON.stringify(e)) {
      console.error(`Regression mismatch ${name}: expected ${e.length}, got ${a.length}`);
      failed++;
    } else console.log(`OK ${name}: ${e.length} offers`);
  }
  if (failed) process.exit(1);
} else if (mode === "approve") {
  const input = process.argv[3], edition = process.argv[4];
  if (!input || !edition || !/^[a-zA-Z0-9._-]+$/.test(edition)) throw new Error("Usage: approve <parser-output.json> <edition-id>");
  const rows = canonical(JSON.parse(await fs.readFile(input, "utf8")));
  if (!rows.length) throw new Error("Refusing to approve an empty Lidl edition");
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(path.join(root, `${edition}.expected.json`), JSON.stringify(rows, null, 2) + "\n");
  console.log(`Approved Lidl regression snapshot ${edition}: ${rows.length} offers`);
} else throw new Error("Unknown mode");
