import { normalizeSearchText } from "./searchNormalizer";

export type ZiiplySynonymGroup = {
  canonical: string;
  terms: string[];
  categories?: string[];
  notes?: string[];
};

export const ZIIPLY_SYNONYM_GROUPS: ZiiplySynonymGroup[] = [
  {
    canonical: "maito",
    terms: [
      "maito",
      "kevytmaito",
      "rasvaton maito",
      "täysmaito",
      "laktoositon maito",
      "maitojuoma",
      "luomumaito",
      "hyla maito",
    ],
    categories: ["maidot", "maidot ja piimät", "maito, munat ja rasvat"],
  },
  {
    canonical: "kahvi",
    terms: [
      "kahvi",
      "suodatinkahvi",
      "jauhettu kahvi",
      "juhla mokka",
      "presidentti",
      "kulta katriina",
      "kahvipapu",
    ],
    categories: ["kahvit", "kuivatuotteet"],
  },
  {
    canonical: "cola",
    terms: [
      "cola",
      "coca cola",
      "coca-cola",
      "pepsi",
      "pepsi max",
      "cola zero",
      "virvoitusjuoma",
      "limsa",
      "limonadi",
    ],
    categories: ["virvoitusjuomat", "juomat"],
  },
  {
    canonical: "jauheliha",
    terms: [
      "jauheliha",
      "naudan jauheliha",
      "sika nauta",
      "sika-nauta",
      "broilerin jauheliha",
      "kanan jauheliha",
    ],
    categories: ["lihat", "tuoretuotteet"],
  },
  {
    canonical: "makkara",
    terms: [
      "makkara",
      "grillimakkara",
      "lenkkimakkara",
      "ruokamakkara",
      "saunamakkara",
      "juustomakkara",
      "kabanossi",
      "nakki",
      "nakit",
      "kuoreton nakki",
      "grillinakki",
      "hk sininen",
      "wilhelm",
      "atria",
      "camping",
      "grillikota",
      "grillimestari",
    ],
    categories: [
      "makkarat",
      "lihat",
      "liha ja kala",
      "tuoretuotteet",
    ],
    notes: [
      "ihmisravinto",
      "elintarvike",
      "ruokamakkara",
    ],
  },
  {
    canonical: "koiranmakkara",
    terms: [
      "koiranmakkara",
      "koiran makkara",
      "koiranruoka",
      "koiran märkäruoka",
      "koiranruokamakkara",
      "koiralle makkara",
      "pedigree",
      "cesar",
    ],
    categories: [
      "lemmikit",
      "koiranruoka",
      "lemmikkiruoka",
      "koirien ruoat",
    ],
    notes: [
      "lemmikki",
      "ei ihmisravinto",
      "erillinen intentti makkara-hausta",
    ],
  },
];

export function getSynonymGroupForQuery(query: string): ZiiplySynonymGroup | null {
  const q = normalizeSearchText(query);
  if (!q) return null;

  return (
    ZIIPLY_SYNONYM_GROUPS.find((group) => {
      const canonical = normalizeSearchText(group.canonical);
      const terms = group.terms.map(normalizeSearchText);

      return canonical === q || terms.includes(q) || terms.some((term) => term.includes(q) || q.includes(term));
    }) || null
  );
}

export function getSynonymTermsForQuery(query: string): string[] {
  const group = getSynonymGroupForQuery(query);
  if (!group) return [];

  return Array.from(new Set([group.canonical, ...group.terms, ...(group.categories || [])]))
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

export function expandQueryWithSynonyms(query: string, maxTerms = 12): string[] {
  const clean = normalizeSearchText(query);
  const terms = [query, clean, ...getSynonymTermsForQuery(query)]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  return Array.from(new Set(terms)).slice(0, maxTerms);
}

export const expandSearchSynonyms = expandQueryWithSynonyms;

export function isSynonymMatch(query: string, value: string): boolean {
  const qTerms = getSynonymTermsForQuery(query).map(normalizeSearchText);
  const v = normalizeSearchText(value);

  if (!v || qTerms.length === 0) return false;

  return qTerms.some((term) => v === term || v.includes(term) || term.includes(v));
}
