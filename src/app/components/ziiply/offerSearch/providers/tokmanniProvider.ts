import { observeEanProductsBestEffort } from "@/lib/eanBank";

type TokmanniOffer = Record<string, any>;

const TOKMANNI_OFFERS_URL = "https://www.tokmanni.fi/viikkotarjoukset/elintarvikkeet-ja-elainruoka";
const TOKMANNI_PAGE_SIZE = 40;
const TOKMANNI_MAX_PAGES = 20;
const TOKMANNI_CACHE_TTL_MS = 10 * 60 * 1000;
let tokmanniOffersCache: { expiresAt: number; items: TokmanniOffer[] } | null = null;
let tokmanniOffersInFlight: Promise<TokmanniOffer[]> | null = null;

const clean = (value: unknown) =>
  String(value ?? "").replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").trim();

function decodeEntities(src: string) {
  const named: Record<string, string> = {
    nbsp: " ", amp: "&", euro: "€", quot: '"', apos: "'", lt: "<", gt: ">",
    auml: "ä", Auml: "Ä", ouml: "ö", Ouml: "Ö", aring: "å", Aring: "Å",
  };
  return src
    .replace(/&([A-Za-z]+);/g, (all, n) => named[n] ?? all)
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}

function textOf(src: string) {
  return clean(
    decodeEntities(
      src
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<br\s*\/?\s*>/gi, "\n")
        .replace(/<[^>]+>/g, " "),
    ),
  ).replace(/\s+/g, " ").trim();
}

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Keep the same public Ziiply taxonomy and precedence used by K-Citymarket.
function category(title: string) {
  const s = clean(title).toLowerCase().replace(/\s+/g, " ");
  if (/voileipägrilli|leivänpaahdin|kahvinkeitin|vedenkeitin|sähkögrilli|grilli|työkalu|valaisin|lamppu|liimapuulevy|kasteluletku|moppi|pesuri|liina|käsine|kenkä|takki|housut|vaate|kalenteri|muki|lakana|pyyhe|lanka|asuste|lelu/.test(s)) return "Koti & vapaa-aika";
  if (/kaurajuoma/.test(s)) return "Juomat";
  if (/piparkakku|piparipallo|pikkuleip/.test(s)) return "Makeiset & keksit";
  if (/piltti|lastenateria|lastenruoka|hedelmäsose|marjasose|luumua .*\b\d+ kk\b/.test(s)) return "Valmisruoka";
  if (/snack pot|kuppiateria|spaghetti|mac & cheese|bolognese/.test(s)) return "Kuivatuotteet";
  if (/suklaa|makeis|kark|keksi|suolakeksi|perunalastu|sips|chips|pretzel|lakrit|salmiak|purukum|patuk|tikkari|kismet|tupla\b|da capo|fazerina|geisha|dumle|pantteri|ässä|aarrearkku|remix|suffeli|julia\b|aakkoset|tv mix|daim\b|japp\b|pändy|fisherman|funky fish|super salty|giant strawberries|pätkis|metrilaku/.test(s)) return "Makeiset & keksit";
  if (/leipä|näkkileip|hapankorppu|korppu|sämpyl|pull|croissant|patonki|karjalanpiirakka|ruisleip|rieska/.test(s)) return "Leipomo";
  if (/keittojuures|pinaattikeitto/.test(s)) return "Pakasteet";
  if (/pizza|ateria|keitto|valmisruoka|wrap|caesar|salaattiateria|välipala/.test(s)) return "Valmisruoka";
  if (/kana|broiler|nauta|sika|pors|jauheliha|makkara|nakki|pekoni|kinkku|lihavalmiste|liha/.test(s)) return "Liha & makkarat";
  if (/kala|lohi|silakka|tonnikala|kirjolohi|seiti|katkarapu/.test(s)) return "Kala";
  if (/maito|juusto|jogur|rahka|kerma|voi\b|margariin|raejuusto|viili|piim|kefir|vanukas/.test(s)) return "Maitotuotteet";
  if (/kahvi|katriina|espresso|tee\b|kaakao/.test(s)) return "Kahvi & tee";
  if (/mehu|limon|virvoitus|energiajuoma|kivennäisves|vichy|cola|juoma|vesi\b/.test(s)) return "Juomat";
  if (/jäätel|tuut|multipack|pakaste/.test(s)) return "Pakasteet";
  if (/pasta|spagetti|nuudeli|riisi|jauho|hiutale|muro|mysli|säilyke|kastike|ketsupp|ruokaöljy|oliiviöljy|mauste|liemikuutio|liemivalmiste|tortilla|kuivattu (?:aprikoosi|hedelmä)|aprikoosi.*kuivattu/.test(s)) return "Kuivatuotteet";
  if (/omena|banaani|tomaatti|kurkku|salaatti|paprika|peruna\b|sipuli|porkkana|mango|marja|hedelm|vihann/.test(s)) return "Hevi";
  if (/koira|kissa|lemmik|kissanruoka|koiranruoka/.test(s)) return "Lemmikit";
  if (/wc-paper|talouspaper|nenäliina|astianpes|pyykin|puhdistus|pesuaine|talousliina|sieniliina/.test(s)) return "Kodinhoito";
  if (/shampoo|suihku|saippua|deodor|hammastahna|hammasharja|kosmeti|seerumi|huulivoi|intiimi|kosteuspyyhe|manikyyri|pedikyyri/.test(s)) return "Hygienia & kosmetiikka";
  return "Muut";
}

