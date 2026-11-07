const chainBrands = {
  s: ["Coop", "Xtra", "Kotimaista", "Rainbow"],
  k: ["Pirkka", "K-Menu"],
  spar: ["SPAR", "Eurospar", "First Price"],
  lidl: ["Milbona", "Cien", "Chef Select", "Pikok", "Combino"],
} as const;

type BrandChain = keyof typeof chainBrands;

const knownBrands = [
  ...Object.values(chainBrands).flat(),
  "De Cecco", "Pastificio Liguori", "Liguori", "Valio", "Arla", "Atria",
  "Snellman", "HK", "Barilla", "Rummo", "Findus", "Saarioinen",
  "Juhla Mokka", "Coca-Cola", "Pepsi", "Paulig", "Fazer", "Meira",
];

function brandKey(value: string) {
  return value.toLocaleLowerCase("fi").replace(/[-–]/g, " ").replace(/\s+/g, " ").trim();
}

function startsWithBrand(name: string, brand: string) {
  const key = brandKey(brand);
  return Boolean(key) && (name === key || name.startsWith(key + " "));
}

export function comparisonBrand(name: string, metadata?: string | null) {
  const explicit = typeof metadata === "string" ? metadata.trim() : "";
  return explicit || knownBrands.find(brand => startsWithBrand(brandKey(name), brand)) || "";
}

export function sameComparisonBrand(source: string, candidate: string) {
  const canonical = (value: string) => brandKey(value).replace(/^pastificio liguori$/, "liguori");
  return Boolean(source) && canonical(source) === canonical(candidate);
}

export function isComparisonOwnBrand(chain: BrandChain, name: string, metadata?: string | null) {
  return chainBrands[chain].some(brand =>
    startsWithBrand(brandKey(metadata || ""), brand) || startsWithBrand(brandKey(name), brand),
  );
}

export function comparisonProductType(name: string) {
  const product = name.replace(/\bspaghetti\b/gi, "spagetti");
  if (/\bspagetti\b/i.test(product) && !/bolognese|kastik|ateria|lasten|pakaste/i.test(product)) {
    return "spagetti";
  }
  return "";
}

export function comparisonAlternativeQueries(
  name: string, brand: string, chain: BrandChain, mode: string,
) {
  const brandless = brandKey(name).split(" ");
  const brandWords = brandKey(brand).split(" ");
  const neutral = (startsWithBrand(brandKey(name), brand)
    ? brandless.slice(brandWords.length).join(" ")
    : brandless.join(" ")
  ).replace(/\b\d+(?:[.,]\d+)?\s*(?:kg|g|ml|dl|cl|l|kpl|pkt)\b/gi, "").trim();
  const type = comparisonProductType(name) || neutral;
  if (!type) return [];
  const targeted = mode === "own_brands" ? chainBrands[chain].map(own => `${own} ${type}`)
    : mode === "same_brand" || mode === "keep_brands" ? (brand ? [`${brand} ${type}`] : [])
    : [];
  return [...new Set([type, ...targeted, ...(type === "spagetti" ? ["spaghetti"] : [])])];
}

export function comparisonTypeCompatible(source: string, candidate: string) {
  const type = comparisonProductType(source);
  if (type !== "spagetti") return true;
  return comparisonProductType(candidate) === type &&
    !/shirataki|hedelmä|fruit|lastenpeli|hius/i.test(candidate) &&
    [/gluteeniton|gluten.free/i, /luomu|organic/i, /täysjyvä|wholegrain/i]
      .every(attribute => attribute.test(source) === attribute.test(candidate));
}
