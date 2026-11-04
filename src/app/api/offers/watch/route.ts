import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

type Offer = Record<string, unknown>;
const text = (v: unknown) => String(v ?? "").trim();
const normalized = (v: unknown) => text(v).toLocaleLowerCase("fi").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();
const price = (o: Offer) => {
  for (const value of [o.offerPrice,o.price]) {
    const number = Number(text(value).replace(/\s*€$/,"").replace(",","."));
    if (Number.isFinite(number) && number > 0) return number;
  }
  return Infinity;
};
const matches = (term:string,o:Offer) => {
  const title=normalized(o.title||o.name||o.productName);
  const tokens=normalized(term).split(" ").filter(Boolean);
  return !!title && tokens.length>0 && tokens.every(token=>title.split(" ").some(word=>word.startsWith(token)));
};
export async function GET(request:Request) {
  const url=new URL(request.url);
  const queries=[...new Set((url.searchParams.get("q")||"").split("|").map(normalized).filter(q=>q.length>=2&&q.length<=80))].slice(0,30);
  if(!queries.length)return NextResponse.json({ok:false,error:"Hakusanat puuttuvat",results:[]},{status:400});
  if(!process.env.DATABASE_URL)return NextResponse.json({ok:false,error:"Tarjousaineisto ei ole käytettävissä",results:[]},{status:503});
  try {
    const db=neon(process.env.DATABASE_URL);
    // Read only already parsed, approved offer-search publications. No provider/API calls.
    const rows=await db`SELECT chain,publication_id,offers FROM ziiply_offer_publications
      WHERE approval_state='approved'
        AND valid_from <= (now() AT TIME ZONE 'Europe/Helsinki')::date
        AND valid_until >= (now() AT TIME ZONE 'Europe/Helsinki')::date
      ORDER BY parsed_at DESC LIMIT 100`;
    const seen=new Set<string>();
    const results:Offer[]=[];
    let inspected=0;
    for(const row of rows) {
      const offers=Array.isArray(row.offers)?row.offers as Offer[]:[];
      for(const offer of offers) {
        inspected++;
        const p=price(offer);
        if(!Number.isFinite(p))continue;
        const watchQueries=queries.filter(q=>matches(q,offer));
        if(!watchQueries.length)continue;
        const title=text(offer.title||offer.name||offer.productName);
        const storeName=text(offer.storeName||offer.store||row.publication_id);
        const id=text(offer.ean||offer.id||title);
        const key=[row.chain,storeName,id,p].join("|");
        if(seen.has(key))continue;
        seen.add(key);
        results.push({...offer,title,offerPrice:p,storeName,chain:row.chain,watchQueries});
      }
    }
    results.sort((a,b)=>price(a)-price(b));
    return NextResponse.json({ok:true,partial:false,queries,results,diagnostic:{source:"approved-normalized-offer-publications",publications:rows.length,inspected,matched:results.length}},{headers:{"Cache-Control":"no-store"}});
  } catch(error) {
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:String(error),results:[]},{status:500});
  }
}
