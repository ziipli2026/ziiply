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
  { category: "plain_oat_flakes", pattern: /^(?:pirkka |coop |xtra |kotimaista |myllärin |elovena )?(?:luomu )?(?:iso |pieni |pikainen )?kaurahiutale(?:et)?(?: luomu)?$/i, fineliId: 153 },
  { category: "plain_honey", pattern: /^(?:pirkka |coop |xtra |kotimaista )?(?:suomalainen |luomu |juokseva )?hunaja(?: luomu)?$/i, fineliId: 4 },
  { category: "plain_onion", pattern: /^(?:pirkka |coop |xtra |kotimaista )?(?:suomalainen |luomu |keltainen )?sipuli(?: luomu)?$/i, fineliId: 335 },
  { category: "plain_cucumber", pattern: /^(?:pirkka |coop |xtra |kotimaista )?(?:suomalainen |luomu )?kurkku(?: luomu)?$/i, fineliId: 346 },
  { category: "plain_tomato", pattern: /^(?:pirkka |coop |xtra |kotimaista )?(?:suomalainen |luomu )?tomaatti(?: luomu)?$/i, fineliId: 352 },
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
    const cleaned = unbranded.replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l|kpl|pkt|pss)\b/gi, " ").replace(/\b(?:suomi|kotimainen|kotimaiset|pakattu|pakkaus)\b/gi, " ").replace(/\s+/g, " ").trim();
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

// Category-first retrieval: produce a bounded set of human-review candidates
// from product and Fineli descriptions, not only exact brand-specific patterns.
// The name comparison is deliberately token-based and excludes generic food words.
const categoryStopwords = new Set(["luomu","suomalainen","kotimainen","pirkka","coop","xtra",
  "kotimaista","tuore","pakattu","pakaste","pala","viipale","hieno","iso","pieni",
  "ruoka","tuote","valmis","suola","sokeri",
  "ja","tai","sekä","the","original","classic","premium"]);
const tokenizeCategory = (value: string) => String(value ?? "").toLowerCase()
  .replace(/[0-9]+(?:[.,][0-9]+)?[ ]*(?:kg|g|ml|l|kpl|pkt|pss)\b/gi, " ")
  .replace(/[^a-zåäö]+/gi, " ").split(" ")
  .filter(token => token.length >= 4 && !categoryStopwords.has(token));
