import { neon } from '@neondatabase/serverless';
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const sql = neon(url);
const rows = await sql`
  SELECT ean,fineli_id,method,evidence->>'productName' AS product_name,
         evidence->>'fineliName' AS fineli_name
  FROM public.ziiply_ean_fineli_candidates
  WHERE status='pending'
  ORDER BY ean,fineli_id
`;
// Nutrition is attached as read-only evidence, never as an approval decision.
const nutrientRows = await sql`
  SELECT c.ean, c.fineli_id, f.nutrients
  FROM public.ziiply_ean_fineli_candidates c
  LEFT JOIN public.ziiply_fineli_foods f ON f.fineli_id = c.fineli_id
  WHERE c.status='pending'
`;
const nutrientByPair = new Map(nutrientRows.map(r => [String(r.ean)+'|'+String(r.fineli_id),r.nutrients ?? null]));
const unsafe = /(?:koiran|koiralle|koirille|kissan|kissalle|kissoille|lemmik|levite|tuorejuusto|monivilja|quinoa|nuudeli|long drink|suklaa|patukka|juustoperun)/i;
const preparation = ['paistettu','keitetty','kypsennetty','savustettu','kuivattu','pakaste','kuorittu','jauhettu'];
const flags = (product: string, food: string): string[] => {
  const issues: string[] = [];
  if (unsafe.test(product)) issues.push('product_category_mismatch');
  // A shared ingredient does not make a prepared Fineli dish equivalent to the product.
  const dish = /muhennos|pata|keitto|kastike|laatikko|pizza|piirakka|salaatti|puuro|kiusaus|gratiini|risotto|wokki|pihvi|pyörykkä/i;
  // Normalize Finnish pizza spelling; otherwise a matching pitsa is falsely flagged.
  const normalizedProduct = product.replace(/pitsa/g, 'pizza').replace(/pinsa/g, 'pizza');
  if (dish.test(food) && !dish.test(normalizedProduct)) issues.push('prepared_dish_vs_product');
  // A named ingredient cannot inherit nutrition from a prepared dish merely because
  // the dish mentions that ingredient (e.g. maitojuoma -> pannukakku).
  const preparedFood = /pannukakku|lettu|ohukainen|vohveli|kakku|muffinssi|pull[aä]|piirakka|pizza|pitsa|pata|keitto|kastike|laatikko|gratiini|kiusaus|risotto|puuro|muhennos|salaatti|wokki|pihvi|pyörykkä/i;
  const preparedProduct = /pannukakku|lettu|ohukainen|vohveli|kakku|muffinssi|pull[aä]|piirakka|pizza|pitsa|pata|keitto|kastike|laatikko|gratiini|kiusaus|risotto|puuro|muhennos|salaatti|wokki|pihvi|pyörykkä/i;
  if (preparedFood.test(food) && !preparedProduct.test(product) && !issues.includes('prepared_dish_vs_product'))
    issues.push('prepared_dish_vs_product');
  // Non-food merchandise must never be proposed for nutrition matching.
  if (/tuoksukynttil|tuoksutikku|tuoksulämpökynttil|pesuaine|shampoo|saippua|koiran|kissan|lemmik/i.test(product)) issues.push('non_food_product');
  if (/juustokastikkeella|juustoperunoilla/.test(product) && !/kastike|peruna/.test(food)) issues.push('prepared_meal_vs_ingredient');
  if (/gluteeniton/.test(product) && !/gluteeniton/.test(food)) issues.push('gluten_free_mismatch');
  if (/laktoositon/.test(product) && !/laktoositon/.test(food)) issues.push('lactose_free_mismatch');
  // Exclude species blend ratios before every fat-percentage comparison.
  const withoutBlendRatio = product.replace(/\b\d+(?:[.,]\d+)?\s*%\s*\/\s*\d+(?:[.,]\d+)?\s*%/g, '');
  const p = withoutBlendRatio.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (/rasvaton/.test(food) && p && Number(p[1].replace(',','.')) > 0.5) issues.push('fat_free_mismatch');
  for (const term of preparation) if (food.includes(term) && !product.includes(term) && !(term === 'pakaste' && /pakastekasvis/.test(food))) issues.push('preparation_'+term);
  for (const term of ['gluteeniton','laktoositon','rasvaton','makeuttamaton','sokeroimaton']) if (product.includes(term) && !food.includes(term)) issues.push('attribute_'+term);
  if (/kevyt/.test(product) && /rasvaton/.test(food)) issues.push('light_vs_fat_free');
  // Dairy subtypes must not be treated as interchangeable.
  const dairyTypes = ['jogurtti','viili','rahka','kerma','maito','juusto','voi'];
  const productType = dairyTypes.find(t => new RegExp('\\b' + t).test(product));
  const foodType = dairyTypes.find(t => new RegExp('\\b' + t).test(food));
  if (productType && foodType && productType !== foodType) issues.push('dairy_subtype_mismatch');
  if (productType && foodType && /laktoositon/.test(product) !== /laktoositon/.test(food)) issues.push('dairy_lactose_variant_mismatch');
  // Explicit dairy fat percentages require verification on both sides.
  // Generic percentages in unrelated products are intentionally excluded.
  if (productType && foodType) {
    const dairyFat = (s: string) => {
      const explicit = s.match(/rasvaa?\\s*(\\d+(?:[.,]\\d+)?)\\s*%/);
      const plain = s.match(/(?:^|\\s)(\\d+(?:[.,]\\d+)?)\\s*%/);
      const value = explicit?.[1] ?? plain?.[1];
      return value === undefined ? null : Number(value.replace(',','.'));
    };
    const productFat = dairyFat(product);
    const foodFat = dairyFat(food);
    if (productFat !== null && foodFat !== null && Math.abs(productFat - foodFat) > 0.1)
      issues.push('dairy_fat_percentage_mismatch');
    if (productFat !== null && foodFat === null)
      issues.push('dairy_fat_percentage_unverified');
  }
  // A ratio such as (50%/50%) describes meat species, not fat content.
  if (/jauheliha/.test(product) && /\d+(?:[.,]\d+)?\s*%/.test(withoutBlendRatio) && !/rasvaa\s*\d+(?:[.,]\d+)?\s*%/.test(food)) issues.push('mince_fat_percentage_unverified');
  const f = food.match(/rasvaa\s*(\d+(?:[.,]\d+)?)\s*%/);
  if (p && f && Math.abs(Number(p[1].replace(',','.'))-Number(f[1].replace(',','.'))) > 0.1) issues.push('fat_percentage_mismatch');
  return issues;
};
// Review-only priority tiers; these do not imply verified nutrition equivalence.
// Shared dairy detection for review routing and fat-coverage reporting.
const dairyProduct = (name: string): boolean => {
  const n = name.toLowerCase();
  if (/virvoitusjuoma|limonadi|juustonmakuinen|juuston makuinen|juustonmakuis|juustosipsi|juustonaksu|juustokeksi|juustopopcorn/.test(n)) return false;
  return /(?:^|[^a-zåäö])(?:maito[a-zåäö]*|kerma[a-zåäö]*|jogurtti[a-zåäö]*|viili[a-zåäö]*|rahka[a-zåäö]*|juusto[a-zåäö]*|raejuusto[a-zåäö]*|piimä[a-zåäö]*|voi)(?=$|[^a-zåäö])/.test(n);
};
const reviewPriority = (product: string, food: string, decision: string): string => {
  if (decision !== 'MANUAL_REVIEW') return decision;
  const p = product.toLowerCase(), f = food.toLowerCase();
  const categories: Array<[string, RegExp]> = [
    ['PRODUCE', /omena|banaani|porkkana|peruna|sipuli|valkosipuli|kurkku|tomaatti|paprika|appelsiini|sitruuna|lime|päärynä|marja|mansikka|mustikka|vadelma/],
    ['FISH', /siika|lohi|kirjolohi|silakka|ahven|kuha|seiti|turska/],
    ['MEAT', /nauta|sika|broileri|kana|kalkkuna|maksa|jauheliha/],
    ['GRAINS', /kaura|vehnä|ruis|ohra|riisi|jauho|hiutale|suurimo/],
    ['DAIRY', /(?:^|[^a-zåäö])(?:maito[a-zåäö]*|kerma[a-zåäö]*|jogurtti[a-zåäö]*|viili[a-zåäö]*|rahka[a-zåäö]*|juusto[a-zåäö]*|piimä[a-zåäö]*|voi)(?=$|[^a-zåäö])/],
  ];
  const matched = categories.filter(([name,pattern]) => name === 'DAIRY' ? dairyProduct(p) && dairyProduct(f) : pattern.test(p) && pattern.test(f)).map(([name])=>name);
  // Category matches are routing hints, not evidence that nutrients are interchangeable.
  if (matched.length !== 1) return 'COMPOSITION_REVIEW';
  const category = matched[0];
  const multiIngredient = /kastike|ateria|valmis|täyte|seos|sekoitus|pizza|pitsa|pinsa|keitto|salaatti|piirakka|pata|muhennos|leipä|makkara|maustettu|marinoitu/;
  if (multiIngredient.test(p) || multiIngredient.test(f)) return 'COMPOSITION_REVIEW';
  return 'CATEGORY_' + category + '_REVIEW';
};
// Batch triage: independently classify all remaining manual-review candidates.
// These labels are queues for human validation, never automatic approvals.
const reviewQueue = (product: string, food: string, decision: string): string => {
  if (decision !== 'MANUAL_REVIEW') return decision;
  const p = product.toLowerCase(), f = food.toLowerCase();
  if (/koiran|kissan|lemmik|pesuaine|shampoo|saippua|tuoksukynttil/.test(p)) return 'NON_FOOD_REVIEW';
  if (/laktoositon|gluteeniton|vegaaninen|maidoton|sokeriton|makeuttamaton|rasvaton/.test(p))
    return 'SPECIAL_DIET_REVIEW';
  if (/jauheliha|naudan|sian|broilerin|kanan|kalkkunan|kala|lohi|tonnikala/.test(p))
    return 'PROTEIN_TYPE_REVIEW';
  if (/öljy|margariini|rasva|voi/.test(p) && !/virvoitusjuoma/.test(p))
    return 'FAT_SOURCE_REVIEW';
  if (/pakaste|säilyke|kuivattu|jauhe|keitetty|paistettu|kypsennetty/.test(p) ||
      /pakaste|säilyke|kuivattu|jauhe|keitetty|paistettu|kypsennetty/.test(f))
    return 'PROCESSING_REVIEW';
  return 'GENERAL_COMPOSITION_REVIEW';
};
// Report diet-label agreement in bulk without approving any candidate.
const dietEvidence = (product: string, food: string): string[] => {
  const patterns: Array<[string, RegExp]> = [
    ['LACTOSE_FREE', /laktoositon/],
    ['GLUTEN_FREE', /gluteeniton/],
    ['MILK_FREE', /maidoton/],
    ['VEGAN', /vegaaninen|vegaani/],
    ['SUGAR_FREE', /sokeriton/],
    ['UNSWEETENED', /makeuttamaton/],
    ['FAT_FREE', /rasvaton/],
  ];
  return patterns.filter(([,re]) => re.test(product)).map(([label,re]) =>
    label + (re.test(food) ? '_LABEL_MATCH' : '_NOT_CONFIRMED'));
};
// Read-only nutrient sanity checks against explicit product labels.
const nutrientSanity = (product: string, nutrients: any): string[] => {
  const issues: string[] = [];
  if (!nutrients || typeof nutrients !== 'object') return ['fineli_nutrients_missing'];
  if (!dairyProduct(product)) return issues;
  const label = product.match(/(?:rasvaa?\s*)?(\d+(?:[.,]\d+)?)\s*%/i);
  if (!label) return issues;
  const fatValue = Number(nutrients.FAT?.value);
  if (!Number.isFinite(fatValue)) return issues;
  const expected = Number(label[1].replace(',','.'));
  if (Math.abs(expected - fatValue) > Math.max(0.5, expected * 0.15))
    issues.push('dairy_fat_nutrient_discrepancy');
  return issues;
};
// Report how often an actual dairy fat nutrient comparison was possible.
const dairyCoverage = (product: string, nutrients: any): string => {
  // A word boundary must be a regex escape (single backslash in source), not a literal backslash.
  // Avoid matching 'voi' inside 'virvoitusjuoma'.
  const isDairy = dairyProduct(product);
  if (!isDairy) return 'NOT_DAIRY';
  const label = product.match(/(?:rasvaa?\s*)?(\d+(?:[.,]\d+)?)\s*%/i);
  if (!label) return 'NO_PRODUCT_FAT_LABEL';
  const fat = nutrients?.FAT?.value;
  if (fat == null || !Number.isFinite(Number(fat))) return 'NO_FINELI_FAT_VALUE';
  return 'FAT_COMPARED';
};
const needsVerification = new Set(['mince_fat_percentage_unverified','light_vs_fat_free','dairy_fat_percentage_unverified','dairy_fat_nutrient_discrepancy','fineli_nutrients_missing']);
let flagged=0;
let conflicts=0;
let verifyOnly=0;
const review = rows.map(r=>{
  const product=String(r.product_name??'').toLowerCase();
  const food=String(r.fineli_name??'').toLowerCase();
  const nutrients=nutrientByPair.get(String(r.ean)+'|'+String(r.fineli_id)) ?? null;
  const issues=[...flags(product,food),...nutrientSanity(product,nutrients)];
  if(issues.length) flagged++;
  const conflict=issues.some(issue=>!needsVerification.has(issue));
  if(conflict) conflicts++;
  else if(issues.length) verifyOnly++;
  return {ean:r.ean,fineli_id:r.fineli_id,method:r.method,product:r.product_name,fineli:r.fineli_name,issues,decision:conflict?'CONFLICT_REVIEW':issues.length?'VERIFY_NUTRITION':'MANUAL_REVIEW',priority:reviewPriority(product,food,conflict?'CONFLICT_REVIEW':issues.length?'VERIFY_NUTRITION':'MANUAL_REVIEW'),review_queue:reviewQueue(product,food,conflict?'CONFLICT_REVIEW':issues.length?'VERIFY_NUTRITION':'MANUAL_REVIEW'),fineli_nutrients:nutrients,diet_evidence:dietEvidence(product,food),dairy_fat_coverage:dairyCoverage(product,nutrients)};
});
console.log(JSON.stringify({mode:'read_only_pending_audit',total:review.length,flagged,conflicts,verify_nutrition:verifyOnly,manual_review:review.length-flagged,modified:0}));
const dairyCoverageCounts = review.reduce((counts: Record<string,number>,row) => {
  counts[row.dairy_fat_coverage] = (counts[row.dairy_fat_coverage] ?? 0) + 1;
  return counts;
}, {});
console.log(JSON.stringify({mode:'dairy_fat_coverage',...dairyCoverageCounts}));
const queueCounts = review.reduce((counts: Record<string,number>,row) => { counts[row.review_queue] = (counts[row.review_queue] ?? 0) + 1; return counts; }, {});
console.log(JSON.stringify({mode:'manual_review_queues',...queueCounts}));
const dietCounts = review.reduce((acc: Record<string,number>,row) => {
  for(const key of row.diet_evidence) acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});
console.log(JSON.stringify({mode:'diet_evidence_coverage',...dietCounts}));
const methodCounts = review.reduce((acc: Record<string,number>,row) => {
  const key = String(row.method) + ':' + String(row.decision);
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});
console.log(JSON.stringify({mode:'all_pending_methods',...methodCounts}));
for(const row of review) console.log(JSON.stringify(row));
