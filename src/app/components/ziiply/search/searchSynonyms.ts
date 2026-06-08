/**
 * Ziiply normal search synonym seed list.
 * Location: src/app/components/ziiply/search/searchSynonyms.ts
 *
 * This is the hand-written seed. Later this can be enriched from S-kaupat
 * autocomplete/category responses and Ziiply learning logs.
 */

import { normalizeFi, uniqueStable } from "./searchNormalizer";

export type ZiiplySynonymGroup = {
  canonical: string;
  terms: string[];
  categoryHints: string[];
};

export const ZIIPLY_SYNONYM_GROUPS: ZiiplySynonymGroup[] = [
  {
    canonical: "maito",
    terms: ["maito", "kevytmaito", "rasvaton maito", "täysmaito", "laktoositon maito", "maitojuoma"],
    categoryHints: ["maidot", "maitotuotteet"],
  },
  {
    canonical: "kahvi",
    terms: ["kahvi", "suodatinkahvi", "jauhettu kahvi", "kahvipapu", "juhla mokka", "presidentti", "kulta katriina"],
    categoryHints: ["kahvit", "kuivatuotteet"],
  },
  {
    canonical: "cola",
    terms: ["cola", "kokis", "cokis", "kookis", "coca cola", "coca-cola", "pepsi", "pepsi max", "virvoitusjuoma", "limsa"],
    categoryHints: ["cola", "virvoitusjuomat", "juomat"],
  },
  {
    canonical: "jauheliha",
    terms: ["jauheliha", "naudan jauheliha", "sika nauta", "sika-nauta", "paistijauheliha", "nauta 10", "nauta 17"],
    categoryHints: ["lihat", "tuoretuotteet"],
  },
  {
    canonical: "kananmuna",
    terms: ["kananmuna", "kananmunat", "munat", "muna"],
    categoryHints: ["kananmunat", "maitotuotteet"],
  },
  {
    canonical: "leipä",
    terms: ["leipä", "ruisleipä", "paahtoleipä", "sämpylä", "rieska"],
    categoryHints: ["leivät", "leipomo"],
  },
];

export function getSynonymGroupForQuery(query: string): ZiiplySynonymGroup | null {
  const q = normalizeFi(query);
  if (!q) return null;

  return (
    ZIIPLY_SYNONYM_GROUPS.find((group) => {
      const terms = [group.canonical, ...group.terms].map(normalizeFi);
      return terms.some((term) => term === q || q.includes(term) || term.includes(q));
    }) || null
  );
}

export function expandSearchSynonyms(query: string, limit = 10): string[] {
  const q = normalizeFi(query);
  const group = getSynonymGroupForQuery(query);
  const terms = group ? [group.canonical, ...group.terms] : [query];
  return uniqueStable([q, ...terms.map(normalizeFi)].filter(Boolean)).slice(0, limit);
}
