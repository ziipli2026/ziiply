import { NextResponse } from "next/server";
import { searchLidlResearch } from "@/lib/lidlResearchSearch";

// Independent Lidl catalog preview: no third-party price/store API calls.
// Products are discoverable by name and official image, never checkout-comparable.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = String(searchParams.get("search") || "").trim();
  const items = search ? searchLidlResearch(search, 40) : [];
  return NextResponse.json({
    source: "lidl.fi-public-research",
    storeId: null,
    priceVerified: false,
    status: 200,
    items,
  });
}
