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
const unsafe = /(?:koiran|koiralle|koirille|kissan|kissalle|kissoille|lemmik|levite|tuorejuusto|monivilja|quinoa|nuudeli|long drink|suklaa|patukka|juustoperun)/i;
const preparation = ['paistettu','keitetty','kypsennetty','savustettu','kuivattu','pakaste','kuorittu','jauhettu'];
const flags = (product, food) => {
  const issues = [];
  if (unsafe.test(product)) issues.push('product_category_mismatch');
  if (/juustokastikkeella|juustoperunoilla/.test(product) && !/kastike|peruna/.test(food)) issues.push('prepared_meal_vs_ingredient');
  if (/gluteeniton/.test(product) && !/gluteeniton/.test(food)) issues.push('gluten_free_mismatch');
  if (/laktoositon/.test(product) && !/laktoositon/.test(food)) issues.push('lactose_free_mismatch');
  if (/rasvaton/.test(food) && /(\d+(?:[.,]\d+)?)\s*%/.test(product) && Number(product.match(/(\d+(?:[.,]\d+)?)\s*%/)[1].replace(',','.')) > 0.5) issues.push('fat_free_mismatch');
  for (const term of preparation) if (food.includes(term) && !product.includes(term) && !(term === 'pakaste' && /pakastekasvis/.test(food))) issues.push('preparation_'+term);
  for (const term of ['gluteeniton','laktoositon','rasvaton','makeuttamaton','sokeroimaton']) if (product.includes(term) && !food.includes(term)) issues.push('attribute_'+term);
  if (/kevyt/.test(product) && /rasvaton/.test(food)) issues.push('light_vs_fat_free');
  if (/jauheliha/.test(product) && /\d+(?:[.,]\d+)?\s*%/.test(product) && !/rasvaa\s*\d+(?:[.,]\d+)?\s*%/.test(food)) issues.push('mince_fat_percentage_unverified');
  const p = product.match(/(\d+(?:[.,]\d+)?)\s*%/);
  const f = food.match(/rasvaa\s*(\d+(?:[.,]\d+)?)\s*%/);
  if (p && f && Math.abs(Number(p[1].replace(',','.'))-Number(f[1].replace(',','.'))) > 0.1) issues.push('fat_percentage_mismatch');
  return issues;
};
const needsVerification = new Set(['mince_fat_percentage_unverified','light_vs_fat_free']);
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
  return {ean:r.ean,fineli_id:r.fineli_id,product:r.product_name,fineli:r.fineli_name,issues,decision:conflict?'CONFLICT_REVIEW':issues.length?'VERIFY_NUTRITION':'MANUAL_REVIEW'};
});
console.log(JSON.stringify({mode:'read_only_pending_audit',total:review.length,flagged,conflicts,verify_nutrition:verifyOnly,manual_review:review.length-flagged,modified:0}));
for(const row of review) console.log(JSON.stringify(row));
