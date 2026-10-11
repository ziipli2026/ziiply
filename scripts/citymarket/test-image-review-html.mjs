import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const queue = JSON.parse(execFileSync(process.execPath, ["scripts/citymarket/build-image-review-queue.mjs"], { encoding: "utf8" }));
assert.equal(queue.totalOffers, queue.existingImages + queue.missingImages);
assert.equal(queue.rows.length, queue.missingImages);
fs.writeFileSync("citymarket-image-review-queue.json", JSON.stringify(queue));
try {
  execFileSync(process.execPath, ["scripts/citymarket/build-image-review-html.mjs"], { stdio: "pipe" });
  const html = fs.readFileSync("citymarket-image-review.html", "utf8");
  assert.match(html, /<input id="search"/);
  assert.match(html, /<select id="status"/);
  assert.match(html, /search\.addEventListener\("input",update\)/);
  assert.match(html, /status\.addEventListener\("change",update\)/);
  assert.match(html, /article\[hidden\]\{display:none\}/);
  assert.equal((html.match(/<article data-page=/g) ?? []).length, queue.missingImages);
  assert.ok(!html.includes("<img") || html.includes("Ei hyväksytty käyttöön"));
  console.log("Verified gallery controls, handlers, and " + queue.missingImages + " review cards.");
} finally {
  fs.rmSync("citymarket-image-review-queue.json", { force: true });
  fs.rmSync("citymarket-image-review.html", { force: true });
}
