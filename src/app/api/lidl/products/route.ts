import { NextResponse } from "next/server";
import { searchLidlResearch } from "@/lib/lidlResearchSearch";
import { getVerifiedLidlStorePrice } from "@/lib/lidlVerifiedStorePrice";

// Independent Lidl catalog preview: no third-party price/store API calls.
// Products are discoverable by name and official image, never checkout-comparable.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = String(searchParams.get("search") || "").trim();
  const storeId = String(searchParams.get("storeId") || "").trim();
  const researchItems = search ? searchLidlResearch(search, 40) : [];
  const items = researchItems.map(item => {
    const verified = storeId ? getVerifiedLidlStorePrice(item.lidlProductId, storeId) : null;
    return verified ? {...item, price:verified.regularPriceEur, priceVerified:true, storeItems:[{price:verified.regularPriceEur}], verifiedPriceObservedAt:verified.observedAt, verifiedPriceFreshUntil:verified.freshUntil, verifiedPriceSource:verified.priceSource} : item;
  });
  return NextResponse.json({
    source: "lidl.fi-public-research",
    storeId: storeId || null,
    priceVerified: items.some(item => item.priceVerified === true),
    status: 200,
    items,
  });
}
