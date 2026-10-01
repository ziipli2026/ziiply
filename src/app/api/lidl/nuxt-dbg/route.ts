import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const debugVersion = "NUXT-DBG-v2-20261001";
  const category = request.nextUrl.searchParams.get("category") || "lihat";
  const paths: Record<string,string> = { lihat: "/h/lihat/h10095752" };
  if (!paths[category]) return NextResponse.json({ok:false, allowed:Object.keys(paths)},{status:400});
  try {
    const response = await fetch("https://www.lidl.fi"+paths[category], {headers:{accept:"text/html","accept-language":"fi-FI,fi;q=0.9"},cache:"no-store",signal:AbortSignal.timeout(12000)});
    const html = await response.text();
    const match = html.match(/<script[^>]*id=["']__NUXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!match) return NextResponse.json({ok:false,upstreamStatus:response.status,reason:"NUXT_DATA missing"},{status:502});
    const data: unknown = JSON.parse(match[1]);
    if (!Array.isArray(data)) return NextResponse.json({ok:false,reason:"NUXT_DATA not array"},{status:502});
    const matches = data.flatMap((entry,index) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
      const keys = Object.keys(entry);
      if (!keys.some(k=>/product|price|gtin|ean|barcode|article|sku|title|name|gridbox|searchApiResult/i.test(k))) return [];
      return [{index,keys:keys.slice(0,35),values:Object.fromEntries(Object.entries(entry).filter(([k])=>/product|price|gtin|ean|barcode|article|sku|title|name|gridbox|searchApiResult/i.test(k)).slice(0,18))}];
    });
    const eanLike = data.flatMap((entry,index)=>{
      if (typeof entry === "string" && /^(?:\d{8}|\d{12,14})$/.test(entry)) return [{index,value:entry}];
      return [];
    });
    return NextResponse.json({debugVersion,ok:response.ok,upstreamStatus:response.status,category,nuxtEntries:data.length,matchedEntries:matches.length,matches:matches.slice(0,55),eanLikeCount:eanLike.length,eanLikeSamples:eanLike.slice(0,25),note:"Read-only NUXT payload structure; numeric values in matches are flattened array references, not literal prices or EANs."});
  } catch(error) {return NextResponse.json({ok:false,error:String(error)},{status:502});}
}
