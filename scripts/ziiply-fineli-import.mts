import { neon } from "@neondatabase/serverless";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

if (!process.env.DATABASE_URL) throw Error("DATABASE_URL missing");
const root=process.argv[2] || "fineli-data";
const files=await readdir(root,{recursive:true});
const locate=(name:string)=>{const found=files.find(f=>f.toLowerCase().endsWith("/"+name.toLowerCase())||f.toLowerCase()===name.toLowerCase());if(!found)throw Error("Fineli ZIP missing "+name);return join(root,found);};
const csv=async(name:string)=>{
 const raw=(await readFile(locate(name))).toString("utf8").replace(/^\uFEFF/,"");
 const rows=raw.split(/\r?\n/).filter(Boolean).map(line=>line.replace(/\r$/,"").split(";").map(s=>s.trim().replace(/^"|"$/g,"")));
 const keys=rows.shift()!.map(x=>x.toUpperCase());
 return rows.map(row=>Object.fromEntries(keys.map((key,i)=>[key,row[i]??""])));
};
const fi=await csv("foodname_FI.csv"),sv=await csv("foodname_SV.csv"),en=await csv("foodname_EN.csv");
const names=(rows:Record<string,string>[])=>new Map(rows.map(x=>[Number(x.FOODID),x.FOODNAME]));
const svNames=names(sv),enNames=names(en);
const components=await csv("component.csv");
const units=new Map(components.map(x=>[x.EUFDNAME,x.COMPUNIT]));
const values=await csv("component_value.csv");
if(!values.length)throw Error("Empty nutrient file");
console.log("FINELI_HEADERS",JSON.stringify(Object.keys(values[0])));
const nutrients=new Map<number,Record<string,{value:number;unit:string}>>();
let valid=0;
for(const row of values){
 const id=Number(row.FOODID);
 const key=row.EUFDNAME || row.COMPONENT || row.COMPONENTID;
 const raw=row.BESTLOC || row.VALUE || row.COMPVAL || row.AMOUNT || row.BESTVALUE;
 const num=Number(String(raw??"").replace(",","."));
 if(!Number.isInteger(id)||!key||!String(raw??"").trim()||!Number.isFinite(num))continue;
 const data=nutrients.get(id)??{};
 data[key]={value:num,unit:units.get(key)??""};
 nutrients.set(id,data);valid++;
}
if(valid<1000)throw Error("Fineli nutrient parse produced only "+valid+" values; refusing partial import");
const sql=neon(process.env.DATABASE_URL);
const foods=fi.filter(x=>Number.isInteger(Number(x.FOODID))&&x.FOODNAME).map(x=>({id:Number(x.FOODID),fi:x.FOODNAME,sv:svNames.get(Number(x.FOODID))??null,en:enNames.get(Number(x.FOODID))??null,nutrients:nutrients.get(Number(x.FOODID))??{}}));
if(foods.length<3000)throw Error("Fineli foods unexpectedly few: "+foods.length);
let count=0;
for(let i=0;i<foods.length;i+=40){
 const batch=foods.slice(i,i+40);
 const ids=batch.map(x=>x.id),fiNames=batch.map(x=>x.fi),svs=batch.map(x=>x.sv),ens=batch.map(x=>x.en),nutrientJson=batch.map(x=>JSON.stringify(x.nutrients));
 await sql`INSERT INTO public.ziiply_fineli_foods (fineli_id,name_fi,name_sv,name_en,nutrients,source,source_url,imported_at)
 SELECT x.id,x.fi,x.sv,x.en,x.nutrients::jsonb,'Terveyden ja hyvinvoinnin laitos (THL), Fineli, CC BY 4.0','https://fineli.fi/fineli/fi/avoin-data',now()
 FROM unnest(${ids}::integer[],${fiNames}::text[],${svs}::text[],${ens}::text[],${nutrientJson}::text[]) AS x(id,fi,sv,en,nutrients)
 ON CONFLICT(fineli_id) DO UPDATE SET name_fi=excluded.name_fi,name_sv=excluded.name_sv,name_en=excluded.name_en,nutrients=excluded.nutrients,source=excluded.source,source_url=excluded.source_url,imported_at=now()`;
 count+=batch.length;
}
console.log("FINELI_IMPORT",JSON.stringify({foods:count,nutrientValues:valid,withNutrients:nutrients.size,eanProductsUntouched:true}));
