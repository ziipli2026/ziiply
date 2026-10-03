// Narrow relevance guard for the generic grocery query "maito".
// Does not classify EANs or change the stored product category.
const normalize = (value: string) => value.toLocaleLowerCase("fi-FI").normalize("NFKC");
const milkWord = /(?:^|[^a-zåäö])(?:maidot|maidon|maitoa|maitojuoma|maitojauhe|kevytmaito|täysmaito|rasvaton\s+maito|kauramaito|soijamaito|mantelimaito|riisimaito|laktoositon\s+maito|kondensoitu\s+maito)(?:$|[^a-zåäö])/u;
export function filterSparMilkQuery<T extends { name?: string }>(items: T[], search: string): T[] {
  if (!/^(?:maito|maidot|maidon|maitoa)$/u.test(normalize(search).trim())) return items;
  return items.filter(item => milkWord.test(normalize(String(item.name ?? ""))));
}
