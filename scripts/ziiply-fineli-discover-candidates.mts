import { neon } from "@neondatabase/serverless";
import { fineliRawProduceName } from "../src/app/api/ean-bank/fineliProduceMatcher";

const url=process.env.DATABASE_URL;
if(!url) throw new Error("DATABASE_URL is required");
const sql=neon(url);
const foods=await sql`SELECT fineli_id,name_fi FROM public.ziiply_fineli_foods WHERE name_fi IN
 ('PORKKANA','SIPULI','VALKOSIPULI','KURKKU','TOMAATTI','PERUNA','BANAANI','OMENA','APPELSIINI','SITRUUNA','LIME','PÄÄRYNÄ')`;
const byName=new Map(foods.map(f=>[String(f.name_fi),Number(f.fineli_id)]));
const products=await sql`
 SELECT e.ean,e.name,e.brand FROM public.ziiply_ean_products e
 WHERE NOT EXISTS (SELECT 1 FROM public.ziiply_ean_fineli_matches m WHERE m.ean=e.ean)
 AND NOT EXISTS (SELECT 1 FROM public.ziiply_off_nutrition o WHERE o.ean=e.ean)
`;
let eligible=0,inserted=0;
for(const p of products) {
 const name=fineliRawProduceName(String(p.name||""),p.brand==null?null:String(p.brand));
 const id=name?byName.get(name):undefined;
 if(!id) continue;
 eligible++;
 const evidence=JSON.stringify({productName:p.name,brand:p.brand,fineliName:name,rule:"guarded raw produce name; manual review required"});
 const result=await sql`
 INSERT INTO public.ziiply_ean_fineli_candidates(ean,fineli_id,method,confidence,status,evidence)
 VALUES (${p.ean},${id},'raw_produce_matcher','review_required','pending',${evidence}::jsonb)
 ON CONFLICT(ean,fineli_id) DO NOTHING RETURNING ean
 `;
 inserted+=result.length;
}
console.log(JSON.stringify({scanned:products.length,eligible,inserted,pendingReview:true,autoApproved:0}));
