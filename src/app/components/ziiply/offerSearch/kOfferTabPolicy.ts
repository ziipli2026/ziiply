export type KOfferTabRow = {
  title?: unknown;
  name?: unknown;
  productName?: unknown;
  brandName?: unknown;
  price?: unknown;
  offerPrice?: unknown;
  priceText?: unknown;
  packageSize?: unknown;
  ean?: unknown;
  campaignType?: unknown;
};

function normalize(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " ja ")
    .replace(/[^a-z0-9åäö\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SEMANTIC_STOP_WORDS = new Set(["era","tai","ja","seka","suomi"]);
function semanticTokens(row: KOfferTabRow): string[] {
  return normalize([row.title || row.name || row.productName].filter(Boolean).join(" "))
    .split(" ")
    .filter(token => token.length >= 3 && !SEMANTIC_STOP_WORDS.has(token) && !/^\d/.test(token));
}
function packageTokens(row: KOfferTabRow): string[] {
  const raw = [row.title || row.name || row.productName, row.packageSize]
    .filter(Boolean).join(" ").toLowerCase();
  return raw.match(/\b\d+(?:[.,]\d+)?\s*(?:kg|g|l|ml|cl|kpl|pkt|prk|plo|tlk|rl)\b/g)
    ?.map(token => token.replace(",", ".").replace(/\s+/g, "")) || [];
}
function semanticSameProduct(a: KOfferTabRow, b: KOfferTabRow): boolean {
  const ap=priceNumber(a), bp=priceNumber(b);
  if(ap == null || bp == null || Math.abs(ap-bp) > 0.001) return false;
  const A=semanticTokens(a), B=semanticTokens(b);
  if(!A.length || !B.length) return false;
  const bSet=new Set(B);
  const common=A.filter(token=>bSet.has(token));
  const score=common.length/Math.max(1,Math.min(A.length,B.length));
  const pa=packageTokens(a), pb=packageTokens(b);
  // If both sides expose package sizes, they must agree before semantic
  // name matching can suppress a local campaign copy.
  if(pa.length > 0 && pb.length > 0 && !pa.some(x=>pb.includes(x))) return false;
  if(common.length >= 2 && score >= 0.67) return true;
  if(common.length !== 1 || score < 1) return false;
  return pa.length > 0 && pb.length > 0 && pa.some(x=>pb.includes(x));
}

function productText(row: KOfferTabRow): string {
  return normalize([row.brandName, row.title || row.name || row.productName, row.packageSize].filter(Boolean).join(" "));
}

function priceNumber(row: KOfferTabRow): number | null {
  const raw = row.offerPrice ?? row.price ?? row.priceText;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const match = String(raw ?? "").replace(",", ".").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function kOfferOverlapKey(row: KOfferTabRow): string {
  const ean = String(row.ean ?? "").replace(/\D/g, "");
  const price = priceNumber(row);
  const identity = ean.length >= 8 ? "ean:" + ean : "text:" + productText(row);
  return identity + "|price:" + (price == null ? "" : price.toFixed(2));
}

/**
 * Tarjoukset is authoritative. A store campaign is suppressed only when it is
 * the same product at the same price as a current leaflet offer.
 */

export type KOfferTabAudit = {
  offerCount: number;
  campaignCount: number;
  duplicateCampaignCount: number;
  duplicateCampaigns: KOfferTabRow[];
  normalizedCategoryIssues: string[];
};

/** Shared audit for every K-chain Tarjoukset/Kampanjat feed. */
export function auditKOfferTabs(
  leafletOffers: readonly KOfferTabRow[],
  campaigns: readonly KOfferTabRow[],
): KOfferTabAudit {
  const duplicateCampaigns = campaigns.filter(row =>
    leafletOffers.some(offer => semanticSameProduct(offer, row)),
  );
  const normalizedCategoryIssues = campaigns
    .map(row => String((row as KOfferTabRow & { category?: unknown }).category ?? ""))
    .filter(Boolean)
    .filter(category => category !== category.trim() || /\s{2,}/.test(category));
  return {
    offerCount: leafletOffers.length,
    campaignCount: campaigns.length,
    duplicateCampaignCount: duplicateCampaigns.length,
    duplicateCampaigns,
    normalizedCategoryIssues,
  };
}

export function removeCampaignCopiesOfLeaflet<T extends KOfferTabRow>(
  leafletOffers: readonly T[],
  campaigns: readonly T[],
): T[] {
  const offerKeys = new Set(leafletOffers.map(kOfferOverlapKey).filter(key => !key.startsWith("text:|")));
  return campaigns.filter(row =>
    !offerKeys.has(kOfferOverlapKey(row)) &&
    !leafletOffers.some(offer => semanticSameProduct(offer, row))
  );
}
