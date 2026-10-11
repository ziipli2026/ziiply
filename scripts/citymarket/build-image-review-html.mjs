import fs from "node:fs";
import assert from "node:assert/strict";
const queue = JSON.parse(fs.readFileSync("citymarket-image-review-queue.json", "utf8"));
const probe = fs.existsSync("citymarket-image-probe.json") ? JSON.parse(fs.readFileSync("citymarket-image-probe.json", "utf8")) : { results: [] };
const probeById = new Map(probe.results.map(row => [row.offerId, row]));
const escape = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
assert.equal(queue.rows.length, queue.missingImages);
const cards = queue.rows.map(row => {
  const checked = probeById.get(row.offerId);
  const image = row.imageUrl && checked?.reachableImage
    ? '<img loading="lazy" referrerpolicy="no-referrer" src="' + escape(row.imageUrl) + '" alt="Unapproved image candidate">'
    : '<div class="placeholder">Ei tarkistettua kuvatiedostoa</div>';
  const source = row.productSourceUrl ? '<a target="_blank" rel="noopener noreferrer" href="' + escape(row.productSourceUrl) + '">Tuotetiedot</a>' : '';
  const evidence = row.imageEvidenceUrl ? '<a target="_blank" rel="noopener noreferrer" href="' + escape(row.imageEvidenceUrl) + '">Kuvan lähde</a>' : '';
  return '<article><div class="preview">' + image + '</div><div><small>Sivu ' + escape(row.page) + ' · ' + escape(row.reviewPriority) + '</small><h2>' + escape(row.identity) + '</h2><p>Haku: ' + escape(row.imageSearchQuery) + '</p><p>EAN: ' + escape(row.candidateEan || "ei vahvistettu") + '</p><p>Kuvalinkin tila: ' + escape(checked ? (checked.reachableImage ? "Teknisesti saavutettavissa" : checked.failureReason || "ei tavoitettu") : "ei tarkistettu") + '</p><p>' + source + ' ' + evidence + '</p><strong>Ei hyväksytty käyttöön</strong></div></article>';
}).join("\n");
const html = '<!doctype html><html lang="fi"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><title>Citymarket 41LV – kuvien tarkistus</title><style>body{font:16px system-ui,sans-serif;margin:2rem auto;max-width:1100px;padding:0 1rem;background:#f7f7f7;color:#222}article{display:grid;grid-template-columns:180px 1fr;gap:1rem;padding:1rem;margin:1rem 0;background:white;border:1px solid #ddd;border-radius:12px}.preview{width:180px;height:180px;display:grid;place-items:center;background:#eee}.preview img{max-width:100%;max-height:100%;object-fit:contain}.placeholder{color:#666;text-align:center}h2{font-size:1.1rem}small{color:#555}strong{color:#9a3412}a{margin-right:1rem}@media(max-width:580px){article{grid-template-columns:1fr}.preview{width:100%}}</style><h1>Citymarket 41LV – puuttuvat kuvat</h1><p>' + queue.existingImages + '/' + queue.totalOffers + ' kuvakytkentää valmiina. ' + queue.missingImages + ' tarjousta odottaa kuvaa. Näkymän kuvat ovat vain ehdokkaita, eivät hyväksyttyjä.</p>' + cards + '</html>';
fs.writeFileSync("citymarket-image-review.html", html);
console.log("Generated offline review HTML with " + queue.rows.length + " offers.");
