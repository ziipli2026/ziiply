#!/usr/bin/env node
// Read-only SPAR/Tokmanni historical EAN export. Never writes to Neon.
import { neon } from "@neondatabase/serverless";
import { writeFileSync } from "node:fs";
if (!process.env.DATABASE_URL) throw new Error("NEON_READONLY_DATABASE_URL missing");
const sql=neon(process.env.DATABASE_URL);
const rows=await sql`SELECT ean,name,brand,category,source FROM ziiply_ean_products WHERE lower(coalesce(source,'')) LIKE '%tokmanni%' OR lower(coalesce(source,'')) LIKE '%spar%' ORDER BY ean`;
const clean=x=>String(x??"").trim();
const valid=x=>/^[0-9]{8,14}$/.test(x);
const byEan=new Map();
for(const row of rows){const code=clean(row.ean);if(!valid(code))continue;if(!byEan.has(code))byEan.set(code,{ean:code,name:clean(row.name),brand:clean(row.brand),category:clean(row.category),source:clean(row.source)});}
writeFileSync("tokmanni-spar-historical-neon.json",JSON.stringify({summary:{rows:rows.length,uniqueValidEans:byEan.size,sourceCounts:Object.fromEntries([...new Set(rows.map(x=>clean(x.source)))].map(s=>[s,rows.filter(x=>clean(x.source)===s).length]))},items:[...byEan.values()]},null,2));
console.log(JSON.stringify({rows:rows.length,uniqueValidEans:byEan.size},null,2));
