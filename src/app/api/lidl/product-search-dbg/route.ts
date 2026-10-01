import { NextRequest, NextResponse } from "next/server";

const LIDL_SHOPPING_LIST_BASE = "https://shopping-list.lidlplus.com/api/v4/FI";
const LIDL_HEADERS = {
  accept: "application/json",
  "accept-language": "fi-FI,fi;q=0.9",
  "user-agent": "LidlPlus/17.0.5 Android okhttp/4.12.0",
  "x-client-version": "17.0.5",
  "x-client-platform": "android",
};

function barcodeCandidates(value: unknown) {
  const found = new Set<string>();
  const visit = (node: unknown, depth = 0) => {
    if (depth > 5 || node == null) return;
    if (typeof node === "string" || typeof node === "number") {
      const text = String(node);
      for (const match of text.matchAll(/(?:^|\D)(\d{8,14})(?=\D|$)/g)) found.add(match[1]);
      return;
    }
    if (Array.isArray(node)) {
      node.slice(0, 50).forEach((item) => visit(item, depth + 1));
      return;
    }
    if (typeof node === "object") {
      Object.entries(node as Record<string, unknown>).slice(0, 100).forEach(([key, item]) => {
        if (/ean|gtin|barcode|product.?id|code/i.test(key)) visit(item, depth + 1);
      });
    }
  };
  visit(value);
  return [...found];
}

export async function GET(request: NextRequest) {
  const storeKey = String(request.nextUrl.searchParams.get("storeKey") || "").trim();
  const q = String(request.nextUrl.searchParams.get("q") || "maito").trim();

  if (!/^[A-Za-z0-9_-]{2,40}$/.test(storeKey)) {
    return NextResponse.json(
      { ok: false, error: "Anna Lidl storeKey, esim. ?storeKey=FIxxxx&q=maito" },
      { status: 400 },
    );
  }

  const url = `${LIDL_SHOPPING_LIST_BASE}/store/${encodeURIComponent(storeKey)}/search?q=${encodeURIComponent(q || "maito")}`;

  try {
    const response = await fetch(url, {
      headers: LIDL_HEADERS,
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    const text = await response.text();
    let raw: unknown = text;
    try {
      raw = text ? JSON.parse(text) : null;
    } catch {}

    const root = raw && typeof raw === "object" ? raw as Record<string, unknown> : null;
    const rows = Array.isArray(raw)
      ? raw
      : Array.isArray(root?.results)
        ? root.results
        : Array.isArray(root?.items)
          ? root.items
          : Array.isArray(root?.products)
            ? root.products
            : [];

    const sample = rows.slice(0, 10).map((row: any) => ({
      keys: row && typeof row === "object" ? Object.keys(row) : [],
      id: row?.id ?? row?.productId ?? null,
      title: row?.title ?? row?.name ?? null,
      brand: row?.brand ?? row?.brandName ?? null,
      price: row?.price ?? row?.currentPrice ?? row?.priceBox ?? null,
      unit: row?.pricePerUnit ?? row?.unitPrice ?? row?.unit ?? null,
      image: row?.imageUrl ?? row?.image ?? row?.pictureUrl ?? null,
      explicitBarcodeFields: {
        ean: row?.ean ?? null,
        gtin: row?.gtin ?? null,
        barcode: row?.barcode ?? null,
        code: row?.code ?? null,
      },
      barcodeCandidates: barcodeCandidates(row),
      raw: row,
    }));

    return NextResponse.json({
      ok: response.ok,
      upstreamStatus: response.status,
      query: q || "maito",
      storeKey,
      upstreamPath: `/api/v4/FI/store/${storeKey}/search`,
      rootKeys: root ? Object.keys(root) : [],
      resultCount: rows.length,
      sample,
      raw: rows.length ? undefined : raw,
      note: "DBG only: no EAN-bank writes and no production Lidl search changes.",
    }, { status: response.ok ? 200 : 502 });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      storeKey,
      query: q || "maito",
      error: error instanceof Error ? error.message : String(error),
      note: "DBG only: no EAN-bank writes and no production Lidl search changes.",
    }, { status: 502 });
  }
}
