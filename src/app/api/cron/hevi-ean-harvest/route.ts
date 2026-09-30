import { NextResponse } from "next/server";
import { observeEanProductsBestEffort } from "@/lib/eanBank";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Row = Record<string, unknown>;
const TERMS = ["omena","päärynä","banaani","appelsiini","mandariini","klementiini","sitruuna","lime","greippi","kiivi","mango","ananas","avokado","luumu","persikka","nektariini","viinirypäle","meloni","vesimeloni","tomaatti","kurkku","paprika","peruna","porkkana","sipuli","valkosipuli","kaali","parsakaali","kukkakaali","salaatti","kesäkurpitsa","munakoiso","bataatti","punajuuri","lanttu","inkivääri","chili","herkkusieni","tilli","persilja"];

function digits(value: unknown) { return String(value ?? "").replace(/\D/g, ""); }
function checkDigit(first12: string) {
  if (!/^\d{12}$/.test(first12)) return "";
  const sum = [...first12].reduce((t, d, i) => t + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}
function validVariableEan(value: unknown) {
  const ean = digits(value);
  return /^20\d{11}$/.test(ean) && checkDigit(ean.slice(0, 12)) === ean[12];
}
function getEan(row: Row) {
  return [row.ean,row.gtin,row.eanCode,row.barcode,row.externalId].map(digits).find(validVariableEan) || "";
}
function clean(value: unknown) { return String(value ?? "").replace(/\s+/g, " ").trim(); }

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok:false, error:"Cron unavailable" }, { status:503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok:false, error:"Unauthorized" }, { status:401 });
  }

  const commit = new URL(request.url).searchParams.get("commit") === "1";
  const found = new Map<string,{ean:string;name:string;brand?:string;imageUrl?:string;category?:string;source:string;terms:string[]}>();
  const errors:string[] = [];

  for (const term of TERMS) {
    try {
      const url = `https://api.ruoanhinta.fi/api/items?search=${encodeURIComponent(term)}&skip=0&take=100`;
      const response = await fetch(url,{headers:{accept:"application/json"},cache:"no-store"});
      if (!response.ok) { errors.push(`${term}: HTTP ${response.status}`); continue; }
      const data = await response.json();
      const rows:Row[] = Array.isArray(data?.items) ? data.items : [];
      for (const row of rows) {
        const ean=getEan(row), name=clean(row.name);
        if (!ean || !name) continue;
        const previous=found.get(ean);
        if (previous) { if (!previous.terms.includes(term)) previous.terms.push(term); continue; }
        found.set(ean,{ean,name,brand:clean(row.brandName)||undefined,imageUrl:clean(row.pictureUrl)||undefined,category:clean(row.category)||"HEVI / Vaakatuote",source:"hevi-mass-harvest",terms:[term]});
      }
    } catch (error) { errors.push(`${term}: ${String(error)}`); }
  }

  const products=[...found.values()].sort((a,b)=>a.name.localeCompare(b.name,"fi"));
  if (commit && products.length) {
    await observeEanProductsBestEffort(products.map(({terms:_terms,...product})=>product));
  }
  return NextResponse.json({ok:errors.length===0,mode:commit?"commit":"dry-run",searchedTerms:TERMS.length,validUniqueProducts:products.length,errors,sample:products.slice(0,50)},{headers:{"Cache-Control":"no-store"}});
}
