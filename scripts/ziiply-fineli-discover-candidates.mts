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

const discoveryFiles = ["fineli-raw-vegetable-candidates.sql","fineli-fresh-berry-candidates.sql","fineli-fresh-fruit-fungi-candidates.sql","fineli-stone-fruit-candidates.sql","fineli-fresh-herb-candidates.sql","fineli-nuts-candidates.sql","fineli-seeds-candidates.sql","fineli-grains-candidates.sql","fineli-pantry-candidates.sql"];
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


// Broad, review-only category discovery. Scan the entire uncovered EAN register
// in bounded pages, and never publish a nutrition match without review.
const broadRules: Array<{ category: string; pattern: RegExp; fineliId: number }> = [
  { category: "plain_dry_pasta", pattern: /^(?:pirkka |coop |xtra |k-menu |myllärin |sunnuntai )?(?:luomu )?(?:fusilli|spaghetti|penne|makaroni|pasta)(?: luomu)?$/i, fineliId: 117 },
  { category: "raw_potato", pattern: /^(?:pirkka |coop |xtra |kotimaista )?(?:suomalainen )?(?:jauhoinen |kiinteä )?peruna(?: 1lk)?$/i, fineliId: 205 },
  { category: "cane_sugar", pattern: /^(?:pirkka |coop |xtra |dansukker )?(?:tumma |vaalea )?(?:muscovado )?ruokosokeri$/i, fineliId: 1 },
  { category: "plain_carrot", pattern: /^(?:pirkka |coop |xtra |kotimaista )?(?:suomalainen |luomu )?porkkana(?:nippu pakattu)?$/i, fineliId: 300 },
  { category: "plain_sugar", pattern: /^(?:pirkka |coop |xtra |dansukker )?(?:hieno |talous )?sokeri$/i, fineliId: 1 },
];
const broadFineliIds = [...new Set(broadRules.map(rule => rule.fineliId))];
const availableFineli = await sql`SELECT fineli_id FROM public.ziiply_fineli_foods WHERE fineli_id = ANY(${broadFineliIds})`;
const availableIds = new Set(availableFineli.map(row => Number(row.fineli_id)));
let broadAfter = "", broadScanned = 0, broadEligible = 0, broadInserted = 0, broadPages = 0;
for (;;) {
  const page = await sql`
    SELECT e.ean,e.name,e.brand FROM public.ziiply_ean_products e
    WHERE e.ean > ${broadAfter}
      AND NOT EXISTS (SELECT 1 FROM public.ziiply_ean_fineli_matches m WHERE m.ean=e.ean)
      AND NOT EXISTS (SELECT 1 FROM public.ziiply_off_nutrition o WHERE o.ean=e.ean)
    ORDER BY e.ean LIMIT ${batchSize}
  `;
  if (!page.length) break;
  broadAfter = String(page[page.length - 1].ean);
  broadScanned += page.length;
  broadPages++;
  const proposals = page.flatMap(product => {
    const raw = String(product.name ?? "").toLowerCase().trim();
    const brand = String(product.brand ?? "").toLowerCase().trim();
    const unbranded = brand && raw.startsWith(brand + " ") ? raw.slice(brand.length + 1) : raw;
    const cleaned = unbranded.replace(/\\b\\d+(?:[.,]\\d+)?\\s*(?:kg|g)\\b/gi, " ").replace(/\\s+/g, " ").trim();
    const matching = broadRules.filter(rule => availableIds.has(rule.fineliId) && rule.pattern.test(cleaned));
    // Ambiguous category matches must not become candidates.
    if (matching.length !== 1) return [];
    const rule = matching[0];
    return [{ ean: String(product.ean), fineli_id: rule.fineliId,
      evidence: { productName: product.name, brand: product.brand, category: rule.category,
        rule: "broad strict category discovery; human review required" } }];
  });
  broadEligible += proposals.length;
  for (let i = 0; i < proposals.length; i += batchSize) {
    const payload = proposals.slice(i, i + batchSize);
    const saved = await sql`
      INSERT INTO public.ziiply_ean_fineli_candidates(ean,fineli_id,method,confidence,status,evidence)
      SELECT c.ean,c.fineli_id,'broad_category_discovery','review_required','pending',c.evidence
      FROM jsonb_to_recordset(${JSON.stringify(payload)}::jsonb)
        AS c(ean text,fineli_id integer,evidence jsonb)
      WHERE NOT EXISTS (SELECT 1 FROM public.ziiply_ean_fineli_matches m WHERE m.ean=c.ean)
        AND NOT EXISTS (SELECT 1 FROM public.ziiply_off_nutrition o WHERE o.ean=c.ean)
      ON CONFLICT(ean,fineli_id) DO NOTHING RETURNING ean
    `;
    broadInserted += saved.length;
  }
}
console.log(JSON.stringify({ mode: "broad_category_discovery", scanned: broadScanned,
  eligible: broadEligible, inserted: broadInserted, pages: broadPages,
  categories: broadRules.length, autoApproved: 0 }));
