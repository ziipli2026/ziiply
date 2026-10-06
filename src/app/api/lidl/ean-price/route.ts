import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";

function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}
function eanOf(value: unknown) {
  const ean = String(value ?? "").replace(/\D/g, "");
  return /^\d{8,14}$/.test(ean) ? ean : "";
}
async function ensureSchema(sql: ReturnType<typeof db>) {
  await sql`
    CREATE TABLE IF NOT EXISTS ziiply_lidl_ean_prices (
      ean TEXT NOT NULL,
      store_id TEXT NOT NULL,
      price_eur NUMERIC(10,2) NOT NULL CHECK (price_eur > 0),
      price_kind TEXT NOT NULL DEFAULT 'regular',
      source TEXT NOT NULL,
      observed_at TIMESTAMPTZ NOT NULL,
      fresh_until TIMESTAMPTZ NOT NULL,
      evidence_reference TEXT,
      checkout_price_verified BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (ean, store_id, price_kind)
    )
  `;
}
export async function GET(request: NextRequest) {
  try {
    const ean = eanOf(request.nextUrl.searchParams.get("ean"));
    const storeId = String(request.nextUrl.searchParams.get("storeId") || "").trim();
    if (!ean || !storeId) return NextResponse.json({ok:false,error:"ean and storeId required"},{status:400});
    const sql=db(); await ensureSchema(sql);
    const rows=await sql`
      SELECT ean, store_id AS "storeId", price_eur::float8 AS "priceEur",
             price_kind AS "priceKind", source, observed_at AS "observedAt",
             fresh_until AS "freshUntil", evidence_reference AS "evidenceReference",
             checkout_price_verified AS "checkoutPriceVerified"
      FROM ziiply_lidl_ean_prices
      WHERE ean=${ean} AND store_id=${storeId} AND price_kind='regular' AND checkout_price_verified=TRUE
      LIMIT 1
    `;
    const row=rows[0] ?? null;
    const fresh=row ? new Date(row.freshUntil).getTime() >= Date.now() : false;
    return NextResponse.json({ok:true,status:row?(fresh?"fresh":"stale"):"missing",price:fresh?row:null,latest:row});
  } catch(error) {
    return NextResponse.json({ok:false,error:String(error)},{status:500});
  }
}

export async function POST(request: NextRequest) {
  try {
    const body=await request.json();
    const ean=eanOf(body?.ean);
    const storeId=String(body?.storeId||"").trim();
    const priceEur=Number(body?.priceEur);
    const source=String(body?.source||"").trim();
    const observedAt=new Date(String(body?.observedAt||""));
    const freshUntil=new Date(String(body?.freshUntil||""));
    const evidenceReference=String(body?.evidenceReference||"").trim() || null;
    const verified=body?.checkoutPriceVerified===true;
    if(!ean||!storeId||!Number.isFinite(priceEur)||priceEur<=0||!source||
       !Number.isFinite(observedAt.getTime())||!Number.isFinite(freshUntil.getTime())||
       freshUntil<observedAt) {
      return NextResponse.json({ok:false,error:"invalid price observation"},{status:400});
    }
    const sql=db(); await ensureSchema(sql);
    const rows=await sql`
      INSERT INTO ziiply_lidl_ean_prices
        (ean,store_id,price_eur,price_kind,source,observed_at,fresh_until,evidence_reference,checkout_price_verified)
      VALUES
        (${ean},${storeId},${priceEur},'regular',${source},${observedAt.toISOString()},${freshUntil.toISOString()},${evidenceReference},${verified})
      ON CONFLICT (ean,store_id,price_kind) DO UPDATE SET
        price_eur=EXCLUDED.price_eur,
        source=EXCLUDED.source,
        observed_at=EXCLUDED.observed_at,
        fresh_until=EXCLUDED.fresh_until,
        evidence_reference=EXCLUDED.evidence_reference,
        checkout_price_verified=EXCLUDED.checkout_price_verified,
        updated_at=NOW()
      WHERE EXCLUDED.observed_at >= ziiply_lidl_ean_prices.observed_at
      RETURNING ean,store_id AS "storeId",price_eur::float8 AS "priceEur",
                observed_at AS "observedAt",fresh_until AS "freshUntil"
    `;
    return NextResponse.json({ok:true,updated:rows.length>0,price:rows[0]??null});
  } catch(error) {
    return NextResponse.json({ok:false,error:String(error)},{status:500});
  }
}
