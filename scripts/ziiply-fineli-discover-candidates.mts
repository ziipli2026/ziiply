import { readFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
import { fineliRawProduceName } from "../src/app/api/ean-bank/fineliProduceMatcher";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required");
const sql = neon(url);
const foods = await sql`SELECT fineli_id,name_fi FROM public.ziiply_fineli_foods WHERE name_fi IN
 ('PORKKANA','SIPULI','VALKOSIPULI','KURKKU','TOMAATTI','PERUNA','BANAANI','OMENA','APPELSIINI','SITRUUNA','LIME','PÄÄRYNÄ')`;
// Ambiguous Fineli names must never silently select an arbitrary food.
const grouped = new Map<string, number[]>();
for (const f of foods) {
  const name = String(f.name_fi);
  grouped.set(name, [...(grouped.get(name) ?? []), Number(f.fineli_id)]);
}
const byName = new Map([...grouped].filter(([, ids]) => ids.length === 1).map(([name, ids]) => [name, ids[0]]));
const batchSize = 500;
let after = "", scanned = 0, eligible = 0, inserted = 0, pages = 0;
for (;;) {
  const products = await sql`
    SELECT e.ean,e.name,e.brand FROM public.ziiply_ean_products e
    WHERE e.ean > ${after}
      AND NOT EXISTS (SELECT 1 FROM public.ziiply_ean_fineli_matches m WHERE m.ean=e.ean)
      AND NOT EXISTS (SELECT 1 FROM public.ziiply_off_nutrition o WHERE o.ean=e.ean)
    ORDER BY e.ean LIMIT ${batchSize}
  `;
  if (!products.length) break;
  after = String(products[products.length - 1].ean);
  scanned += products.length;
  pages++;
  const candidates = products.flatMap(p => {
    const name = fineliRawProduceName(String(p.name || ""), p.brand == null ? null : String(p.brand));
    const id = name ? byName.get(name) : undefined;
    return id == null ? [] : [{
      ean: String(p.ean), fineli_id: id,
      evidence: { productName: p.name, brand: p.brand, fineliName: name,
        rule: "guarded raw produce name; manual review required" },
    }];
  });
  eligible += candidates.length;
  if (!candidates.length) continue;
  const result = await sql`
    INSERT INTO public.ziiply_ean_fineli_candidates(ean,fineli_id,method,confidence,status,evidence)
    SELECT c.ean,c.fineli_id,'raw_produce_matcher','review_required','pending',c.evidence
    FROM jsonb_to_recordset(${JSON.stringify(candidates)}::jsonb)
      AS c(ean text,fineli_id integer,evidence jsonb)
    WHERE NOT EXISTS (SELECT 1 FROM public.ziiply_ean_fineli_matches m WHERE m.ean=c.ean)
      AND NOT EXISTS (SELECT 1 FROM public.ziiply_off_nutrition o WHERE o.ean=c.ean)
    ON CONFLICT(ean,fineli_id) DO NOTHING RETURNING ean
  `;
  inserted += result.length;
}
console.log(JSON.stringify({scanned,eligible,inserted,pages,batchSize,pendingReview:true,autoApproved:0}));

const discoveryFiles = ["fineli-raw-vegetable-candidates.sql","fineli-fresh-berry-candidates.sql","fineli-fresh-fruit-fungi-candidates.sql","fineli-stone-fruit-candidates.sql","fineli-fresh-herb-candidates.sql"];
let nextFile = 0;
const groupResults: { file: string; eligible: number; inserted: number }[] = [];
const groupFailures: string[] = [];
await Promise.all(Array.from({ length: 3 }, async () => {
  for (;;) {
    const file = discoveryFiles[nextFile++];
    if (!file) return;
    try {
      const query = await readFile(new URL("./sql/" + file, import.meta.url), "utf8");
      const rows = await sql.query(query);
      let groupInserted = 0;
      for (let offset = 0; offset < rows.length; offset += batchSize) {
        const payload = rows.slice(offset, offset + batchSize).map(p => ({
          ean: String(p.ean), fineli_id: Number(p.fineli_id),
          evidence: { productName: p.name, brand: p.brand, fineliName: p.name_fi,
            ruleFile: file, rule: "group discovery; manual review required" },
        }));
        const saved = await sql`
          INSERT INTO public.ziiply_ean_fineli_candidates(ean,fineli_id,method,confidence,status,evidence)
          SELECT c.ean,c.fineli_id,'parallel_group_discovery','review_required','pending',c.evidence
          FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb)
            AS c(ean text,fineli_id integer,evidence jsonb)
          JOIN public.ziiply_fineli_foods f ON f.fineli_id=c.fineli_id
          WHERE NOT EXISTS(SELECT 1 FROM public.ziiply_ean_fineli_matches m WHERE m.ean=c.ean)
            AND NOT EXISTS(SELECT 1 FROM public.ziiply_off_nutrition o WHERE o.ean=c.ean)
          ON CONFLICT(ean,fineli_id) DO NOTHING RETURNING ean
        `;
        groupInserted += saved.length;
      }
      groupResults.push({ file, eligible: rows.length, inserted: groupInserted });
    } catch (error) {
      groupFailures.push(file + ": " + (error instanceof Error ? error.message : String(error)));
    }
  }
}));
console.log(JSON.stringify({ groups: groupResults, failures: groupFailures, concurrency: 3, batchSize, autoApproved: 0 }));
if (groupFailures.length) throw new Error("Fineli group discovery failed: " + groupFailures.join("; "));
