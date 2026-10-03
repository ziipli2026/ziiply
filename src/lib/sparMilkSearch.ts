// A query-local relevance guard, not an EAN classification or database mutation.
const normalize = (value: string) => value.toLocaleLowerCase("fi-FI").normalize("NFKC");
// Product-type exclusions take precedence over milk compounds (e.g. kauramaito-öljypuhdistus).
const nonFoodMilk = /(?:öljypuhdistus|puhdistus(?:maito|öljy|vaahto|geeli)|kasvo(?:maito|voide|puhdistus)|vartalo(?:maito|voide)|shampoo|hoitoaine|suihkugeeli|tuttipullo|maitosuklaa|milk\s+caramel|milk\s+chocolate|\bsukat?\b|\bsukk[a-zåäö]*\b)/u;
const milkWord = /(?:^|[^a-zåäö])(?:maito|maidot|maidon|maitoa|(?:kevyt|täys|rasvaton|laktoositon|kaura|soija|manteli|riisi)?maito(?:juoma|jauhe)?|(?:rasvaton|laktoositon|kondensoitu|kaura|soija|manteli|riisi)\s+maito(?:juoma)?)(?:$|[^a-zåäö])/u;
export function filterSparMilkQuery<T extends { name?: string }>(items: T[], search: string): T[] {
  if (!/^(?:maito|maidot|maidon|maitoa)$/u.test(normalize(search).trim())) return items;
  return items.filter(item => { const name = normalize(String(item.name ?? "")); return !nonFoodMilk.test(name) && milkWord.test(name); });
}
