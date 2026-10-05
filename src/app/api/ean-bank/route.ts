import { neon } from "@neondatabase/serverless";
import { NextRequest, NextResponse } from "next/server";
import verifiedLidlEanLinks from "../../../../data/lidl/verified-ean-linksconst VERIFIED_LIDL_EAN_BY_CODE = new Map(
  verifiedLidlEanLinks.map((link) => {
    const product = officialLidlGroceryCandidates.find(
      (candidate) => String(candidate.lidlProductId) === String(link.lidlProductId),
    );
    const fullName = [product?.name, product?.variant].filter(Boolean).join(" ").trim();
    return [String(link.ean), { ...link, name: fullName }] as const;
  }),
);
9624479",
    "lidlProductId": "10038301",
    "name": "KULJANKA Lihakeitto"
  }
] as const;
const VERIFIED_LIDL_EAN_BY_CODE = new Map(VERIFIED_LIDL_EAN_PRODUCTS.map((item) => [item.ean, item]));


type ProductInput = {
  ean?: unknown;
  name?: unknown;
  brand?: unknown;
  quantity?: unknown;
  imageUrl?: unknown;
  category?: unknown;
  source?: unknown;
  aliases?: unknown;
};

function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeEan(value: unknown) {
  const ean = clean(value, 32).replace(/\D/g, "");
  return /^\d{8,14}$/.test(ean) ? ean : "";
}

function aliases(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return Array.from(new Set(value.map((v) => clean(v, 160)).filter(Boolean))).slice(0, 24);
}

