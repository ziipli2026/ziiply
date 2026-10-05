#!/usr/bin/env node
/**
 * Lidl parser regression verifier.
 *
 * Product-page captures are the exact immutable regression fixtures: their
 * approved normalized result must be reproduced exactly by the production
 * parser. Category-page captures are supplementary source evidence and are
 * checked for coverage of every approved product, but are not compared as an
 * exact snapshot because a category page legitimately contains many other
 * offers.
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

async function sourceUrlFor(dir, fixtureName) {
  const fallback = "https://www.lidl.fi/";
  try {
    return (await fs.readFile(path.join(dir, fixtureName.replace(".html", ".source-url.txt"), "utf8"))).trim() || fallback;
  } catch {
    return fallback;
  }
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
  return { parse: module.parseLidlPublicCategoryHtml, parseGrid: module.parseLidlGridDataOffers, tempDir };
}

const manifests = (await files(root)).filter(name => name.endsWith(".expected.json"));
if (mode === "verify") {
  const manifests = (await files(root)).filter(name => name.endsWith(".expected.json"));
  if (!manifests.length) throw new Error("Lidl parser regression archive is empty");

  const { parse, parseGrid, tempDir } = await loadProductionParser();
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

    const captures = [];
    for (const fixtureName of fixtureNames) {
      const sourceUrl = await sourceUrlFor(root, fixtureName);
      const html = await fs.readFile(path.join(root, fixtureName), "utf8");
      captures.push({
        fixtureName,
        sourceUrl,
        html,
        isProductPage: sourceUrl.includes("/p/"),
        isCategoryPage: sourceUrl.includes("/h/"),
      });
    }

    const productCaptures = captures.filter(x => x.isProductPage);
    const categoryCaptures = captures.filter(x => x.isCategoryPage);

    if (!productCaptures.length) {
      console.error("Missing immutable Lidl product-page regression capture(s) for:", edition);
      failed++;
      continue;
    }

    const date = expected[0]?.validFrom || edition.slice(0, 10);
    const parseCapture = capture => [
      ...parseGrid(capture.html, capture.sourceUrl, date),
      ...parse(capture.html, capture.sourceUrl, date),
    ];

    // Exact regression: approved product-page captures must reproduce exactly
    // the independently reviewed expected result.
    const actualProduct = canonical(productCaptures.flatMap(parseCapture));
    if (JSON.stringify(actualProduct) !== JSON.stringify(expected)) {
      console.error(`Regression mismatch ${name}: expected ${expected.length}, product-page parser produced ${actualProduct.length}`);
      console.error("EXPECTED", JSON.stringify(expected, null, 2));
      console.error("ACTUAL", JSON.stringify(actualProduct, null, 2));
      failed++;
    } else {
      console.log(`OK ${name}: production parser reproduced ${expected.length} approved product-page offers`);
    }

    // Category pages are deliberately not exact snapshots: they contain many
    // legitimate offers. They must, however, cover every independently
    // approved product captured for this edition.
    if (categoryCaptures.length) {
      const categoryActual = canonical(categoryCaptures.flatMap(parseCapture));
      const categoryByName = new Map(categoryActual.map(row => [row.name, row]));
      const missing = expected.filter(row => !categoryByName.has(row.name));
      if (missing.length) {
        console.error(`Category-page coverage mismatch ${name}: missing ${missing.length} approved offer(s)`);
        console.error("MISSING", JSON.stringify(missing, null, 2));
        failed++;
      } else {
        console.log(`OK ${name}: category-page captures cover all ${expected.length} approved offers (${categoryActual.length} parsed category offers)`);
      }
    } else {
      console.log(`INFO ${name}: no supplementary category-page captures`);
    }
  }

  await fs.rm(tempDir, { recursive: true, force: true });
  if (failed) process.exit(1);
} else {
  throw new Error("Only verify mode is supported. Approval must come from an independently reviewed source capture.");
}
