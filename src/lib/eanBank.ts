import { neon } from "@neondatabase/serverless";

export type EanObservation = {
  ean?: unknown;
  name?: unknown;
  brand?: unknown;
  imageUrl?: unknown;
  category?: unknown;
  source?: unknown;
};

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeEan(value: unknown) {
  const ean = clean(value, 32).replace(/\D/g, "");
  return /^\d{8,14}$/.test(ean) ? ean : "";
}

export async function observeEanProductsBestEffort(observations: EanObservation[]) {
  const url = process.env.DATABASE_URL;
  if (!url || observations.length === 0) return;

  const rows = observations
    .map((item) => ({
      ean: normalizeEan(item.ean),
      name: clean(item.name, 300),
      brand: clean(item.brand, 160) || null,
      imageUrl: clean(item.imageUrl, 1000) || null,
      category: clean(item.category, 160) || null,
      source: clean(item.source, 120) || null,
    }))
    .filter((item) => item.ean);

  if (rows.length === 0) return;

  try {
    const sql = neon(url);
    for (const item of rows) {
      await sql`
        INSERT INTO ziiply_ean_products (ean, name, brand, image_url, category, source)
        VALUES (${item.ean}, ${item.name}, ${item.brand}, ${item.imageUrl}, ${item.category}, ${item.source})
        ON CONFLICT (ean) DO UPDATE SET
          name = CASE WHEN EXCLUDED.name <> '' THEN EXCLUDED.name ELSE ziiply_ean_products.name END,
          brand = COALESCE(EXCLUDED.brand, ziiply_ean_products.brand),
          image_url = COALESCE(EXCLUDED.image_url, ziiply_ean_products.image_url),
          category = COALESCE(EXCLUDED.category, ziiply_ean_products.category),
          source = COALESCE(EXCLUDED.source, ziiply_ean_products.source),
          last_seen_at = NOW(),
          updated_at = NOW()
      `;
    }
  } catch (error) {
    console.warn("EAN observation skipped", error);
  }
}