function price(value: unknown) {
  const raw = String(value ?? "").trim();
  const spacedDecimal = raw.match(/^(\d+)\s+(\d{2})(?:\s*€)?$/);
  if (spacedDecimal) return Number(spacedDecimal[1] + "." + spacedDecimal[2]);
  const normalized = raw.replace(/\s/g, "");
  const m = normalized.match(/(\d+(?:[.,]\d{1,2})?)/);
  return m ? Number(m[1].replace(",", ".")) : null;
}

function absoluteUrl(href: string) {
  try { return new URL(href, TOKMANNI_OFFERS_URL).href; } catch { return ""; }
}

function eanFromProductUrl(productUrl: string) {
  try {
    const pathname = new URL(productUrl).pathname.replace(/\/+$/, "");
    const match = pathname.match(/-(\d{8,14})$/);
    return match?.[1] || "";
  } catch {
    return "";
  }
}

function rawProductBlocks(html: string) {
  // Split on the next product card instead of the first </li>. Magento cards
  // contain nested list markup, so truncating at </li> can cut the product
  // name/price out of the card and make a valid listing parse as empty.
  return html
    .split(/<li\b[^>]*class=["'][^"']*product-item[^"']*["'][^>]*>/i)
    .slice(1);
}

function productBlocks(html: string) {
  return rawProductBlocks(html)
    .filter((part) => /product-item-link|product-item-name/i.test(part))
    .filter((part) => /Tarjoushinta|Klubitarjous|Normaalihinta|\d+\s*kpl\s*\//i.test(textOf(part)));
}

function first(block: string, patterns: RegExp[]) {
  for (const re of patterns) {
    const m = block.match(re);
    if (m?.[1]) return textOf(m[1]);
  }
  return "";
}

function mapBlock(block: string, index: number): TokmanniOffer | null {
  const name = first(block, [
    /class=["'][^"']*product-item-link[^"']*["'][^>]*>([\s\S]*?)<\/a>/i,
    /class=["'][^"']*product-item-name[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i,
  ]);
  if (!name) return null;

  const hrefMatch = block.match(/class=["'][^"']*product-item-link[^"']*["'][^>]*href=["']([^"']+)/i)
    || block.match(/href=["']([^"']+)["'][^>]*class=["'][^"']*product-item-link/i);
  const productUrl = absoluteUrl(decodeEntities(hrefMatch?.[1] || ""));
  const ean = eanFromProductUrl(productUrl);

  const allText = textOf(block);
  const multi = allText.match(/(\d+)\s*kpl\s*\/\s*(\d+\s*(?:[,.]\s*\d{1,2})?)\s*€/i);
  const offerQuantity = multi ? Number(multi[1]) : null;
  const multiBuyTotalPrice = multi ? price(multi[2]) : null;

  const offerMarker = allText.match(/(?:Tarjoushinta|Klubitarjous!)\s*(\d+\s*(?:[,.]\s*\d{1,2})?)/i);
  const normalMarker = allText.match(/Normaalihinta\s*(\d+\s*(?:[,.]\s*\d{1,2})?)/i);
  // In multi-buy cards Tokmanni prints the ordinary single price after the
  // badge. Preserve it as normalPrice while the offer itself is the total.
  // Magento renders the ordinary per-item price in a price element. Never
  // infer it from arbitrary text after the multi-buy badge: product weights
  // such as "55 g" or "295 g" would otherwise become fake euro prices.
  const priceElementValues = Array.from(
    block.matchAll(/<(?:span|span[^>]*)[^>]*class=["'][^"']*(?:price-wrapper|price)[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi),
  )
    .map((match) => {
      const visiblePriceText = textOf(match[1] || "").replace(/(\d)\s+([,.])\s*(\d{1,2})\b/g, "$1$2$3");
      return price(visiblePriceText);
    })
    .filter((value): value is number => value != null);
  const multiBuyUnitPrice = offerQuantity && multiBuyTotalPrice != null ? multiBuyTotalPrice / offerQuantity : null;
  const ordinaryCardPrice = multi
    ? priceElementValues.find((value) =>
        multiBuyUnitPrice != null &&
        value > multiBuyUnitPrice + 0.0001 &&
        Math.abs(value - multiBuyTotalPrice!) > 0.0001
      ) ?? null
    : null;

  const singleOfferPrice = price(offerMarker?.[1]);
  const normalPrice = price(normalMarker?.[1]) ?? ordinaryCardPrice;
  const offerPrice = multiBuyTotalPrice ?? singleOfferPrice;
  if (offerPrice == null) return null;

  const imageTag = block.match(/<img\b[^>]*>/i)?.[0] || "";
  const imageMatch = imageTag.match(/(?:data-src|data-original|data-lazy-src|src)=["']([^"']+)["']/i);
  const srcsetMatch = imageTag.match(/srcset=["']([^"']+)["']/i);
  const srcsetUrl = srcsetMatch?.[1]?.split(",")[0]?.trim().split(/\s+/)[0] || "";
  const rawImageUrl = imageMatch?.[1] || srcsetUrl;
  const candidateImageUrl = absoluteUrl(decodeEntities(rawImageUrl));
  const imageUrl = candidateImageUrl && candidateImageUrl !== TOKMANNI_OFFERS_URL && !candidateImageUrl.startsWith("data:") && !/placeholder|no[_-]?image/i.test(candidateImageUrl) ? candidateImageUrl : "";
  const cat = category(name);
  const multiText = multi ? `${offerQuantity} kpl / ${multiBuyTotalPrice!.toFixed(2).replace(".", ",")} €` : "";

  return {
    id: `tokmanni-${index}-${normalize(name).replace(/[^a-z0-9]+/g, "-").slice(0, 70)}`,
    source: "tokmanni-viikkotarjoukset",
    sourceUrl: TOKMANNI_OFFERS_URL,
    chain: "TOKMANNI",
    storeName: "Tokmanni",
    sourceScope: "food-and-pet-weekly-offers",
    storeLabel: "Tokmanni",
    shopName: "Tokmanni",
    title: name,
    name,
    productName: name,
    category: cat,
    categoryPath: cat,
    mainCategory: cat,
    priceBasis: multi ? "multi-buy-total" : "single",
    price: offerPrice,
    priceText: `${offerPrice.toFixed(2).replace(".", ",")} €`,
    offerPrice,
    normalPrice,
    originalPrice: normalPrice,
    normalPriceText: normalPrice != null ? `${normalPrice.toFixed(2).replace(".", ",")} €` : "",
    offerQuantity,
    offerUnit: offerQuantity ? "kpl" : "",
    multiBuyTotalPrice,
    multiBuyQuantity: offerQuantity,
    multiBuyUnitPrice,
    singleEquivalentPrice: multiBuyUnitPrice ?? offerPrice,
    benefitText: multiText || (/Klubitarjous!/i.test(allText) ? "Klubitarjous" : "Tarjoushinta"),
    discountText: multiText,
    imageUrl,
    image: imageUrl,
    pictureUrl: imageUrl,
    productUrl,
    ean,
    rawText: [name, cat, multiText, offerPrice, normalPrice].filter(Boolean).join(" "),
    campaignType: "offer",
    validitySource: "current-weekly-listing",
    validFrom: null,
    validTo: null,
  };
}

async function fetchTokmanniPage(page: number) {
  const url = new URL(TOKMANNI_OFFERS_URL);
  if (page > 1) url.searchParams.set("p", String(page));
  const response = await fetch(url, {
    redirect: "follow",
    headers: {
      accept: "text/html,application/xhtml+xml",
      "accept-language": "fi-FI,fi;q=0.9",
      "user-agent": "Ziiply/1.0",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Tokmanni offers page ${page} failed: ${response.status}`);
  return response.text();
}

function advertisedTotal(html: string) {
  const text = textOf(html);
  const m = text.match(/(?:Tuotteet\s+\d+\s*[-–]\s*\d+\s*\/\s*|)(\d+)\s+tuotetta/i);
  return m ? Number(m[1]) : null;
}

async function fetchTokmanniOffersFresh() {
  const firstHtml = await fetchTokmanniPage(1);
  const total = advertisedTotal(firstHtml);
  const pageCount = total
    ? Math.min(TOKMANNI_MAX_PAGES, Math.max(1, Math.ceil(total / TOKMANNI_PAGE_SIZE)))
    : 1;
  if (total != null && Math.ceil(total / TOKMANNI_PAGE_SIZE) > TOKMANNI_MAX_PAGES) {
    throw new Error(`Tokmanni offer listing exceeds parser page cap: ${total} products`);
  }

  const htmlPages = [firstHtml];
  // Fetch in small batches: Tokmanni currently paginates the weekly-offer
  // listing at 40 products/page, so page 1 alone is not a complete dataset.
  for (let start = 2; start <= pageCount; start += 5) {
    const pages = Array.from(
      { length: Math.min(5, pageCount - start + 1) },
      (_, index) => start + index,
    );
    const batch = await Promise.all(pages.map(fetchTokmanniPage));
    htmlPages.push(...batch);
  }

  // Tokmanni's advertised total is the number of product cards in the
  // listing, not the number of cards that qualify as Ziiply offers. Validate
  // pagination against raw Magento product cards before applying offer filters.
  const rawProductCardCount = htmlPages.reduce(
    (sum, html) =>
      sum +
      html.split(/<li\b[^>]*class=["'][^"']*product-item[^"']*["'][^>]*>/i).slice(1).length,
    0,
  );

  const candidateBlockCount = htmlPages.reduce((sum, html) => sum + productBlocks(html).length, 0);
  const items = htmlPages.flatMap((html, pageIndex) =>
    productBlocks(html)
      .map((block, index) => mapBlock(block, pageIndex * TOKMANNI_PAGE_SIZE + index))
      .filter((item): item is TokmanniOffer => Boolean(item)),
  );
  if (total != null && candidateBlockCount < total) {
    throw new Error("Tokmanni offer cards incomplete: advertised " + total + ", candidate cards " + candidateBlockCount + ", raw cards " + rawProductCardCount + ", pages " + pageCount);
  }
  if (total != null && items.length < total) {
    throw new Error("Tokmanni offer mapping incomplete: advertised " + total + ", mapped items " + items.length + ", candidate cards " + candidateBlockCount + ", raw cards " + rawProductCardCount);
  }

  const seen = new Set<string>();
  const dedupedItems = items.filter((item) => {
    // Do not collapse distinct product variants that happen to share the same
    // title/price. Prefer the stable product identity from the source.
    const key = item.ean
      ? `ean:${item.ean}`
      : item.productUrl
        ? `url:${item.productUrl}`
        : `fallback:${normalize(item.title)}|${item.price}|${item.normalPrice}|${item.offerQuantity}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  await observeEanProductsBestEffort(
    dedupedItems
      .filter((item) => Boolean(item.ean))
      .map((item) => ({
        ean: item.ean,
        name: item.name,
        imageUrl: item.imageUrl,
        category: item.category,
        source: "tokmanni-viikkotarjoukset",
      })),
  );

  // The source page itself is the authority for pagination completeness.
  // Compare its advertised total to raw product cards, not to the filtered
  // Ziiply offer subset; otherwise valid non-offer cards make the whole master
  // fail closed and Gösta incorrectly reports no results.
  if (total != null && rawProductCardCount < total) {
    throw new Error(
      `Tokmanni listing incomplete: advertised ${total}, raw cards ${rawProductCardCount}, pages ${pageCount}`,
    );
  }

  return dedupedItems;
}

export async function fetchTokmanniOffers() {
  const now = Date.now();
  if (tokmanniOffersCache && tokmanniOffersCache.expiresAt > now) {
    return tokmanniOffersCache.items;
  }
  if (tokmanniOffersInFlight) return tokmanniOffersInFlight;

  tokmanniOffersInFlight = fetchTokmanniOffersFresh()
    .then((items) => {
      tokmanniOffersCache = {
        items,
        expiresAt: Date.now() + TOKMANNI_CACHE_TTL_MS,
      };
      return items;
    })
    .finally(() => {
      tokmanniOffersInFlight = null;
    });

  return tokmanniOffersInFlight;
}
