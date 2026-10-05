import { NextResponse } from "next/server";
import { searchLidlResearch } from "@/lib/lidlResearchSearch";

// Independent Lidl catalog preview: no third-party price/store API calls.
// Products are discoverable by name and official image, never checkout-comparable.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = String(searchParams.get("search") || "").trim();
  const storeId = String(searchParams.get("storeId") || "").trim();
  const items = search ? searchLidlResearch(search, 40, storeId) : [];
  return NextResponse.json({
    source: "lidl.fi-public-research",
    storeId: storeId || null,
    priceVerified: items.some(item => item.priceVerified === true),
    status: 200,
    items,
  });
}
