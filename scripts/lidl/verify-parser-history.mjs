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
      const sourceUrlPath = path.join(root, fixtureName.slice(0, -".html".length) + ".source-url.txt");
      const sourceUrl = (await fs.readFile(sourceUrlPath, "utf8")).trim();
      if (!sourceUrl) throw new Error(`Empty Lidl source URL sidecar: ${sourceUrlPath}`);
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

    // Product-page captures are immutable source evidence, not inputs to the
    // category/grid production parser. Replay their embedded Lidl product
    // datalayer and visible offer footer against the independently approved
    // normalized expectation.
    const extractProductEvidence = capture => {
      const match = capture.html.match(/unified_datalayer_product\s*=\s*(\{[\\s\\S]*?\})<\\/script>/i);
      if (!match) return null;
      let product;
      try { product = JSON.parse(match[1]); } catch { return null; }
      const visible = decode(capture.html.replace(/<script\\b[\\s\\S]*?<\\/script>/gi, " ").replace(/<style\\b[\\s\\S]*?<\\/style>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\\s+/g, " ");
      const priceText = visible.match(/(\\d+[,.]\\d{2})€/)?.[1]?.replace(",", ".") || "";
      return {
        name: normalize([product.brand, product.name, product.netWeight || ""].filter(Boolean).join(" ")),
        brandName: normalize(product.brand),
        price: Number(product.price ?? priceText),
        category: String(product.wonCategoryPrimary || ""),
        limitedBatch: /\\berä\\b/i.test(visible),
      };
    };

    const evidenceRows = productCaptures.map(extractProductEvidence).filter(Boolean);
    if (evidenceRows.length !== productCaptures.length) {
      console.error(`Product-page evidence replay mismatch ${name}: expected ${productCaptures.length} readable product captures, got ${evidenceRows.length}`);
      failed++;
    }

    const missingEvidence = expected.filter(row => {
      const expectedName = normalize(row.name);
      return !evidenceRows.some(actual =>
        actual.name.includes(expectedName) ||
        expectedName.includes(actual.name)
      );
    });
    const sourceMismatches = expected.filter(row => {
      const actual = evidenceRows.find(x => x.name.includes(normalize(row.name)) || normalize(row.name).includes(x.name));
      if (!actual) return false;
      return Math.abs(actual.price - row.price) > 0.001 ||
        (row.brandName && !actual.brandName.includes(normalize(row.brandName))) ||
        (row.category && !normalize(actual.category).includes(normalize(row.category))) ||
        (row.eligibility === "limited-batch" && !actual.limitedBatch);
    });

    if (missingEvidence.length || sourceMismatches.length) {
      console.error(`Product-page evidence mismatch ${name}: missing ${missingEvidence.length}, mismatched ${sourceMismatches.length}`);
      if (missingEvidence.length) console.error("MISSING", JSON.stringify(missingEvidence, null, 2));
      if (sourceMismatches.length) console.error("MISMATCHED", JSON.stringify(sourceMismatches, null, 2));
      failed++;
    } else {
      console.log(`OK ${name}: ${expected.length}/${expected.length} approved product-page evidence replays`);
    }

    // Category pages are supplementary evidence. They are not required to
    // contain every product-page capture because category capture scope is
    // intentionally limited to selected official pages.
    if (categoryCaptures.length) {
      const parseCapture = capture => [
        ...parseGrid(capture.html, capture.sourceUrl, date),
        ...parse(capture.html, capture.sourceUrl, date),
      ];
      const categoryActual = canonical(categoryCaptures.flatMap(parseCapture));
      const covered = expected.filter(row => categoryActual.some(actual => actual.name === row.name));
      console.log(`INFO ${name}: category-page parser replay covered ${covered.length}/${expected.length} approved products (${categoryActual.length} total parsed category offers)`);
    }
  await fs.rm(tempDir, { recursive: true, force: true });
  if (failed) process.exit(1);
} else {
  throw new Error("Only verify mode is supported. Approval must come from an independently reviewed source capture.");
}
