import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const queue = JSON.parse(execFileSync(process.execPath, ["scripts/citymarket/build-image-review-queue.mjs"], { encoding: "utf8" }));
assert.equal(queue.totalOffers, queue.existingImages + queue.missingImages);
assert.equal(queue.rows.length, queue.missingImages);
const originalQueue = fs.existsSync("citymarket-image-review-queue.json") ? fs.readFileSync("citymarket-image-review-queue.json") : null;
const originalHtml = fs.existsSync("citymarket-image-review.html") ? fs.readFileSync("citymarket-image-review.html") : null;
const originalOff = fs.existsSync("citymarket-openfoodfacts-search.json") ? fs.readFileSync("citymarket-openfoodfacts-search.json") : null;
const originalDiscovery = fs.existsSync("citymarket-image-discovery.json") ? fs.readFileSync("citymarket-image-discovery.json") : null;
fs.writeFileSync("citymarket-image-review-queue.json", JSON.stringify(queue));
const sample = queue.rows[0];
assert.ok(sample?.offerId, "Review queue must contain an offer");
fs.writeFileSync("citymarket-image-discovery.json", JSON.stringify({results:[{offerId:sample.offerId,page:"https://example.org/product",imageCandidates:["https://example.org/product-image.jpg"],identityEvidence:{eanPresentInHtml:true,structuredProductImageCount:1}}]}));
fs.writeFileSync("citymarket-openfoodfacts-search.json",JSON.stringify({results:[{offerId:sample.offerId,candidates:[{ean:"1234567890123",productName:"Testituote",imageCandidates:["https://example.org/openfoodfacts.jpg"]}]}]}));
try {
  execFileSync(process.execPath, ["scripts/citymarket/build-image-review-html.mjs"], { stdio: "pipe" });
  const html = fs.readFileSync("citymarket-image-review.html", "utf8");
  assert.match(html, /<input id="search"/);
  assert.match(html, /2 uutta kuvaehdokasta/);
  assert.match(html, /<img loading="lazy" referrerpolicy="no-referrer" src="https:\/\/example.org\/product-image.jpg" alt="Löydetty kuvaehdokas, tarkistamatta">/);
  assert.match(html, /class="candidate"/);
  assert.match(html, /EAN löytyi lähdesivulta/);
  assert.match(html, /rakenteinen tuotekuva/);
  assert.match(html, /Open Food Facts – tarkistamaton hakutulos/);
  assert.match(html, /Testituote/);
  assert.match(html, /1234567890123/);
  assert.ok(html.includes("https://example.org/openfoodfacts.jpg"));
  const articles = html.split("<article data-page=").slice(1).map(part => part.split("</article>")[0]);
  assert.equal(articles.length,queue.missingImages);
  const candidateArticles=articles.filter(article=>article.includes("https://example.org/product-image.jpg"));
  assert.equal(candidateArticles.length,1,"Candidate image must appear in exactly one product card");
  assert.ok(candidateArticles[0].includes("2 uutta kuvaehdokasta"));
  assert.ok(candidateArticles[0].includes("Ei hyväksytty käyttöön"));
  assert.ok(!articles.filter(article=>article!==candidateArticles[0]).some(article=>article.includes("https://example.org/product-image.jpg")),"Candidate must not leak to other offers");
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
  for(const [name,original] of [["citymarket-openfoodfacts-search.json",originalOff],["citymarket-image-review-queue.json",originalQueue],["citymarket-image-review.html",originalHtml],["citymarket-image-discovery.json",originalDiscovery]]){
    if(original===null)fs.rmSync(name,{force:true});
    else fs.writeFileSync(name,original);
  }
}
