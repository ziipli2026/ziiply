import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search") || "";

  if (!search) {
    return NextResponse.json({
      items: [],
    });
  }

  try {
    const response = await fetch(
      `https://api.ruoanhinta.fi/api/stores?search=${encodeURIComponent(search)}`,
      {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const data = await response.json();

    const items = (Array.isArray(data) ? data : data.items || []).map(
      (store: any) => ({
        id: store.id,
        name: store.name,
        chain: store.chain,
        type: store.type,
        city: store.city,
        postalCode: store.postalCode,
      })
    );

    return NextResponse.json({
      items,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Store search failed",
      },
      { status: 500 }
    );
  }
}