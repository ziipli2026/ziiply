/** Tjek source department is category evidence, not EAN identity. */
export const TJEK_DEPARTMENT_CATEGORIES: Readonly<Record<string,string>> = Object.freeze({
  'fruits-and-vegetables':'Hevi',
  'beverages':'Juomat',
  'frozen':'Pakasteet',
  'household':'Kodinhoito',
  'beauty':'Hygienia & kosmetiikka',
  'cold-cuts':'Liha & makkarat',
});
/** Return null for broad or uncertain departments (dairy-and-cold, colonial,
 * bread-and-cakes, snacks-and-candies, meat-and-fish, electronics, apparel, etc.) until verified mapping exists. */
export function tjekDepartmentCategory(slug: unknown): string | null {
  if (typeof slug !== 'string') return null;
  return Object.prototype.hasOwnProperty.call(TJEK_DEPARTMENT_CATEGORIES,slug)
    ? TJEK_DEPARTMENT_CATEGORIES[slug] : null;
}

/** Explicit non-grocery Tjek departments. Broad 'home' is excluded as a whole:
 * it includes furniture, appliances and textiles; no product-name exceptions.
 * Unknown departments remain visible pending evidence. */
export const TJEK_NON_GROCERY_DEPARTMENTS: ReadonlySet<string> = new Set([
  'electronics', 'apparel', 'entertainment',
  'automotive', 'outdoor', 'sports', 'pharmacy', 'home',
  'do-it-yourself',
]);
export function isTjekNonGroceryDepartment(slug: unknown): boolean {
  return typeof slug === 'string' && TJEK_NON_GROCERY_DEPARTMENTS.has(slug);
}

/** Apply the same source-department gate to live offers and persisted snapshots. */
/** Some source departments mix consumables with appliances and garden items.
 * Keep these narrowly scoped, source-verified product exclusions separate from
 * broad department rules; never classify food by an old inferred category. */
const TJEK_NON_GROCERY_TITLE_PATTERN =
  /HIUSTENMUOTOILULAITTEET|PARRANAJOKONE|SÄHKÖHAMMASHARJA|LED-VALOMASKI|\bTRIMMERI\b|LIHASHUOLTOVASARA|DIAGNOSTIIKKAVAAKA|\bPÖLYHUISKAA\b|VAIHTOTERÄ|PERHOSORKIDEA|\bYÖASUJA\b/i;

export function filterTjekGroceryRows<T extends {title?: unknown;name?: unknown;debug?: {tjekDepartmentSlug?: unknown};tjekDepartmentSlug?: unknown}>(rows: T[]): T[] {
  return rows.filter(row => {
    const slug = row.debug?.tjekDepartmentSlug ?? row.tjekDepartmentSlug;
    if (isTjekNonGroceryDepartment(slug)) return false;
    // Only apply title exclusions when the source department is verified.
    if (typeof slug !== 'string' || !slug) return true;
    const title = typeof row.title === 'string' ? row.title : typeof row.name === 'string' ? row.name : '';
    if (slug === 'other' && /(?:TOPPATAKKI|COLLEGEHUPPARI|COLLEGEPAITA|COLLEGEHOUSUT|FLANELLIHOUSUT|\\bNEULE\\b|NASTAKENGÄT|PITOPOHJAKENGÄT|FLEECEVAATTEET|LÄMMITTELYTAKKI|NAHKA-NILKKURIT|TALVIKENGÄT|TOPPAHOUSUT|YÖASUJA)/i.test(title)) return false;
    return !TJEK_NON_GROCERY_TITLE_PATTERN.test(title);
  });
}

/** Normalize verified Tjek categories on both live rows and old persisted snapshots.
 * Unknown/mixed departments retain their existing title-based category.
 * No database writes and no mutation of the input rows. */
export function normalizeTjekGroceryCategories<T extends {
  title?: unknown; name?: unknown; category?: unknown; categoryPath?: unknown;
  productGroup?: unknown; mainCategory?: unknown;
  debug?: {tjekDepartmentSlug?: unknown;categorySource?: unknown};
  tjekDepartmentSlug?: unknown;
}>(rows: T[]): T[] {
  return filterTjekGroceryRows(rows).map(row => {
    const slug = row.debug?.tjekDepartmentSlug ?? row.tjekDepartmentSlug;
    // The source's broad "other" department mixes clothing, cosmetics and food.
    // These two verified consumable types are more precise than legacy "Muut".
    const title = typeof row.title === 'string' ? row.title : typeof row.name === 'string' ? row.name : '';
    const otherCategory = slug === 'other' && /(?:MEIKINKIINNITYSSUIHKE|NESTESAIPPUOIDEN TÄYTTÖPUSSIT)/i.test(title)
      ? 'Hygienia & kosmetiikka' : null;
    const mapped = tjekDepartmentCategory(slug) ?? otherCategory;
    if (!mapped) return row;
    if (row.category === mapped && row.categoryPath === mapped
      && row.productGroup === mapped && row.mainCategory === mapped
      && row.debug?.categorySource === 'tjek-department') return row;
    return {...row, category:mapped, categoryPath:mapped, productGroup:mapped,
      mainCategory:mapped, debug:{...row.debug,categorySource:'tjek-department'}} as T;
  });
}
