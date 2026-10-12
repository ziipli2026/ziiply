import fs from "node:fs";
import assert from "node:assert/strict";
const queue = JSON.parse(fs.readFileSync("citymarket-image-review-queue.json", "utf8"));
const probe = fs.existsSync("citymarket-image-probe.json") ? JSON.parse(fs.readFileSync("citymarket-image-probe.json", "utf8")) : { results: [] };
const probeById = new Map(probe.results.map(row => [row.offerId, row]));
const discovery = fs.existsSync("citymarket-image-discovery.json") ? JSON.parse(fs.readFileSync("citymarket-image-discovery.json","utf8")) : { results: [] };
const discoveredById = new Map();
for(const result of discovery.results ?? []){
  if(!result.offerId || !Array.isArray(result.imageCandidates))continue;
  const existing=discoveredById.get(result.offerId)??[];
  for(const url of result.imageCandidates){
    if(typeof url!=="string" || !url.startsWith("https://") || existing.some(item=>item.url===url))continue;
    existing.push({url,source:result.page,eanPresentInHtml:result.identityEvidence?.eanPresentInHtml===true,structuredProductImageCount:result.identityEvidence?.structuredProductImageCount??0});
  }
  discoveredById.set(result.offerId,existing);
}
// Include both bulk Open Food Facts searches in the same visual review gallery.
for (const file of ["citymarket-openfoodfacts-discovery.json", "citymarket-openfoodfacts-search.json"]) {
  if (!fs.existsSync(file)) continue;
  const report = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const result of report.results ?? []) {
    if (!result.offerId) continue;
    const existing = discoveredById.get(result.offerId) ?? [];
    const products = result.candidates ?? [result];
    for (const product of products) {
      for (const url of product.imageCandidates ?? []) {
        if (typeof url !== "string" || !url.startsWith("https://") || existing.some(item => item.url === url)) continue;
        existing.push({
          url,
          source: result.sourceUrl ?? "https://world.openfoodfacts.org/product/" + encodeURIComponent(product.ean ?? result.ean ?? ""),
          eanPresentInHtml: Boolean(result.ean && product.ean === result.ean),
          structuredProductImageCount: 0,
          origin: "Open Food Facts – tarkistamaton hakutulos",
          productName: product.productName ?? result.productName ?? "",
          productEan: product.ean ?? result.ean ?? ""
        });
      }
    }
    discoveredById.set(result.offerId, existing);
  }
}
const escape = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
assert.equal(queue.rows.length, queue.missingImages);
const cards = queue.rows.map(row => {
  const checked = probeById.get(row.offerId);
  const image = row.imageUrl && checked?.reachableImage
    ? '<img loading="lazy" referrerpolicy="no-referrer" src="' + escape(row.imageUrl) + '" alt="Unapproved image candidate">'
    : '<div class="placeholder">Ei tarkistettua kuvatiedostoa</div>';
  const discovered = discoveredById.get(row.offerId) ?? [];
  const discoveredHtml = discovered.length
    ? '<details><summary>' + discovered.length + ' uutta kuvaehdokasta (ei hyväksytty)</summary>' + discovered.map(item=>'<div class="candidate"><small>'+escape(item.origin ? item.origin + ' · ' + item.productName + ' · EAN ' + item.productEan + ' · ' : '') + (item.eanPresentInHtml ? 'EAN löytyi lähdesivulta' : 'EAN ei vahvistunut lähdesivulta') + (item.structuredProductImageCount ? ' · rakenteinen tuotekuva' : ' · sivun esikatselukuva') + '</small><img loading="lazy" referrerpolicy="no-referrer" src="'+escape(item.url)+'" alt="Löydetty kuvaehdokas, tarkistamatta"><p><a target="_blank" rel="noopener noreferrer" href="'+escape(item.url)+'">Avaa kuvaehdokas</a> <a target="_blank" rel="noopener noreferrer" href="'+escape(item.source)+'">Lähdesivu</a></p></div>').join("") + '</details>'
    : '';
  const source = row.productSourceUrl ? '<a target="_blank" rel="noopener noreferrer" href="' + escape(row.productSourceUrl) + '">Tuotetiedot</a>' : '';
  const evidence = row.imageEvidenceUrl ? '<a target="_blank" rel="noopener noreferrer" href="' + escape(row.imageEvidenceUrl) + '">Kuvan lähde</a>' : '';
  return '<article data-page="' + escape(row.page) + '" data-status="' + (checked?.reachableImage ? 'reachable' : row.imageUrl ? 'failed' : 'missing') + '"><div class="preview">' + image + '</div><div><small>Sivu ' + escape(row.page) + ' · ' + escape(row.reviewPriority) + '</small><h2>' + escape(row.identity) + '</h2><p>Haku: ' + escape(row.imageSearchQuery) + '</p><p>EAN: ' + escape(row.candidateEan || "ei vahvistettu") + '</p><p>Kuvalinkin tila: ' + escape(checked ? (checked.reachableImage ? "Teknisesti saavutettavissa" : checked.failureReason || "ei tavoitettu") : "ei tarkistettu") + '</p><p>' + source + ' ' + evidence + '</p>' + discoveredHtml + '<strong>Ei hyväksytty käyttöön</strong></div></article>';
}).join("\n");
const controls = '<div class="filters"><label>Hae tuotetta <input id="search" type="search" placeholder="Tuote, EAN tai sivu"></label><label>Kuvatila <select id="status"><option value="">Kaikki</option><option value="reachable">Kuvalinkki toimii</option><option value="failed">Kuvalinkki ei toimi</option><option value="missing">Ei kuvalinkkiä</option></select></label><output id="count"></output></div>';
const script = '<script>const cards=[...document.querySelectorAll("article")];const search=document.querySelector("#search");const status=document.querySelector("#status");const count=document.querySelector("#count");function update(){const q=search.value.toLocaleLowerCase("fi").trim();let shown=0;for(const card of cards){const match=(!q||card.textContent.toLocaleLowerCase("fi").includes(q))&&(!status.value||card.dataset.status===status.value);card.hidden=!match;if(match)shown++}count.textContent=shown+" / "+cards.length+" tarjousta"}search.addEventListener("input",update);status.addEventListener("change",update);update()</script>';
const html = '<!doctype html><html lang="fi"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>Citymarket 41LV – kuvien tarkistus</title><style>body{font:16px system-ui,sans-serif;margin:2rem auto;max-width:1100px;padding:0 1rem;background:#f7f7f7;color:#222}article[hidden]{display:none}.filters{display:flex;flex-wrap:wrap;align-items:end;gap:1rem;padding:1rem;background:white;border:1px solid #ddd;border-radius:12px}.filters label{display:grid;gap:.3rem}.filters input,.filters select{font:inherit;padding:.5rem}article{display:grid;grid-template-columns:180px 1fr;gap:1rem;padding:1rem;margin:1rem 0;background:white;border:1px solid #ddd;border-radius:12px}.preview{width:180px;height:180px;display:grid;place-items:center;background:#eee}.preview img{max-width:100%;max-height:100%;object-fit:contain}.placeholder{color:#666;text-align:center}h2{font-size:1.1rem}.candidate{display:inline-block;vertical-align:top;max-width:180px;margin:.5rem;padding:.5rem;border:1px solid #ddd}.candidate img{display:block;max-width:160px;max-height:160px;object-fit:contain}small{color:#555}strong{color:#9a3412}a{margin-right:1rem}@media(max-width:580px){article{grid-template-columns:1fr}.preview{width:100%}}</style><h1>Citymarket 41LV – puuttuvat kuvat</h1><p>' + queue.existingImages + '/' + queue.totalOffers + ' kuvakytkentää valmiina. ' + queue.missingImages + ' tarjousta odottaa kuvaa. Näkymän kuvat ovat vain ehdokkaita, eivät hyväksyttyjä.</p>' + controls + cards + script + '</html>';
fs.writeFileSync("citymarket-image-review.html", html);
console.log("Generated offline review HTML with " + queue.rows.length + " offers.");
