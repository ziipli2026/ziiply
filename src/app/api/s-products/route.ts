import { streamProductSearch } from "@/lib/productSearchStream";
import { NextResponse } from "next/server";
import { fetchSKaupatDirectNormalProducts } from "@/app/components/ziiply/offerSearch/providers/skaupatProvider";

export async function GET(request: Request) {
  if (new URL(request.url).searchParams.get("stream") === "1") {
    return streamProductSearch(emit => handleProductSearch(request, emit));
  }
  return handleProductSearch(request);
}
async function handleProductSearch(request: Request, onBatch?: (data: any) => void) {
  const params = new URL(request.url).searchParams;
  const search = (params.get("search") || "").trim();
  const store = params.get("store") || "";
  const storeName = (params.get("storeName") || "").trim();
  const source = "s-kaupat-direct-preview-v2";
  if (search.length > 120 || store.length > 32 || storeName.length > 120) {
    return NextResponse.json({ error: "Invalid query", source, items: [] }, { status: 400 });
  }
  if (!search) return NextResponse.json({ source, priceUnit: "cents", items: [] });
  if (!storeName) return NextResponse.json({ source, items: [], error: "Selected S store name required" }, { status: 400 });
  try {
    const result = await fetchSKaupatDirectNormalProducts(search, storeName, store, data => onBatch?.({ ...data, source, priceUnit: "cents" }));
    return NextResponse.json({ ...result, store, storeName, source, priceUnit: "cents", status: 200 });
  } catch (error) {
    console.warn("[S direct preview]", String(error));
    return NextResponse.json({ source, store, storeName, status: 502, items: [], error: "Selected S store lookup failed", diagnostic: (error instanceof Error ? error.message : String(error)).slice(0,1500) }, { status: 502 });
  }
}
