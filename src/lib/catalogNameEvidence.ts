// Alternate names are observations of the same EAN, not global synonyms.
// A shorter name may omit a fact; an explicit contradiction must never be hidden.
const factors: Record<string, [string, number]> = {
  kg:['g',1000], g:['g',1], l:['ml',1000], dl:['ml',100], cl:['ml',10], ml:['ml',1], kpl:['kpl',1],
};
function fold(value: unknown) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/(\d),(\d)/g,'$1.$2');
}
export function catalogPackageSizes(value: unknown): string[] {
  return [...fold(value).matchAll(/(\d+(?:\.\d+)?)\s*(kg|ml|cl|dl|kpl|g|l)\b/g)]
    .map(([,amount,unit])=>`${Math.round(Number(amount)*factors[unit][1]*1000)/1000}${factors[unit][0]}`);
}
export function compatibleCatalogNames(current: unknown, alternate: unknown, quantity?: unknown): boolean {
  const a=fold(current), b=fold(alternate);
  const aSizes=[...catalogPackageSizes(a),...catalogPackageSizes(quantity)], bSizes=catalogPackageSizes(b);
  // Count, mass and volume are separate constraints. Net/drained sizes may
  // omit one another, but disjoint explicit values are conflicting evidence.
  for(const unit of ['g','ml','kpl']) {
    const left=aSizes.filter(s=>s.endsWith(unit)),right=bSizes.filter(s=>s.endsWith(unit));
    if(left.length && right.length && !left.some(s=>right.includes(s)))return false;
  }
  const multipack=(name:string)=>name.match(/(?:^|\s)(\d+)\s*[x×*]\s*\d+(?:\.\d+)?\s*(?:kg|ml|cl|dl|g|l)\b/)?.[1];
  const aCount=multipack(a), bCount=multipack(b);
  if(aCount && bCount && aCount!==bCount)return false;
  const opposites: [RegExp,RegExp][] = [
    [/\b(?:zero|sokeriton|max)\b/,/\b(?:original|sokerillinen)\b/],
    [/\brasvaton\b/,/\b(?:kevytmaito|taysmaito)\b/],
    [/\b(?:gluteeniton|gluten free)\b/,/sisaltaa gluteenia/],
    [/\bkofeiiniton\b/,/\bkofeiinillinen\b/],
    [/\bvaaleapaahtoinen\b/,/\btummapaahtoinen\b/],
    [/\bkokonainen\b/,/\b(?:filee|file|fileoitu)\b/],
  ];
  return !opposites.some(([x,y])=>(x.test(a)&&y.test(b))||(y.test(a)&&x.test(b)));
}
