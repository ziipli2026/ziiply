import { neon } from '@neondatabase/serverless';
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required');
const sql = neon(url);
const rows = await sql`
  SELECT ean,fineli_id,evidence->>'productName' AS product_name,
         evidence->>'fineliName' AS fineli_name
  FROM public.ziiply_ean_fineli_candidates
  WHERE method='category_token_overlap' AND status='pending'
  ORDER BY ean,fineli_id
`;
// Nutrition is attached as read-only evidence, never as an approval decision.
const nutrientRows = await sql`
  SELECT c.ean, c.fineli_id, f.nutrients
  FROM public.ziiply_ean_fineli_candidates c
  LEFT JOIN public.ziiply_fineli_foods f ON f.fineli_id = c.fineli_id
  WHERE c.method='category_token_overlap' AND c.status='pending'
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
const reviewPriority = (product: string, food: string, decision: string): string => {
  if (decision !== 'MANUAL_REVIEW') return decision;
  const p = product.toLowerCase(), f = food.toLowerCase();
  const categories: Array<[string, RegExp]> = [
    ['PRODUCE', /omena|banaani|porkkana|peruna|sipuli|valkosipuli|kurkku|tomaatti|paprika|appelsiini|sitruuna|lime|päärynä|marja|mansikka|mustikka|vadelma/],
    ['FISH', /siika|lohi|kirjolohi|silakka|ahven|kuha|seiti|turska/],
    ['MEAT', /nauta|sika|broileri|kana|kalkkuna|maksa|jauheliha/],
    ['GRAINS', /kaura|vehnä|ruis|ohra|riisi|jauho|hiutale|suurimo/],
    ['DAIRY', /maito|kerma|jogurtti|viili|rahka|juusto|voi/],
  ];
  const matched = categories.filter(([,pattern]) => pattern.test(p) && pattern.test(f)).map(([name])=>name);
  // Category matches are routing hints, not evidence that nutrients are interchangeable.
  if (matched.length !== 1) return 'COMPOSITION_REVIEW';
  const category = matched[0];
  const multiIngredient = /kastike|ateria|valmis|täyte|seos|sekoitus|pizza|pitsa|pinsa|keitto|salaatti|piirakka|pata|muhennos|leipä|makkara|maustettu|marinoitu/;
  if (multiIngredient.test(p) || multiIngredient.test(f)) return 'COMPOSITION_REVIEW';
  return 'CATEGORY_' + category + '_REVIEW';
};
const needsVerification = new Set(['mince_fat_percentage_unverified','light_vs_fat_free','dairy_fat_percentage_unverified']);
let flagged=0;
let conflicts=0;
let verifyOnly=0;
const review = rows.map(r=>{
  const product=String(r.product_name??'').toLowerCase();
  const food=String(r.fineli_name??'').toLowerCase();
  const issues=flags(product,food);
  if(issues.length) flagged++;
  const conflict=issues.some(issue=>!needsVerification.has(issue));
  if(conflict) conflicts++;
  else if(issues.length) verifyOnly++;
  return {ean:r.ean,fineli_id:r.fineli_id,product:r.product_name,fineli:r.fineli_name,issues,decision:conflict?'CONFLICT_REVIEW':issues.length?'VERIFY_NUTRITION':'MANUAL_REVIEW',priority:reviewPriority(product,food,conflict?'CONFLICT_REVIEW':issues.length?'VERIFY_NUTRITION':'MANUAL_REVIEW'),fineli_nutrients:nutrientByPair.get(String(r.ean)+'|'+String(r.fineli_id)) ?? null};
});
console.log(JSON.stringify({mode:'read_only_pending_audit',total:review.length,flagged,conflicts,verify_nutrition:verifyOnly,manual_review:review.length-flagged,modified:0}));
for(const row of review) console.log(JSON.stringify(row));
