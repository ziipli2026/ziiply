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


// National coverage: inspect EVERY returned K-Market, with bounded concurrency.
// A publication ID is not evidence that its offer index has usable priced rows.
if (process.env.AUDIT_ALL_KMARKETS === "1") {
  const all = list(await data("stores", { businessId, pagination: { offset: 0, limit: 1000 } }));
  const counts = { total: all.length, withCoordinates: 0, withActivePublication: 0, withIndexedOffers: 0, emptyIndex: 0, noActivePublication: 0, errors: 0 };
  const publicationCounts = new Map();
  const failures = [];
  const now = Date.now();
  let cursor = 0;
  async function worker() {
    while (cursor < all.length) {
      const store = all[cursor++];
      try {
        if (!store.coordinates || !store.id) { counts.noActivePublication++; continue; }
        counts.withCoordinates++;
        const fronts = list(await data("fronts", { businessIds:[businessId], localBusinessIds:[String(store.id)], coordinates:store.coordinates }));
        const pubs = fronts.flatMap(f => Array.isArray(f.publications) ? f.publications : []).filter(p => {
          const from = Date.parse(String(p.validFrom ?? "")), until = Date.parse(String(p.validUntil ?? ""));
          return Number.isFinite(from) && Number.isFinite(until) && from <= now && now <= until && p.id;
        });
        if (!pubs.length) { counts.noActivePublication++; continue; }
        counts.withActivePublication++;
        let found = false;
        for (const p of pubs) {
          const id = String(p.id);
          publicationCounts.set(id, (publicationCounts.get(id) ?? 0) + 1);
          const rows = list(await data("offers", { publicationIds:[id], sources:["publication","business_product"], pagination:{limit:1000,offset:0}, sort:["score_desc"] }));
          if (rows.some(r => String(r.publicationPublicId ?? "") === id && r.name && [r.appPrice,r.membershipPrice,r.price,r.fromPrice].some(v => Number(v) > 0))) found = true;
        }
        if (found) counts.withIndexedOffers++; else { counts.emptyIndex++; failures.push({ id:store.id, name:store.name, publications:pubs.map(p=>p.id), reason:"NO_PRICED_INDEX_OFFERS" }); }
      } catch(e) { counts.errors++; failures.push({ id:store.id, name:store.name, reason:String(e) }); }
    }
  }
  await Promise.all(Array.from({length:8}, () => worker()));
  console.log("NATIONAL_COUNTS", JSON.stringify(counts));
  console.log("NATIONAL_PUBLICATIONS", JSON.stringify([...publicationCounts].sort((a,b)=>b[1]-a[1]).slice(0,30)));
  console.log("NATIONAL_FAILURES", JSON.stringify(failures));
  if (counts.errors) process.exitCode = 1;
}
