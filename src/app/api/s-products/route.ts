import { NextResponse } from "next/server";
import { fetchSKaupatDirectNormalProducts } from "@/app/components/ziiply/offerSearch/providers/skaupatProvider";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const search = (params.get("search") || "").trim();
  const store = params.get("store") || "";
  const storeName = (params.get("storeName") || "").trim();
  const source = "s-kaupat-direct-preview-v1";
  if (search.length > 120 || store.length > 32 || storeName.length > 120) {
    return NextResponse.json({ error: "Invalid query", source, items: [] }, { status: 400 });
  }
  if (!search) return NextResponse.json({ source, priceUnit: "cents", items: [] });
  if (!storeName) return NextResponse.json({ source, items: [], error: "Selected S store name required" }, { status: 400 });
  try {
    const result = await fetchSKaupatDirectNormalProducts(search, storeName, store);
    return NextResponse.json({ ...result, store, storeName, source, priceUnit: "cents", status: 200 });
  } catch (error) {
    console.warn("[S direct preview]", String(error));
    return NextResponse.json({ source, store, storeName, status: 502, items: [], error: "Selected S store lookup failed" }, { status: 502 });
  }
}
