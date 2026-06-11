import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function findProductsDeep(value: any): any[] {
  const found: any[] = [];

  const walk = (node: any) => {
    if (!node) return;

    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }

    if (typeof node === "object") {
      const maybeName =
        node.name ||
        node.productName ||
        node.title ||
        node.localizedName ||
        node.displayName;

      const maybePrice =
        node.price ||
        node.currentPrice ||
        node.unitPrice ||
        node.basicPrice ||
        node.pricing;

      if (maybeName && maybePrice) {
        found.push(node);
      }

      for (const child of Object.values(node)) {
        walk(child);
      }
    }
  };

  walk(value);
  return found;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const ean = searchParams.get("ean")?.replace(/\D/g, "");
    const storeId = searchParams.get("storeId")?.trim() || "708276035";

    if (!ean) {
      return NextResponse.json({ ok: false, error: "EAN missing" }, { status: 400 });
    }

    const url = new URL("https://api.s-kaupat.fi/");
    url.searchParams.set("operationName", "RemoteComplementaryProducts");
    url.searchParams.set("storeId", storeId);
    url.searchParams.set("focusOnEan", ean);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        accept: "application/json",
        "user-agent": "Mozilla/5.0 Ziiply/1.0",
      },
      cache: "no-store",
    });

    const text = await response.text();

    let payload: any = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { raw: text.slice(0, 1000) };
    }

    const candidates = findProductsDeep(payload);

    return NextResponse.json({
      ok: response.ok,
      source: "s-kaupat-focusOnEan",
      status: response.status,
      ean,
      storeId,
      url: url.toString(),
      candidateCount: candidates.length,
      firstCandidate: candidates[0] || null,
      debugKeys: payload && typeof payload === "object" ? Object.keys(payload).slice(0, 20) : [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
