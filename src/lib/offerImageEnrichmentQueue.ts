import { enrichOfferImage, type OfferImageCandidate } from "./offerImageEnrichment";

/**
 * Non-blocking enrichment batch planner. No network calls, no parser mutations.
 * The caller must supply approved image-bank candidates and persist accepted results.
 */
export type OfferImageJob = {
  chain: "prisma" | "s-market" | "citymarket" | "k-supermarket" | "k-market" | "lidl" | "tokmanni" | "spar";
  offerId: string;
  offer: OfferImageCandidate;
};
export type OfferImageOutcome = {
  chain: OfferImageJob["chain"];
  offerId: string;
  status: "already-present" | "enriched" | "unresolved";
  imageUrl?: string;
};
export function planImageEnrichment(jobs: OfferImageJob[]): OfferImageJob[] {
  const seen = new Set<string>();
  return jobs.filter(job => {
    if (job.offer.imageUrl || !(job.offer.ean || job.offer.productCode)) return false;
    const key = job.chain + ":" + job.offerId;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export async function resolveImageEnrichmentBatch(
  jobs: OfferImageJob[],
  lookup: (job: OfferImageJob) => Promise<OfferImageCandidate[]>,
  options: { maxJobs?: number } = {},
): Promise<OfferImageOutcome[]> {
  const limit = Math.max(0, Math.min(options.maxJobs ?? 25, 100));
  const selected = jobs.slice(0, limit);
  const outcomes: OfferImageOutcome[] = [];
  for (const job of selected) {
    if (job.offer.imageUrl) {
      outcomes.push({ chain: job.chain, offerId: job.offerId, status: "already-present", imageUrl: job.offer.imageUrl });
      continue;
    }
    try {
      const candidates = await lookup(job);
      const result = enrichOfferImage(job.offer, candidates);
      outcomes.push({
        chain: job.chain, offerId: job.offerId,
        status: result.imageUrl ? "enriched" : "unresolved",
        ...(result.imageUrl ? { imageUrl: result.imageUrl } : {}),
      });
    } catch {
      outcomes.push({ chain: job.chain, offerId: job.offerId, status: "unresolved" });
    }
  }
  return outcomes;
}
