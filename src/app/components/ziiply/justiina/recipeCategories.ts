/** Product-group vocabulary, shared by query generation and result validation.
 * No brands, individual products or manufacturer-specific exceptions belong here.
 */
type Category = { id: string; label: string; nouns: string[]; metadata: RegExp };
const categories: Category[] = [
  { id: "stocks", label: "Liemet ja fondit", nouns: ["liemitiiviste", "liemikuutio", "annosfondi", "fondi", "liemi"], metadata: /liem|fond|bouillon|stock/ },
  { id: "loop-sausages", label: "Lenkkimakkarat", nouns: ["lenkkimakkara", "uunilenkki", "lenkki"], metadata: /lenkkimakkar|uunilenk|lenkit/ },
  { id: "sausages", label: "Makkarat", nouns: ["grillimakkara", "ruokamakkara", "makkara"], metadata: /makkar/ },
];

export function cleanRecipeQuery(input: string): string {
  return input.normalize("NFC").toLocaleLowerCase("fi")
    .replace(/[™®]/g, "").replace(/\s+(?:tai|ja)\s*[,;:.!?]*$/u, "")
    .replace(/\s+/g, " ").trim();
}

/** Conservative suffix variants; do not blindly remove the final vowel of every word. */
function wordForms(word: string): string[] {
  const forms = new Set([word]);
  if (word.length > 4) {
    if (/(aa|ää)$/u.test(word)) forms.add(word.slice(0, -1));
    if (/[iuy]a$/u.test(word) || /[iy]ä$/u.test(word)) forms.add(word.slice(0, -1));
    if (/n$/u.test(word)) forms.add(word.slice(0, -1));
  }
  return [...forms];
}
function words(text: string): string[] {
  return cleanRecipeQuery(text).match(/[\p{L}\p{N}]+/gu) || [];
}
function categoryWord(word: string, category: Category): string | undefined {
  return category.nouns.find(noun => wordForms(word).some(form => form.endsWith(noun)));
}
export function recipeCategory(input: string): Category | null {
  return categories.find(category => words(input).some(word => categoryWord(word, category))) || null;
}
export function normalizeRecipeCategoryQuery(input: string): string {
  const category = recipeCategory(input);
  if (!category) return cleanRecipeQuery(input);
  return cleanRecipeQuery(input).split(" ").map(word => {
    const noun = categoryWord(word, category);
    return noun ? wordForms(word).find(form => form.endsWith(noun)) || word : word;
  }).join(" ");
}

export function recipeCategoryQueries(input: string): string[] {
  const category = recipeCategory(input);
  if (!category) return [];
  const query = normalizeRecipeCategoryQuery(input);
  const tokens = words(query);
  // Split compound category nouns for providers that index "naudan fondi" separately.
  const split = tokens.flatMap(word => {
    const noun = categoryWord(word, category);
    return noun && word !== noun ? [word.slice(0, -noun.length), noun] : [word];
  });
  const qualifiers = tokens.filter(word => !categoryWord(word, category));
  return [...new Set([query, split.join(" "), ...(qualifiers.length ? [qualifiers.join(" ")] : []),
    ...tokens.flatMap(word => { const noun = categoryWord(word, category); return noun ? [noun] : []; })])].filter(Boolean);
}

export function recipeCategoryRejection(input: string, product: { name?: string; category?: string }): string | null {
  const expected = recipeCategory(input);
  if (!expected) return null;
  const metadata = cleanRecipeQuery(product.category || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // These are product groups, irrespective of incidental ingredient words in the title.
  if (/lasten|lapset|vauva|baby|nuudel|noodle|pasta|valmisruo|valmisater|lemmik/.test(metadata)) return "recipe_category_mismatch";
  const titleCategory = recipeCategory(product.name || "");
  const titleMatches = titleCategory?.id === expected.id || (expected.id === "stocks" && /\bfond\b/.test(cleanRecipeQuery(product.name || "")));
  const metadataMatches = expected.metadata.test(metadata);
  if (!metadataMatches && !titleMatches) return "recipe_category_required";
  // Explicit, unrelated grocery branches override a misleading title.
  if (metadata.includes("/") && !metadataMatches && /^(?:maito|hedelmat|juomat|makeiset|leivat|pakasteet)/.test(metadata)) return "recipe_category_mismatch";
  const offered = words(product.name || "").flatMap(wordForms);
  const qualifiers = words(normalizeRecipeCategoryQuery(input)).flatMap(word => {
    const noun = categoryWord(word, expected);
    return noun ? (word !== noun ? [word.slice(0, -noun.length)] : []) : [word];
  });
  if (!qualifiers.every(word => wordForms(word).some(form => offered.some(value => form.length <= 3 ? value === form : value.includes(form))))) return "recipe_identity_missing";
  return null;
}