async function ensureSchema(sql: ReturnType<typeof db>) {
  await sql`
    CREATE TABLE IF NOT EXISTS ziiply_ean_products (
      ean TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT '',
      brand TEXT,
      quantity TEXT,
      image_url TEXT,
      category TEXT,
      source TEXT,
      aliases TEXT[] NOT NULL DEFAULT '{}',
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function GET(request: NextRequest) {
  try {
    const sql = db();
    await ensureSchema(sql);
    const ean = normalizeEan(request.nextUrl.searchParams.get("ean"));
    const q = clean(request.nextUrl.searchParams.get("q"), 160);

    if (ean) {
      const rows = await sql`
        SELECT ean, name, brand, quantity, image_url AS "imageUrl", category, source,
               aliases, first_seen_at AS "firstSeenAt", last_seen_at AS "lastSeenAt",
               updated_at AS "updatedAt"
        FROM ziiply_ean_products
        WHERE ean = ${ean}
        LIMIT 1
      `;
      if (rows[0]) {
        return NextResponse.json({ ok: true, product: rows[0] });
      }

      const verifiedLidl = VERIFIED_LIDL_EAN_BY_CODE.get(ean);
      if (verifiedLidl) {
        return NextResponse.json({
          ok: true,
          product: {
            ean: verifiedLidl.ean,
            name: verifiedLidl.name,
            brand: null,
            quantity: null,
            imageUrl: null,
            category: "Lidl",
            source: "lidl-verified-ean-master",
            aliases: [],
          },
        });
      }

      // Tokmanni/SPAR cold EAN fallback: Tokmanni product URLs end in the
      // public product number/EAN. This lets the scanner identify a product
      // even before Ziiply has learned it into the persistent EAN bank.
      try {
        const searchUrl = new URL("https://www.tokmanni.fi/search");
        searchUrl.searchParams.set("q", ean);
        const response = await fetch(searchUrl, {
          redirect: "follow",
          headers: {
            accept: "text/html,application/xhtml+xml",
            "accept-language": "fi-FI,fi;q=0.9",
            "user-agent": "Ziiply/1.0",
          },
          cache: "no-store",
        });

        if (response.ok) {
          const html = await response.text();
          const escapedEan = ean.replace(/[.*+?^$()|[\]\\]/g, "\\      return NextResponse.json({ ok: true, product: rows[0] ?? null });");
          const linkRe = new RegExp(
            `<a\\b[^>]*class=["'][^"']*product-item-link[^"']*["'][^>]*href=["']([^"']*-${escapedEan}(?:[/?#][^"']*)?)["'][^>]*>([\\s\\S]*?)<\\/a>`,
            "i",
          );
          const reverseLinkRe = new RegExp(
            `<a\\b[^>]*href=["']([^"']*-${escapedEan}(?:[/?#][^"']*)?)["'][^>]*class=["'][^"']*product-item-link[^"']*["'][^>]*>([\\s\\S]*?)<\\/a>`,
            "i",
          );
          const match = html.match(linkRe) || html.match(reverseLinkRe);
          if (match) {
            const decode = (value: string) =>
              value
                .replace(/<[^>]+>/g, " ")
                .replace(/&nbsp;/gi, " ")
                .replace(/&amp;/gi, "&")
                .replace(/&quot;/gi, '"')
                .replace(/&#39;|&apos;/gi, "'")
                .replace(/\\s+/g, " ")
                .trim();
            const name = decode(match[2] || "");
            if (name) {
              return NextResponse.json({
                ok: true,
                product: {
                  ean,
                  name,
                  brand: null,
                  quantity: null,
                  imageUrl: null,
                  category: "Tokmanni",
                  source: "tokmanni-search-ean",
                  aliases: [],
                },
              });
            }
          }
        }
      } catch (error) {
        console.error("Tokmanni EAN fallback failed", error);
      }

      return NextResponse.json({ ok: true, product: null });
    }

    if (q.length >= 2) {
      const like = `%${q}%`;
      const rows = await sql`
        SELECT ean, name, brand, quantity, image_url AS "imageUrl", category, source,
               aliases, last_seen_at AS "lastSeenAt", updated_at AS "updatedAt"
        FROM ziiply_ean_products
        WHERE name ILIKE ${like}
           OR brand ILIKE ${like}
           OR EXISTS (SELECT 1 FROM unnest(aliases) a WHERE a ILIKE ${like})
        ORDER BY last_seen_at DESC
        LIMIT 20
      `;
      return NextResponse.json({ ok: true, products: rows });
    }

    return NextResponse.json({ ok: false, error: "Provide ean or q" }, { status: 400 });
  } catch (error) {
    console.error("EAN bank GET failed", error);
    return NextResponse.json({ ok: false, error: "EAN bank unavailable" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ProductInput;
    const ean = normalizeEan(body.ean);
    const name = clean(body.name, 300);
    if (!ean) {
      return NextResponse.json({ ok: false, error: "Valid EAN is required" }, { status: 400 });
    }

    const brand = clean(body.brand, 160) || null;
    const quantity = clean(body.quantity, 120) || null;
    const imageUrl = clean(body.imageUrl, 1000) || null;
    const category = clean(body.category, 160) || null;
    const source = clean(body.source, 120) || null;
    const aliasList = aliases(body.aliases);
    const sql = db();
    await ensureSchema(sql);

    const rows = await sql`
      INSERT INTO ziiply_ean_products (ean, name, brand, quantity, image_url, category, source, aliases)
      VALUES (${ean}, ${name}, ${brand}, ${quantity}, ${imageUrl}, ${category}, ${source}, ${aliasList})
      ON CONFLICT (ean) DO UPDATE SET
        name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE ziiply_ean_products.name END,
        brand = COALESCE(EXCLUDED.brand, ziiply_ean_products.brand),
        quantity = COALESCE(EXCLUDED.quantity, ziiply_ean_products.quantity),
        image_url = COALESCE(EXCLUDED.image_url, ziiply_ean_products.image_url),
        category = COALESCE(EXCLUDED.category, ziiply_ean_products.category),
        source = COALESCE(EXCLUDED.source, ziiply_ean_products.source),
        aliases = ARRAY(SELECT DISTINCT x FROM unnest(ziiply_ean_products.aliases || EXCLUDED.aliases) x),
        last_seen_at = NOW(),
        updated_at = NOW()
      RETURNING ean, name, brand, quantity, image_url AS "imageUrl", category, source,
                aliases, first_seen_at AS "firstSeenAt", last_seen_at AS "lastSeenAt",
                updated_at AS "updatedAt"
    `;
    return NextResponse.json({ ok: true, product: rows[0] });
  } catch (error) {
    console.error("EAN bank POST failed", error);
    return NextResponse.json({ ok: false, error: "EAN bank unavailable" }, { status: 500 });
  }
}
