import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("search") || "";
    const store = req.nextUrl.searchParams.get("store") || "292";

    if (!search.trim()) {
      return NextResponse.json({ products: [] });
    }

    const url =
      `https://api.ruoanhinta.fi/api/items` +
      `?search=${encodeURIComponent(search)}` +
      `&storeIds=${store}` +
      `&skip=0` +
      `&take=80`;

    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "S API failed",
          status: response.status,
        },
        { status: 500 }
      );
    }

    const data = await response.json();

    const rawItems = Array.isArray(data?.items)
      ? data.items
      : [];

    const products = rawItems.map((item: any) => ({
      id: item.id,
      name: item.name || "",
      ean: item.ean || "",
      brandName: item.brandName || "",
      pictureUrl: item.pictureUrl || "",
      category: item.category || "",

      // TÄRKEIN KORJAUS:
      // Ziiply käyttää tätä rakennetta
      storeItems: [
        {
          price:
            item?.storeItem?.price ||
            item?.price ||
            0,

          comparisonPrice:
            item?.storeItem?.comparisonPrice ||
            null,

          comparisonPriceUnit:
            item?.storeItem?.comparisonPriceUnit ||
            null,
        },
      ],

      price:
        item?.storeItem?.price ||
        item?.price ||
        0,
    }));

    return NextResponse.json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
