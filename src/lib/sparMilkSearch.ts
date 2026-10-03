// A query-local relevance guard, not an EAN classification or database mutation.
const normalize = (value: string) => value.toLocaleLowerCase("fi-FI").normalize("NFKC");
const milkWord = /(?:^|[^a-zåäö])(?:maito|maidot|maidon|maitoa|(?:kevyt|täys|rasvaton|laktoositon|kaura|soija|manteli|riisi)?maito(?:juoma|jauhe)?|(?:rasvaton|laktoositon|kondensoitu)\s+maito(?:juoma)?)(?:$|[^a-zåäö])/u;
export function filterSparMilkQuery<T extends { name?: string }>(items: T[], search: string): T[] {
  if (!/^(?:maito|maidot|maidon|maitoa)$/u.test(normalize(search).trim())) return items;
  return items.filter(item => milkWord.test(normalize(String(item.name ?? ""))));
}
