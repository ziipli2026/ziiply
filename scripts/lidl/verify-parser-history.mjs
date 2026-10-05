#!/usr/bin/env node
/**
 * Lidl parser regression verifier.
 *
 * Regression fixtures must contain the captured official Lidl.fi HTML plus the
 * independently approved normalized result. "actual" is always produced by the
 * real production parser at test time; committed *.actual.json files are never
 * trusted as parser evidence.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const root = path.resolve(process.env.LIDL_REGRESSION_ROOT || "data/lidl/parser-regression");
const mode = process.argv[2] || "verify";
const providerPath = path.resolve("src/app/components/ziiply/offerSearch/providers/lidlPublicLeafletProvider.ts");
const lifecyclePath = path.resolve("src/app/components/ziiply/offerSearch/publicationLifecycle.ts");

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

async function loadProductionParser() {
  const tempDir = path.resolve(".tmp-lidl-parser-regression");
  await fs.rm(tempDir, { recursive: true, force: true });
  await fs.mkdir(tempDir, { recursive: true });
  const transpile = async (input, output, rewrite = x => x) => {
    const source = rewrite(await fs.readFile(input, "utf8"));
    const js = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
      fileName: input,
    }).outputText;
    await fs.writeFile(output, js);
  };
  await transpile(lifecyclePath, path.join(tempDir, "publicationLifecycle.mjs"));
  await transpile(providerPath, path.join(tempDir, "lidlPublicLeafletProvider.mjs"),
    source => source.replace('from "../publicationLifecycle"', 'from "./publicationLifecycle.mjs"'));
  const module = await import(pathToFileURL(path.join(tempDir, "lidlPublicLeafletProvider.mjs")).href + "?v=" + Date.now());
  return { parse: module.parseLidlPublicCategoryHtml, tempDir };
}

const manifests = (await files(root)).filter(name => name.endsWith(".expected.json"));
if (mode === "verify") {
  if (!manifests.length) throw new Error("Lidl parser regression archive is empty");
  const { parse, tempDir } = await loadProductionParser();
  let failed = 0;
  for (const name of manifests) {
    const edition = name.replace(".expected.json", "");
    const expected = canonical(JSON.parse(await fs.readFile(path.join(root, name), "utf8")));
    const fixtureNames = (await files(root)).filter(file => file.startsWith(edition + ".") && file.endsWith(".html"));
    if (!fixtureNames.length) {
      console.error("Missing immutable Lidl source capture(s) for:", edition);
      failed++;
      continue;
    }
    const date = expected[0]?.validFrom || edition.slice(0, 10);
    const parsedRows = [];
    for (const fixtureName of fixtureNames) {
      const html = await fs.readFile(path.join(root, fixtureName), "utf8");
      const sourceUrlPath = path.join(root, fixtureName.replace(/\.html$/, ".source-url.txt"));
      let sourceUrl = "https://www.lidl.fi/";
      try { sourceUrl = (await fs.readFile(sourceUrlPath, "utf8")).trim() || sourceUrl; } catch {}
      parsedRows.push(...parse(html, sourceUrl, date));
    }
    const actual = canonical(parsedRows);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      console.error(`Regression mismatch ${name}: expected ${expected.length}, parser produced ${actual.length}`);
      console.error("EXPECTED", JSON.stringify(expected, null, 2));
      console.error("ACTUAL", JSON.stringify(actual, null, 2));
      failed++;
    } else {
      console.log(`OK ${name}: production parser reproduced ${expected.length} approved offers from archived HTML`);
    }
  }
  await fs.rm(tempDir, { recursive: true, force: true });
  if (failed) process.exit(1);
} else {
  throw new Error("Only verify mode is supported. Approval must come from an independently reviewed source capture.");
}
