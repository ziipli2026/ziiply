/**
 * Ziiply Search Intent AI-ready layer
 *
 * Purpose:
 * - Add a lightweight "AI-like" intent layer before store search / scoring.
 * - Keep store product hierarchy and existing scoring as source of truth.
 * - Prevent obvious false matches like:
 *   "maito" -> maitosuklaa / laktoositon voi / maitojauhe
 *
 * Suggested location:
 * src/app/components/ziiply/searchIntentAI.ts
 */

export type ZiiplySearchIntentName =
  | "milk_drink"
  | "cola"
  | "coffee"
  | "eggs"
  | "meat"
  | "bread"
  | "cheese"
  | "yogurt"
  | "butter"
  | "cream"
  | "fish"
  | "fruit"
  | "vegetable"
  | "unknown";

export type ZiiplySearchIntent = {
  originalQuery: string;
  canonicalQuery: string;
  intent: ZiiplySearchIntentName;
  confidence: number;
  includeTerms: string[];
  preferredTerms: string[];
  excludeTerms: string[];
  categoryHints: string[];
  notes?: string[];
};

export type IntentProductLike = {
  name?: string | null;
  category?: string | null;
  brandName?: string | null;
  comparisonPriceUnit?: string | null;
};

function normalizeFi(value: string | null | undefined) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,;:!?()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => {
    const clean = normalizeFi(term);
    if (!clean) return false;
    return text === clean || text.includes(clean);
  });
}

function hasWord(text: string, word: string) {
  const clean = normalizeFi(word);
  if (!clean) return false;
  return new RegExp(`(^|\\s)${clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\s|$)`).test(text);
}

