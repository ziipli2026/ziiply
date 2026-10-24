// Read-only mass audit of uncovered grocery products.
// DATABASE_URL=... npx tsx scripts/ziiply-fineli-food-gap-audit.mts
import { neon } from "@neondatabase/serverless";
const url=process.env.DATABASE_URL;
if(!url) throw new Error("DATABASE_URL is required");
const sql=neon(url);
const rows=await sql`
 SELECT e.ean,e.name FROM public.ziiply_ean_products e
 WHERE NOT EXISTS(SELECT 1 FROM public.ziiply_off_nutrition o WHERE o.ean=e.ean)
 AND NOT EXISTS(SELECT 1 FROM public.ziiply_ean_fineli_matches m WHERE m.ean=e.ean)
 AND NOT EXISTS(SELECT 1 FROM public.ziiply_ean_fineli_candidates c WHERE c.ean=e.ean)
`;
const nonfood=/\b(?:kissanruoka|koiranruoka|lemmikin|lemmikkiportti|kissanhiekka|pesuaine|puhdistusaine|wc-paperi|shampoo|saippua|deodorantti|hammastahna|vaippa|aurinkovoide|kasvovoide|toppahousut|fleece|hanskat|sukat|lautapeli|palapeli|paristo|led|plafondi|lautanen|leipäveitsi|tomaattiveitsi|pastakauha|öljykynttilä|ilmanraikastin|meikkisieni|pussilakanasetti|lelu|olut|siideri|lonkero|cocktail)\b/i;
const categories=[
 ["dairy_eggs",/maito|jogurtti|juusto|rahka|kananmuna|kerma|piimä/i],
 ["bakery_grains",/leipä|pulla|jauho|kaurahiutale|riisi|pasta|spagetti|makaroni|muro|puuro/i],
 ["produce",/porkkana|peruna|omena|banaani|sipuli|tomaatti|kurkku|salaatti|paprika|marja|hedelmä/i],
 ["meat_fish",/liha|kana|kala|makkara|jauheliha|tonnikala|broileri/i],
 ["pantry",/sokeri|suola|kastike|öljy|kikherne|linssi|papu|kahvi|tee|pähkinä/i],
 ["other_food",/suklaa|keksi|keitto|jäätelö|mehu|juoma|kakku|snacks/i]
] as const;
const counts:Record<string,number>={excluded_nonfood:0,uncertain:0};
const examples:Record<string,string[]>={};
for(const {name} of rows){
 const s=String(name??"");
 const category=nonfood.test(s)?"excluded_nonfood":categories.find(([,re])=>re.test(s))?.[0]??"uncertain";
 counts[category]=(counts[category]??0)+1;
 if((examples[category]??=[]).length<8)examples[category].push(s);
}
console.log(JSON.stringify({mode:"read_only_food_gap_audit",uncovered:rows.length,counts,examples,inserted:0,autoApproved:0}));
