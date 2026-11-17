/** Tjek source department is category evidence, not EAN identity. */
export const TJEK_DEPARTMENT_CATEGORIES: Readonly<Record<string,string>> = Object.freeze({
  'fruits-and-vegetables':'Hevi',
  'beverages':'Juomat',
  'frozen':'Pakasteet',
  'household':'Kodinhoito',
  'beauty':'Hygienia & kosmetiikka',
});
/** Return null for broad or uncertain departments (dairy-and-cold, colonial,
 * bread-and-cakes, meat-and-fish, electronics, apparel, etc.) until verified mapping exists. */
export function tjekDepartmentCategory(slug: unknown): string | null {
  if (typeof slug !== 'string') return null;
  return Object.prototype.hasOwnProperty.call(TJEK_DEPARTMENT_CATEGORIES,slug)
    ? TJEK_DEPARTMENT_CATEGORIES[slug] : null;
}

/** Explicit non-grocery Tjek departments. Unknown and mixed departments remain
 * visible: no title-based exclusions or guessed product identities. */
export const TJEK_NON_GROCERY_DEPARTMENTS: ReadonlySet<string> = new Set([
  'electronics', 'apparel', 'entertainment',
  'automotive', 'outdoor', 'sports', 'pharmacy',
]);
export function isTjekNonGroceryDepartment(slug: unknown): boolean {
  return typeof slug === 'string' && TJEK_NON_GROCERY_DEPARTMENTS.has(slug);
}