const INTENTS: Record<Exclude<ZiiplySearchIntentName, "unknown">, Omit<ZiiplySearchIntent, "originalQuery" | "canonicalQuery" | "intent">> = {
  milk_drink: {
    confidence: 0.92,
    includeTerms: ["maito", "kevytmaito", "täysmaito", "rasvaton maito", "laktoositon maito", "maitojuoma"],
    preferredTerms: ["maito", "kevytmaito", "täysmaito", "rasvaton maito"],
    excludeTerms: ["maitosuklaa", "suklaa", "voi", "levite", "jogurtti", "rahka", "kerma", "maitojauhe", "korvike", "kaakao", "vanukas"],
    categoryHints: ["maidot", "maitotuotteet", "juomat"],
    notes: ["Maito tulkitaan ensisijaisesti juotavaksi maidoksi, ei maitopohjaisiksi tuotteiksi."],
  },
  cola: {
    confidence: 0.9,
    includeTerms: ["cola", "coca cola", "coca-cola", "pepsi", "zero", "max"],
    preferredTerms: ["coca cola", "coca-cola", "pepsi", "cola zero", "pepsi max"],
    excludeTerms: ["makeinen", "karkki", "jäätelö", "siirappi"],
    categoryHints: ["virvoitusjuomat", "juomat"],
  },
  coffee: {
    confidence: 0.88,
    includeTerms: ["kahvi", "juhla mokka", "presidentti", "suodatinjauhatus", "kahvipapu"],
    preferredTerms: ["kahvi", "jauhettu kahvi", "kahvipavut"],
    excludeTerms: ["kahvinsuodatin", "suodatinpussi", "muki", "kapselikone", "kahvikerma"],
    categoryHints: ["kahvit", "kuivatuotteet"],
  },
  eggs: {
    confidence: 0.9,
    includeTerms: ["kananmuna", "kananmunat", "munat"],
    preferredTerms: ["kananmuna", "kananmunat"],
    excludeTerms: ["suklaamuna", "pääsiäismuna", "munavoi", "majoneesi"],
    categoryHints: ["kananmunat", "maitotuotteet"],
  },
  meat: {
    confidence: 0.82,
    includeTerms: ["jauheliha", "naudan", "sika-nauta", "broileri", "kana", "possu", "liha"],
    preferredTerms: ["jauheliha", "broileri", "kana", "naudanliha"],
    excludeTerms: ["mauste", "kastike", "liemikuutio", "kasvis"],
    categoryHints: ["lihat", "tuoretuotteet"],
  },
  bread: {
    confidence: 0.82,
    includeTerms: ["leipä", "ruisleipä", "paahtoleipä", "sämpylä", "rieska"],
    preferredTerms: ["leipä", "ruisleipä", "paahtoleipä"],
    excludeTerms: ["korppujauho", "krutonki", "näkkileipälevite"],
    categoryHints: ["leivät", "leipomo"],
  },
  cheese: {
    confidence: 0.84,
    includeTerms: ["juusto", "emmental", "edam", "oltermanni", "kermajuusto"],
    preferredTerms: ["juusto", "edam", "emmental", "oltermanni"],
    excludeTerms: ["juustonaksu", "juustokakku", "juustodippi"],
    categoryHints: ["juustot", "maitotuotteet"],
  },
  yogurt: {
    confidence: 0.84,
    includeTerms: ["jogurtti", "jugurtti", "rahka", "viili"],
    preferredTerms: ["jogurtti", "rahka", "viili"],
    excludeTerms: ["jogurttirusina", "mysli"],
    categoryHints: ["jogurtit", "maitotuotteet"],
  },
  butter: {
    confidence: 0.84,
    includeTerms: ["voi", "levite", "margariini"],
    preferredTerms: ["voi", "levite", "margariini"],
    excludeTerms: ["voileipä", "maapähkinävoi", "kaakaovoi"],
    categoryHints: ["rasvat", "maitotuotteet"],
  },
  cream: {
    confidence: 0.84,
    includeTerms: ["kerma", "ruokakerma", "kuohukerma", "vispikerma"],
    preferredTerms: ["ruokakerma", "kuohukerma", "kerma"],
    excludeTerms: ["jäätelö", "kermakakku", "kahvikermajauhe"],
    categoryHints: ["kermat", "maitotuotteet"],
  },
  fish: {
    confidence: 0.8,
    includeTerms: ["lohi", "kala", "tonnikala", "kirjolohi", "seiti"],
    preferredTerms: ["lohi", "kala", "tonnikala"],
    excludeTerms: ["kalanruoka", "kalakastike"],
    categoryHints: ["kalat", "tuoretuotteet", "säilykkeet"],
  },
  fruit: {
    confidence: 0.78,
    includeTerms: ["banaani", "omena", "appelsiini", "päärynä", "hedelmä"],
    preferredTerms: ["banaani", "omena", "appelsiini"],
    excludeTerms: ["mehu", "hillo", "jogurtti"],
    categoryHints: ["hedelmät", "tuoretuotteet"],
  },
  vegetable: {
    confidence: 0.78,
    includeTerms: ["tomaatti", "kurkku", "salaatti", "peruna", "porkkana", "vihannes"],
    preferredTerms: ["tomaatti", "kurkku", "peruna", "porkkana"],
    excludeTerms: ["sipsi", "mauste", "kastike"],
    categoryHints: ["vihannekset", "tuoretuotteet"],
  },
};

export function resolveSearchIntentAI(query: string): ZiiplySearchIntent {
  const q = normalizeFi(query);

  if (!q) {
    return {
      originalQuery: query,
      canonicalQuery: "",
      intent: "unknown",
      confidence: 0,
      includeTerms: [],
      preferredTerms: [],
      excludeTerms: [],
      categoryHints: [],
    };
  }

  const directRules: Array<[ZiiplySearchIntentName, (value: string) => boolean, string]> = [
    ["milk_drink", (v) => hasWord(v, "maito") || hasAny(v, ["kevytmaito", "täysmaito", "rasvaton maito", "maitojuoma"]), "maito"],
    ["cola", (v) => hasAny(v, ["cola", "coca cola", "coca-cola", "pepsi", "pepsi max"]), q],
    ["coffee", (v) => hasWord(v, "kahvi") || hasAny(v, ["juhla mokka", "presidentti"]), q],
    ["eggs", (v) => hasAny(v, ["kananmuna", "kananmunat"]) || hasWord(v, "munat"), "kananmuna"],
    ["meat", (v) => hasAny(v, ["jauheliha", "broileri", "kana", "naudan", "sika-nauta"]), q],
    ["bread", (v) => hasAny(v, ["leipä", "ruisleipä", "paahtoleipä", "sämpylä", "rieska"]), q],
    ["cheese", (v) => hasWord(v, "juusto") || hasAny(v, ["emmental", "edam", "oltermanni"]), q],
    ["yogurt", (v) => hasAny(v, ["jogurtti", "jugurtti", "rahka", "viili"]), q],
    ["butter", (v) => hasWord(v, "voi") || hasAny(v, ["margariini", "levite"]), q],
    ["cream", (v) => hasWord(v, "kerma") || hasAny(v, ["ruokakerma", "kuohukerma", "vispikerma"]), q],
    ["fish", (v) => hasAny(v, ["lohi", "kala", "tonnikala", "kirjolohi", "seiti"]), q],
    ["fruit", (v) => hasAny(v, ["banaani", "omena", "appelsiini", "päärynä"]), q],
    ["vegetable", (v) => hasAny(v, ["tomaatti", "kurkku", "salaatti", "peruna", "porkkana"]), q],
  ];

  for (const [intent, matcher, canonicalQuery] of directRules) {
    if (matcher(q) && intent !== "unknown") {
      const base = INTENTS[intent as Exclude<ZiiplySearchIntentName, "unknown">];
      return {
        originalQuery: query,
        canonicalQuery,
        intent,
        ...base,
      };
    }
  }

  return {
    originalQuery: query,
    canonicalQuery: q,
    intent: "unknown",
    confidence: 0.35,
    includeTerms: [q],
    preferredTerms: [q],
    excludeTerms: [],
    categoryHints: [],
  };
}

