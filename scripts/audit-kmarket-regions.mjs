// Read-only K-Market regional publication audit. Run: node scripts/audit-kmarket-regions.mjs
// Never infer coverage from the store name printed on a leaflet or offer counts.
const origin = "https://etarjouslehdet.fi";
const businessId = "9c56Y8";
const stores = [
  { label: "Sulkava / Wiljami", name: "Wiljami" },
  { label: "Helsinki / comparison", name: "Hämis" },
];
const encode = v => Buffer.from(JSON.stringify(v, (_k, x) =>
  x && typeof x === "object" && !Array.isArray(x)
    ? Object.fromEntries(Object.entries(x).sort(([a],[b]) => a.localeCompare(b)))
    : x)).toString("base64");
async function data(name, params) {
  const key = encode([name, params]);
  const response = await fetch(origin + "/", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/plain, */*", referer: origin + "/K-Market" },
    body: JSON.stringify({ data: [key] }),
  });
  if (!response.ok) throw new Error(name + ": HTTP " + response.status);
  const lines = (await response.text()).split(/\r?\n/);
  for (const line of lines) {
    try { const row = JSON.parse(line); if (row.key === key) return row.value; } catch {}
  }
  throw new Error(name + ": response did not contain requested key");
}
const list = x => Array.isArray(x?.data) ? x.data : Array.isArray(x) ? x : [];
const norm = s => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const summary = p => ({ id: p.id, label: p.label, from: p.validFrom, until: p.validUntil });
try {
  const all = list(await data("stores", { businessId, pagination: { offset: 0, limit: 1000 } }));
  console.log("STORE_COUNT", all.length);
  for (const target of stores) {
    const matches = all.filter(s => norm(s.name).includes(norm(target.name)));
    console.log("STORE_MATCH", JSON.stringify({ label: target.label, matches: matches.map(s => ({ id:s.id, name:s.name, city:s.city })) }));
    for (const s of matches) {
      if (!s.coordinates) { console.log("NO_COORDINATES", s.id); continue; }
      const fronts = list(await data("fronts", { businessIds:[businessId], localBusinessIds:[String(s.id)], coordinates:s.coordinates }));
      const pubs = fronts.flatMap(f => Array.isArray(f.publications) ? f.publications : []);
      console.log("STORE_PUBLICATIONS", JSON.stringify({ store:s.name, id:s.id, publications:pubs.map(summary) }));
    }
  }
  const offers = list(await data("offers", { businessIds:[businessId], sources:["publication","business_product"], pagination:{limit:1000,offset:0}, sort:["score_desc"] }));
  const byPublication = new Map();
  for (const o of offers) {
    const id = String(o.publicationPublicId ?? "");
    if (!id) continue;
    const a = byPublication.get(id) ?? [];
    a.push({ id:o.publicId, name:o.name, price:o.price, validFrom:o.validFrom, validUntil:o.validUntil });
    byPublication.set(id,a);
  }
  console.log("CHAIN_PUBLICATIONS", JSON.stringify([...byPublication].map(([id, rows]) => ({ id, count:rows.length, sample:rows.slice(0,5) }))));
  console.log("AUDIT_DONE", JSON.stringify({ storeCount:all.length, offers:offers.length, publicationCount:byPublication.size }));
} catch (e) { console.error("AUDIT_FAILED", e instanceof Error ? e.message : String(e)); process.exitCode=1; }
