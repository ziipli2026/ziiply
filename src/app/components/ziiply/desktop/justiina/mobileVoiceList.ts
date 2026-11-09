import { explainNormalSearch as explainZiiplyNormalSearch } from "../../search/searchEngine";
import { fixText, normalize, parseTerms } from "../../ziiplyCore";

// Copied unchanged from mobile getVoiceSearchInputV447; preserve compound product names.
function getVoiceSearchInputV447(value: string) {
    const raw = fixText(String(value || ""))
      .toLowerCase()
      .replace(/[.;:!?]+/g, " ")
      .replace(/\s+(ja|sekä|plus|sekä myös)\s+/gi, ", ")
      .replace(/\s+/g, " ")
      .trim();

    if (!raw) return "";

    const explicitTerms = parseTerms(raw);
    if (explicitTerms.length > 1) {
      return explicitTerms
        .map((term) => fixText(term).replace(/\s+/g, " ").trim())
        .filter(Boolean)
        .join(", ");
    }

    const fillerWords = new Set([
      "öö",
      "ööh",
      "tuota",
      "tota",
      "niinku",
      "sitten",
      "vielä",
      "kiitos",
      "hei",
      "hae",
      "etsi",
      "lisää",
    ]);

    const words = raw
      .replace(/[,]+/g, " ")
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 2 && !fillerWords.has(word));

    const terms: string[] = [];

    for (let index = 0; index < words.length; index += 1) {
      const word = words[index];
      const next = words[index + 1] || "";

      // Säilytetään yleisimmät kaksiosaiset tuotetermit yhtenä hakuna.
      if (
        (word === "coca" && next === "cola") ||
        (word === "pepsi" && next === "max") ||
        (word === "juhla" && next === "mokka") ||
        (word === "juhlamokka" && next === "kahvi") ||
        (word === "nauta" && next === "jauheliha") ||
        (word === "broilerin" && next === "filee") ||
        (word === "rasvaton" && next === "maito") ||
        (word === "kevyt" && next === "maito")
      ) {
        terms.push(`${word} ${next}`);
        index += 1;
        continue;
      }

      terms.push(word);
    }

    const uniqueTerms = Array.from(
      new Map(
        terms
          .map((term) => fixText(term).replace(/\s+/g, " ").trim())
          .filter(Boolean)
          .map((term) => [normalize(term), term]),
      ).values(),
    ).slice(0, 12);

    return uniqueTerms.join(", ");
  }

export function parseMobileVoiceList(value: string): string[] {
  return parseTerms(getVoiceSearchInputV447(value)).map(term => autocorrectNormalSearchTerm(fixText(term).trim())).filter(Boolean);
}

// Mobile normal-search canonicalization, used after splitting the spoken list.
export function autocorrectNormalSearchTerm(term: string) {
    const original = String(term || "").trim();
    if (!original) return original;

    // Autocorrect is only for text searches. Do not touch EAN/barcode searches.
    if (/^\d{6,14}$/.test(original.replace(/\D/g, ""))) {
      return original;
    }

    try {
      const intent = explainZiiplyNormalSearch(original) as any;
      const corrected = String(intent?.correctedQuery || intent?.canonicalQuery || original)
        .replace(/\s+/g, " ")
        .trim();

      return corrected || original;
    } catch {
      return original;
    }
  }