export function getIntentSearchQueries(query: string, maxQueries = 5): string[] {
  const intent = resolveSearchIntentAI(query);
  const candidates = [
    intent.canonicalQuery,
    ...intent.preferredTerms,
    ...intent.includeTerms,
    query,
  ]
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set(candidates)).slice(0, maxQueries);
}

export function isProductAllowedByIntent(product: IntentProductLike, intent: ZiiplySearchIntent): boolean {
  if (intent.intent === "unknown" || intent.confidence < 0.55) return true;

  const name = normalizeFi(product.name);
  const category = normalizeFi(product.category);
  const brand = normalizeFi(product.brandName);
  const unit = normalizeFi(product.comparisonPriceUnit);
  const text = [name, category, brand, unit].filter(Boolean).join(" ");

  if (!text) return false;

  if (hasAny(text, intent.excludeTerms)) return false;

  // Strong category hint can pass even when exact wording differs.
  if (intent.categoryHints.length > 0 && hasAny(category, intent.categoryHints)) {
    if (intent.intent === "milk_drink" && hasAny(text, ["suklaa", "voi", "jogurtti", "kerma", "maitojauhe"])) return false;
    return true;
  }

  if (hasAny(text, intent.includeTerms) || hasAny(text, intent.preferredTerms)) return true;

  return false;
}

export function scoreProductIntentFit(product: IntentProductLike, intent: ZiiplySearchIntent): number {
  if (intent.intent === "unknown") return 0;

  const name = normalizeFi(product.name);
  const category = normalizeFi(product.category);
  const brand = normalizeFi(product.brandName);
  const text = [name, category, brand].filter(Boolean).join(" ");

  if (!text) return -50;
  if (hasAny(text, intent.excludeTerms)) return -100;

  let score = 0;

  if (hasAny(name, intent.preferredTerms)) score += 35;
  if (hasAny(name, intent.includeTerms)) score += 20;
  if (hasAny(category, intent.categoryHints)) score += 25;

  // Specific guardrails
  if (intent.intent === "milk_drink") {
    if (hasWord(name, "maito")) score += 30;
    if (hasAny(name, ["kevytmaito", "täysmaito", "rasvaton maito"])) score += 45;
    if (hasAny(text, ["suklaa", "voi", "jogurtti", "kerma", "maitojauhe"])) score -= 80;
  }

  return score;
}

export function filterAndRankByIntent<T extends IntentProductLike>(products: T[], query: string): T[] {
  const intent = resolveSearchIntentAI(query);

  return products
    .filter((product) => isProductAllowedByIntent(product, intent))
    .map((product) => ({ product, intentScore: scoreProductIntentFit(product, intent) }))
    .sort((a, b) => b.intentScore - a.intentScore)
    .map((item) => item.product);
}

/**
 * Debug helper for desktop debug panels.
 */
export function explainSearchIntent(query: string) {
  const intent = resolveSearchIntentAI(query);
  return {
    intent: intent.intent,
    canonicalQuery: intent.canonicalQuery,
    confidence: intent.confidence,
    includeTerms: intent.includeTerms,
    excludeTerms: intent.excludeTerms,
    categoryHints: intent.categoryHints,
  };
}