const fineliDescriptions = await sql`
  SELECT fineli_id,name_fi FROM public.ziiply_fineli_foods
  WHERE name_fi IS NOT NULL ORDER BY fineli_id
`;
const tokenIndex = new Map<string, Array<{ id: number; name: string; tokens: string[] }>>();
for (const food of fineliDescriptions) {
  const name = String(food.name_fi);
  // Fineli has corrupted UTF-8 in some names; skip those rather than guess.
  if (name.includes("�")) continue;
  const tokens = [...new Set(tokenizeCategory(name))];
  if (tokens.length === 0 || tokens.length > 5) continue;
  const entry = { id: Number(food.fineli_id), name, tokens };
  for (const token of tokens) tokenIndex.set(token, [...(tokenIndex.get(token) ?? []), entry]);
}
let categoryAfter = "", categoryScanned = 0, categoryEligible = 0, categoryInserted = 0;
for (;;) {
  const page = await sql`
    SELECT e.ean,e.name,e.brand FROM public.ziiply_ean_products e
    WHERE e.ean > ${categoryAfter}
      AND NOT EXISTS (SELECT 1 FROM public.ziiply_ean_fineli_matches m WHERE m.ean=e.ean)
      AND NOT EXISTS (SELECT 1 FROM public.ziiply_off_nutrition o WHERE o.ean=e.ean)
    ORDER BY e.ean LIMIT ${batchSize}
  `;
  if (!page.length) break;
  categoryAfter = String(page[page.length - 1].ean);
  categoryScanned += page.length;
  const proposed = page.flatMap(product => {
    const name = String(product.name ?? "");
    const brand = String(product.brand ?? "").trim();
    const unbranded = brand && name.toLowerCase().startsWith(brand.toLowerCase() + " ")
      ? name.slice(brand.length + 1) : name;
    const tokens = [...new Set(tokenizeCategory(unbranded))];
    if (!tokens.length) return [];
    const hits = new Map<number,{ id: number; name: string; tokens: string[] }>();
    for (const token of tokens) {
      for (const entry of tokenIndex.get(token) ?? []) hits.set(entry.id,entry);
    }
    // Exact distinctive token overlap: suggest, never auto-approve. Skip
    // single-word overlap against multi-ingredient/recipe Fineli foods.
    // Block unsafe ingredient-only and nutrition-incompatible suggestions.
    // A broad token overlap is insufficient evidence for a finished food.
    // Conservative review-only discovery: exclude pet foods, multi-ingredient
    // products and nutritional variants that token overlap cannot establish.
    const unsafeProduct = /(?:koiran|koiralle|kissan|kissalle|lemmik|koirille|kissoille|koiran|koiralle|kissan|kissalle|lemmik|juustokastik|juustoperun|levite|tuorejuusto|monivilja|quinoa|seos|sekoitus|jogurtti|rahka|vanukas|patukka|nuudeli|keitto|salaatti|pizza|ateria|kastike|long drink|suklaa|täytteinen|maustettu|lihapiirakka|pasteija)/i.test(unbranded);
    if (unsafeProduct) return [];
    const preparationTerms = ["paistettu","keitetty","kypsennetty","savustettu","kuivattu","pakaste","kuorittu","jauhettu"];
    const prep = (s: string) => preparationTerms.filter(term => s.toLowerCase().includes(term));
    const productPrep = prep(unbranded);
    const containsDifferentPreparation = (foodName: string) =>
      prep(foodName).some(term => !productPrep.includes(term));
    const foodIsPet = /(?:koiran|koiralle|kissan|kissalle|lemmik)/i;
    const productIsGlutenFree = /gluteeniton/i.test(unbranded);
    const productIsLactoseFree = /laktoositon/i.test(unbranded);
    const productIsFatFree = /rasvaton/i.test(unbranded);
    const productIsLight = /(?:kevyt|light)/i.test(unbranded);
    const productIsUnsweetened = /(?:makeuttamaton|sokeroimaton)/i.test(unbranded);
    // Species blend ratios (50%/50%) are not fat percentages.
    const withoutBlendRatio = unbranded.replace(/\b\d+(?:[.,]\d+)?\s*%\s*\/\s*\d+(?:[.,]\d+)?\s*%/g, "");
    const productFat = withoutBlendRatio.match(/(\d+(?:[.,]\d+)?)\s*%/);
    const fatMismatch = (foodName: string) => {
      const fineliFat = foodName.match(/RASVAA\s*(\d+(?:[.,]\d+)?)\s*%/i);
      if (/RASVATON/i.test(foodName) && productFat && Number(productFat[1].replace(",",".")) > 0.5) return true;
      if (/RASVATON/i.test(unbranded) && fineliFat && Number(fineliFat[1].replace(",",".")) > 0.5) return true;
      if (productFat && fineliFat) return Math.abs(Number(productFat[1].replace(",","."))-Number(fineliFat[1].replace(",","."))) > 0.1;
      return false;
    };
    // Generic Fineli mince descriptions cannot verify an explicitly labelled fat percentage.
    const unverifiedMinceFat = (foodName: string) => /jauheliha/i.test(unbranded) && productFat && !/rasvaa\s*\d+(?:[.,]\d+)?\s*%/i.test(foodName);
    // Exclude category mismatches before writing pending proposals.
    const incompatibleCategory = (foodName: string) => {
      const p = unbranded.toLowerCase();
      const f = foodName.toLowerCase();
      if (/gluteeniton/.test(p) && !/gluteeniton/.test(f)) return true;
      if (/laktoositon/.test(p) && !/laktoositon/.test(f)) return true;
      if (/rasvaton/.test(p) && !/rasvaton/.test(f)) return true;
      if (/kevyt/.test(p) && /rasvaton/.test(f)) return true;
      return false;
    };
    const ranked = [...hits.values()].map(entry => {
      const overlap = entry.tokens.filter(t => tokens.includes(t)).length;
      return { ...entry, overlap, coverage: overlap / entry.tokens.length };
    }).filter(entry => entry.overlap >= 2 && entry.coverage >= 0.75 && (!productIsFatFree || /rasvaton/i.test(entry.name)) && (!productIsLight || /(?:kevyt|light)/i.test(entry.name)) && (!productIsUnsweetened || /(?:makeuttamaton|sokeroimaton)/i.test(entry.name)) && !containsDifferentPreparation(entry.name) && !foodIsPet.test(entry.name) && !fatMismatch(entry.name) && !unverifiedMinceFat(entry.name) && !incompatibleCategory(entry.name) && (!productIsGlutenFree || /gluteeniton|luontaisesti gluteeniton/i.test(entry.name)) && (!productIsLactoseFree || /laktoositon/i.test(entry.name)))
      .sort((a,b) => b.overlap-a.overlap || b.coverage-a.coverage || a.id-b.id)
      .slice(0,2);
    return ranked.map(entry => ({ ean: String(product.ean), fineli_id: entry.id,
      evidence: { productName: name, brand: product.brand, fineliName: entry.name,
        method: "category_token_overlap", sharedTokens: entry.overlap,
        coverage: entry.coverage, rule: "review ingredient, preparation and nutrient basis" } }));
  });
  categoryEligible += proposed.length;
  for (let i = 0; i < proposed.length; i += batchSize) {
    const saved = await sql`
      INSERT INTO public.ziiply_ean_fineli_candidates(ean,fineli_id,method,confidence,status,evidence)
      SELECT c.ean,c.fineli_id,'category_token_overlap','review_required','pending',c.evidence
      FROM jsonb_to_recordset(${JSON.stringify(proposed.slice(i,i+batchSize))}::jsonb)
        AS c(ean text,fineli_id integer,evidence jsonb)
      WHERE NOT EXISTS (SELECT 1 FROM public.ziiply_ean_fineli_matches m WHERE m.ean=c.ean)
        AND NOT EXISTS (SELECT 1 FROM public.ziiply_off_nutrition o WHERE o.ean=c.ean)
      ON CONFLICT(ean,fineli_id) DO NOTHING RETURNING ean
    `;
    categoryInserted += saved.length;
  }
}
console.log(JSON.stringify({ mode:"category_token_overlap", scanned:categoryScanned,
  eligible:categoryEligible, inserted:categoryInserted, autoApproved:0 }));
console.log(JSON.stringify({ mode: "broad_category_discovery", scanned: broadScanned,
  eligible: broadEligible, inserted: broadInserted, pages: broadPages,
  categories: broadRules.length, autoApproved: 0 }));
