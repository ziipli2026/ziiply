import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const queue = JSON.parse(execFileSync(process.execPath, ["scripts/citymarket/build-image-review-queue.mjs"], { encoding: "utf8" }));
assert.equal(queue.totalOffers, queue.existingImages + queue.missingImages);
assert.equal(queue.rows.length, queue.missingImages);
const originalQueue = fs.existsSync("citymarket-image-review-queue.json") ? fs.readFileSync("citymarket-image-review-queue.json") : null;
const originalHtml = fs.existsSync("citymarket-image-review.html") ? fs.readFileSync("citymarket-image-review.html") : null;
const originalDiscovery = fs.existsSync("citymarket-image-discovery.json") ? fs.readFileSync("citymarket-image-discovery.json") : null;
fs.writeFileSync("citymarket-image-review-queue.json", JSON.stringify(queue));
const sample = queue.rows[0];
assert.ok(sample?.offerId, "Review queue must contain an offer");
fs.writeFileSync("citymarket-image-discovery.json", JSON.stringify({results:[{offerId:sample.offerId,page:"https://example.org/product",imageCandidates:["https://example.org/product-image.jpg"]}]}));
try {
  execFileSync(process.execPath, ["scripts/citymarket/build-image-review-html.mjs"], { stdio: "pipe" });
  const html = fs.readFileSync("citymarket-image-review.html", "utf8");
  assert.match(html, /<input id="search"/);
  assert.match(html, /1 uutta kuvaehdokasta/);
  assert.match(html, /https:\/\/example.org\/product-image.jpg/);
  assert.match(html, /https:\/\/example.org\/product/);
  assert.match(html, /Ei hyväksytty käyttöön/);
  assert.match(html, /<select id="status"/);
  assert.match(html, /search\.addEventListener\("input",update\)/);
  assert.match(html, /status\.addEventListener\("change",update\)/);
  assert.match(html, /article\[hidden\]\{display:none\}/);
  assert.equal((html.match(/<article data-page=/g) ?? []).length, queue.missingImages);
  assert.ok(!html.includes("<img") || html.includes("Ei hyväksytty käyttöön"));
  console.log("Verified gallery controls, handlers, and " + queue.missingImages + " review cards.");
} finally {
  for(const [name,original] of [["citymarket-image-review-queue.json",originalQueue],["citymarket-image-review.html",originalHtml],["citymarket-image-discovery.json",originalDiscovery]]){
    if(original===null)fs.rmSync(name,{force:true});
    else fs.writeFileSync(name,original);
  }
}
