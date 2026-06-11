import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const ean = searchParams.get("ean")?.trim();
    const storeId = searchParams.get("storeId")?.trim();

    if (!ean) {
      return NextResponse.json(
        { ok: false, error: "EAN missing" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      debug: true,
      ean,
      storeId,
      source: "s-ean-product",
      product: null,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
