import { NextResponse } from "next/server";
import { recordPublicationRun } from "@/app/components/ziiply/offerSearch/publicationRunLog";
import { searchSelectedSKaupatOffersV11, searchKSupermarketOffers, searchKMarketOffers } from "@/app/components/ziiply/offerSearch/ziiplyOfferSearchSources";
import eurosparFeed from "@/app/components/ziiply/offerSearch/providers/eurospar-feed.json";

export const dynamic = "force-dynamic";
export const maxDuration = 180;
const MASTER = "__ziiply_all_offers__";
const SOURCE_TIMEOUT_MS = 90_000;
const CHECK = "chain-parser-health";

function errorMessage(error: unknown) {
  return String(error).slice(0, 300);
}
async function record(input: Parameters<typeof recordPublicationRun>[0]) {
  // A missing database must never look like a successful health check.
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL missing for chain-parser-health");
  await recordPublicationRun(input);
}
async function measure(chain: string, source: string, task: () => Promise<any[]>) {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const rows = await Promise.race([
      task(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("source-timeout-after-90s")), SOURCE_TIMEOUT_MS);
      }),
    ]);
    const real = rows.filter((x: any) => !String(x?.title ?? "").startsWith("ETPROV "));
    const missingPrice = real.filter((x: any) => !String(x?.priceText ?? x?.price ?? "").trim()).length;
    const missingImage = real.filter((x: any) => !String(x?.imageUrl ?? x?.image ?? "").trim()).length;
    const missingCategory = real.filter((x: any) => !String(x?.category ?? x?.mainCategory ?? "").trim()).length;
    const ok = real.length > 0;
    await record({ chain, source, ok, count: real.length, outcome: ok ? "parser-health-ok" : "parser-health-empty", details: { missingPrice, missingImage, missingCategory } });
    return { chain, source, ok, count: real.length, missingPrice, missingImage, missingCategory };
  } catch (error) {
    const message = errorMessage(error);
    console.error("[chain-parser-health] source failed", source, message);
    // Do not suppress database write failures: the top-level handler must report them.
    await record({ chain, source, ok: false, count: 0, outcome: "parser-health-error", details: { error: message } });
    return { chain, source, ok: false, count: 0, error: message };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
export async function GET(request: Request) {
  if (process.env.CRON_SECRET && request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const startedAt = new Date().toISOString();
  try {
    // The start marker makes a missing/aborted run visible to Control Center.
    await record({ chain: "SYSTEM", source: CHECK, ok: false, count: 0, outcome: "workflow-running", details: { startedAt } });
    const results = await Promise.all([
      measure("S", "s-prisma-hyvinkaa", () => searchSelectedSKaupatOffersV11(MASTER, { storeName: "Prisma Hyvinkää", sStoreName: "Prisma Hyvinkää" } as any)),
      measure("K-SUPERMARKET", "k-supermarket-jokela", () => searchKSupermarketOffers(MASTER, { storeName: "K-Supermarket Jokela", kStoreName: "K-Supermarket Jokela", storeId: "ji1luTAL", kStoreId: "ji1luTAL" } as any)),
      measure("K-MARKET", "k-market-hakalantori", () => searchKMarketOffers(MASTER, { storeName: "K-Market Hakalantori", kStoreName: "K-Market Hakalantori", storeId: "aETRYhoN", kStoreId: "aETRYhoN" } as any)),
    ]);
    const sparOffers = Array.isArray((eurosparFeed as any).offers) ? (eurosparFeed as any).offers : [];
    const sparHealthy = Boolean((eurosparFeed as any).healthy) && sparOffers.length > 0;
    await record({ chain: "TOKMANNI-SPAR", source: "eurospar-validated-feed", ok: sparHealthy, count: sparOffers.length, outcome: sparHealthy ? "validated-feed-ok" : "validated-feed-empty-or-unhealthy", details: { issue: (eurosparFeed as any).issue, validity: (eurosparFeed as any).validity, missingPrice: sparOffers.filter((x: any) => !x.offerPrice).length, missingImage: sparOffers.filter((x: any) => !x.imageUrl).length, missingCategory: sparOffers.filter((x: any) => !x.category).length } });
    results.push({ chain: "TOKMANNI-SPAR", source: "eurospar-validated-feed", ok: sparHealthy, count: sparOffers.length });
    const ok = results.every(x => x.ok);
    await record({ chain: "SYSTEM", source: CHECK, ok, count: results.length, outcome: ok ? "parser-health-ok" : "parser-health-error", details: { startedAt, completedAt: new Date().toISOString(), failedSources: results.filter(x => !x.ok).map(x => x.source) } });
    return NextResponse.json({ ok, results }, { status: ok ? 200 : 503 });
  } catch (error) {
    console.error("[chain-parser-health] run failed", errorMessage(error));
    return NextResponse.json({ ok: false, error: "health-run-failed", message: errorMessage(error) }, { status: 503 });
  }
}
