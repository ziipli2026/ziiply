type TokmanniOffer = Record<string, any>;

const TOKMANNI_OFFERS_URL = "https://www.tokmanni.fi/viikkotarjoukset";

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
  if (/suklaa|makeis|kark|keksi|suolakeksi|perunalastu|sips|chips|pretzel|lakrit|salmiak|purukum|patuk|tikkari|snack/.test(s)) return "Makeiset & keksit";
  if (/leipä|näkkileip|sämpyl|pull|croissant|patonki|karjalanpiirakka|ruisleip|rieska/.test(s)) return "Leipomo";
  if (/keittojuures|pinaattikeitto/.test(s)) return "Pakasteet";
  if (/pizza|ateria|keitto|valmisruoka|wrap|caesar|salaattiateria|välipala/.test(s)) return "Valmisruoka";
  if (/kana|broiler|nauta|sika|pors|jauheliha|makkara|nakki|pekoni|kinkku|lihavalmiste|liha/.test(s)) return "Liha & makkarat";
  if (/kala|lohi|silakka|tonnikala|kirjolohi|seiti|katkarapu/.test(s)) return "Kala";
  if (/maito|juusto|jogur|rahka|kerma|voi\b|margariin|raejuusto|viili|piim|kefir|vanukas/.test(s)) return "Maitotuotteet";
  if (/kahvi|espresso|tee\b|kaakao/.test(s)) return "Kahvi & tee";
  if (/mehu|limon|virvoitus|energiajuoma|kivennäisves|vichy|cola|juoma|vesi\b/.test(s)) return "Juomat";
  if (/jäätel|tuut|multipack|pakaste/.test(s)) return "Pakasteet";
  if (/pasta|riisi|jauho|hiutale|muro|mysli|säilyke|kastike|ketsupp|ruokaöljy|mauste|tortilla/.test(s)) return "Kuivatuotteet";
  if (/omena|banaani|tomaatti|kurkku|salaatti|paprika|peruna\b|sipuli|porkkana|mango|marja|hedelm|vihann/.test(s)) return "Hevi";
  if (/koira|kissa|lemmik|kissanruoka|koiranruoka/.test(s)) return "Lemmikit";
  if (/wc-paper|talouspaper|nenäliina|astianpes|pyykin|puhdistus|pesuaine|talousliina|sieniliina/.test(s)) return "Kodinhoito";
  if (/shampoo|suihku|saippua|deodor|hammastahna|hammasharja|kosmeti|seerumi|huulivoi|intiimi|kosteuspyyhe|manikyyri|pedikyyri/.test(s)) return "Hygienia & kosmetiikka";
  return "Muut";
}

function price(value: unknown) {
  const m = String(value ?? "").replace(/\s/g, "").match(/(\d+(?:[.,]\d{1,2})?)/);
  return m ? Number(m[1].replace(",", ".")) : null;
}

function absoluteUrl(href: string) {
  try { return new URL(href, TOKMANNI_OFFERS_URL).href; } catch { return ""; }
}

function productBlocks(html: string) {
  // Magento listing cards are list items. Restrict extraction to cards that
  // contain both a product link and one of Tokmanni's offer markers.
  const raw = html.split(/<li\b[^>]*class=["'][^"']*product-item[^"']*["'][^>]*>/i).slice(1);
  return raw
    .map((part) => part.split(/<\/li>/i)[0] || "")
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

  const allText = textOf(block);
  const multi = allText.match(/(\d+)\s*kpl\s*\/\s*(\d+(?:[,.]\d{1,2})?)\s*€/i);
  const offerQuantity = multi ? Number(multi[1]) : null;
  const multiBuyTotalPrice = multi ? Number(multi[2].replace(",", ".")) : null;

  const offerMarker = allText.match(/(?:Tarjoushinta|Klubitarjous!)\s*(\d+(?:[,.]\d{1,2})?)/i);
  const normalMarker = allText.match(/Normaalihinta\s*(\d+(?:[,.]\d{1,2})?)/i);
  // In multi-buy cards Tokmanni prints the ordinary single price after the
  // badge. Preserve it as normalPrice while the offer itself is the total.
  const ordinaryAfterMulti = multi
    ? allText.slice((multi.index || 0) + multi[0].length).match(/\b(\d+(?:[,.]\d{1,2})?)\b/)
    : null;

  const singleOfferPrice = price(offerMarker?.[1]);
  const normalPrice = price(normalMarker?.[1]) ?? price(ordinaryAfterMulti?.[1]);
  const offerPrice = multiBuyTotalPrice ?? singleOfferPrice;
  if (offerPrice == null) return null;

  const imageMatch = block.match(/class=["'][^"']*product-image-photo[^"']*["'][^>]*(?:src|data-src)=["']([^"']+)/i)
    || block.match(/(?:src|data-src)=["']([^"']+)["'][^>]*class=["'][^"']*product-image-photo/i);
  const imageUrl = absoluteUrl(decodeEntities(imageMatch?.[1] || ""));
  const cat = category(name);
  const multiText = multi ? `${offerQuantity} kpl / ${multiBuyTotalPrice!.toFixed(2).replace(".", ",")} €` : "";

  return {
    id: `tokmanni-${index}-${normalize(name).replace(/[^a-z0-9]+/g, "-").slice(0, 70)}`,
    source: "tokmanni-viikkotarjoukset",
    sourceUrl: TOKMANNI_OFFERS_URL,
    chain: "TOKMANNI",
    storeName: "Tokmanni",
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
    multiBuyUnitPrice: offerQuantity && multiBuyTotalPrice != null ? multiBuyTotalPrice / offerQuantity : null,
    singleEquivalentPrice: offerQuantity && multiBuyTotalPrice != null ? multiBuyTotalPrice / offerQuantity : offerPrice,
    benefitText: multiText || (/Klubitarjous!/i.test(allText) ? "Klubitarjous" : "Tarjoushinta"),
    discountText: multiText,
    imageUrl,
    image: imageUrl,
    pictureUrl: imageUrl,
    productUrl,
    ean: "",
    rawText: [name, cat, multiText, offerPrice, normalPrice].filter(Boolean).join(" "),
  };
}

export async function fetchTokmanniOffers() {
  const response = await fetch(TOKMANNI_OFFERS_URL, {
    redirect: "follow",
    headers: {
      accept: "text/html,application/xhtml+xml",
      "accept-language": "fi-FI,fi;q=0.9",
      "user-agent": "Ziiply/1.0",
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Tokmanni offers failed: ${response.status}`);

  const html = await response.text();
  const items = productBlocks(html)
    .map(mapBlock)
    .filter((item): item is TokmanniOffer => Boolean(item));

  const seen = new Set<string>();
  return items.filter((item) => {
    const key = [normalize(item.title), item.price, item.normalPrice, item.offerQuantity].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
