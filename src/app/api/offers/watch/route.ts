import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

function norm(value: unknown) {
  return String(value ?? "").toLocaleLowerCase("fi").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
function matches(query: string, offer: Record<string, unknown>) {
  const words = norm(query).split(/\s+/).filter(Boolean);
  const title = norm(offer.title || offer.name || offer.productName);
  const tokens = title.split(/\s+/);
  return words.length > 0 && words.every(word => tokens.some(token =>
    token === word || token.startsWith(word) || (word.length >= 5 && token.startsWith(word.slice(0, -1)))));
}
export async function GET(request: Request) {
  const started = Date.now();
  const params = new URL(request.url).searchParams;
  const queries = [...new Set((params.get("q") || "").split("|").map(q => q.trim()).filter(q => q.length >= 2 && q.length <= 80))].slice(0, 30);
  if (!queries.length) return NextResponse.json({ok:false,error:"Hakusanat puuttuvat",results:[]},{status:400});
  if (!process.env.DATABASE_URL) return NextResponse.json({ok:false,error:"DATABASE_URL puuttuu",results:[]},{status:503});
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT chain, publication_id, offers
      FROM (SELECT DISTINCT ON (chain, valid_from, valid_until)
        chain, publication_id, offers, valid_from, valid_until
        FROM ziiply_offer_publications
        WHERE approval_state='approved'
          AND valid_from <= (now() AT TIME ZONE 'Europe/Helsinki')::date
          AND valid_until >= (now() AT TIME ZONE 'Europe/Helsinki')::date
        ORDER BY chain, valid_from, valid_until, parsed_at DESC, publication_id DESC) latest`;
    const seen = new Set<string>();
    const results: Array<Record<string,unknown>> = [];
    const sources: Array<{chain:string;publication:string;count:number}> = [];
    let inspected = 0;
    for (const row of rows) {
      const offers = Array.isArray(row.offers) ? row.offers as Record<string,unknown>[] : [];
      sources.push({chain:String(row.chain),publication:String(row.publication_id),count:offers.length});
      inspected += offers.length;
      for (const offer of offers) {
        const matchingQueries = queries.filter(q => matches(q,offer));
        if (!matchingQueries.length) continue;
        const title=String(offer.title||offer.name||offer.productName||"");
        const store=String(offer.storeName||offer.store||row.chain||"");
        const key=[row.chain,store,offer.id||offer.offerId||offer.ean||title,offer.offerPrice??offer.price??""].join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        results.push({...offer,title,storeName:store,chain:String(row.chain),watchQueries:matchingQueries});
      }
    }
    return NextResponse.json({ok:true,queries,results,diagnostic:{publications:rows.length,inspected,matched:results.length,sources,durationMs:Date.now()-started}},
      {headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:String(error),results:[],diagnostic:{durationMs:Date.now()-started}},{status:500,headers:{"Cache-Control":"no-store"}});
  }
}
