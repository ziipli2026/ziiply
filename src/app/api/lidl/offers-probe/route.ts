import { NextRequest, NextResponse } from "next/server";

const STORES_URL = "https://stores.lidlplus.com/api/v4/FI";
const OFFERS_BASE = "https://offers.lidlplus.com/app/api/v4/FI";
const headers = {
  accept: "application/json",
  "accept-language": "fi-FI,fi;q=0.9",
  "user-agent": "LidlPlus/17.0.5 Android okhttp/4.12.0",
  "x-client-version": "17.0.5",
  "x-client-platform": "android",
};

function classify(name: string, brand = "") {
  const s = `${name} ${brand}`.toLocaleLowerCase("fi-FI");
  if (/kahvi|espresso|cappuccino|tee\b/.test(s)) return "Kahvi & tee";
  if (/maito|jogur|jugur|rahka|juusto|kerma|voi\b|piimä|viili/.test(s)) return "Maitotuotteet";
  if (/kana|broiler|nauta|sika|pors|jauheliha|makkara|nakki|pekoni|kinkku|liha|pulled pork/.test(s)) return "Liha & makkarat";
  if (/kala|lohi|silakka|tonnikala|kirjolohi|seiti|katkarapu/.test(s)) return "Kala";
  if (/leipä|sämpyl|pull|croissant|paton|karjalanpiirakka|ruisleip|rieska/.test(s)) return "Leipomo";
  if (/sitruuna|retiisi|granaattiomena|omena|banaani|tomaatti|kurkku|salaatti|paprika|peruna|sipuli|porkkana|bataatti|mandariini|appelsiini|mango|marja|hedelm|vihann|kasvis|kaali/.test(s)) return "Hevi";
  if (/limu|juoma|mehu|vesi|vichy|energiajuoma|cola/.test(s)) return "Juomat";
  if (/pakaste|jäätel|jaatelo|pakastettu/.test(s)) return "Pakasteet";
  if (/valmis|ateria|pizza|keitto|salaattiateria|mikroateria|laatikko|lasagne|wokki|risotto/.test(s)) return "Valmisruoka";
  if (/pasta|riisi|jauho|hiutale|muro|mysli|säilyke|sailyke|kastike|öljy|oljy|mauste|sokeri|suola|puuro|nuudeli|makaroni|spagetti/.test(s)) return "Kuivatuotteet";
  if (/kark|makeis|suklaa|keksi|lakrit|salmiak|purukumi|patukka|sips|chips/.test(s)) return "Makeiset & keksit";
  if (/lastenruo|vauva|äidinmaidonkorvike/.test(s)) return "Lastenruoat";
  if (/vitami|ravinne|magnesium|sinkki/.test(s)) return "Vitamiinit & ravinteet";
  if (/koira|kissa|lemmik/.test(s)) return "Lemmikit";
  if (/hammastahna|hammasharja|shampoo|saippua|deodorant|kosmeti|ihonhoito/.test(s)) return "Hygienia & kosmetiikka";
  if (/pesuaine|pyykin|astianpesu|puhdistus/.test(s)) return "Kodinhoito";
  if (/vaate|asuste|esmara|työkalu|kodin|vapaa-aika/.test(s)) return "Koti & vapaa-aika";
  return "Muut";
}

function normalizeOffer(row: any, store: any) {
  const box = row?.priceBox || {};
  const offerPrice = typeof box.largePartNumeric === "number" ? box.largePartNumeric : null;
  const normalPrice = typeof box.smallPartNumeric === "number" ? box.smallPartNumeric : null;
  const name = row?.title || "Lidl tarjous";
  const brandName = row?.brand || undefined;
  return {
    id: row?.id, name, title: name, brandName,
    storeName: store?.name || "Lidl", chain: "Lidl",
    category: classify(name, brandName),
    price: offerPrice, offerPrice, normalPrice, originalPrice: normalPrice,
    discountText: box.discountMessage || undefined,
    imageUrl: row?.imageUrl || undefined,
    comparisonPriceText: row?.pricePerUnit || undefined,
    comparisonUnit: box.priceSymbol || undefined,
    productIds: Array.isArray(row?.productIds) ? row.productIds : [],
    validFrom: row?.startValidityDate || undefined,
    validUntil: row?.endValidityDate || undefined,
    offerType: row?.offerType || undefined,
    redemptionChannel: row?.redemptionChannel || undefined,
    hasConcretePrice: offerPrice != null,
  };
}

export async function GET(request: NextRequest) {
  const city = String(request.nextUrl.searchParams.get("city") || "Hyvinkää").trim();
  try {
    const sr = await fetch(STORES_URL, { headers, cache: "no-store" });
    if (!sr.ok) return NextResponse.json({ stage: "stores", status: sr.status }, { status: 502 });
    const stores = await sr.json();
    const needle = city.toLocaleLowerCase("fi-FI");
    const matches = Array.isArray(stores) ? stores.filter((s: any) =>
      String(s?.locality || "").toLocaleLowerCase("fi-FI").includes(needle) ||
      String(s?.name || "").toLocaleLowerCase("fi-FI").includes(needle)
    ) : [];
    const store = matches[0];
    const storeKey = String(store?.storeKey || "").trim();
    if (!storeKey) return NextResponse.json({ stage: "store-match", city, matches: matches.length }, { status: 404 });

    const or = await fetch(`${OFFERS_BASE}/${encodeURIComponent(storeKey)}/offers`, { headers, cache: "no-store" });
    const raw = await or.json();
    const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.offers) ? raw.offers : Array.isArray(raw?.items) ? raw.items : [];
    const normalized = rows.map((row: any) => normalizeOffer(row, store));
    const priced = normalized.filter((row: any) => row.hasConcretePrice);
    const discountOnly = normalized.filter((row: any) => !row.hasConcretePrice);
    const categoryCounts = priced.reduce((acc: Record<string, number>, row: any) => {
      acc[row.category] = (acc[row.category] || 0) + 1;
      return acc;
    }, {});

    return NextResponse.json({
      city,
      store: { storeKey, name: store?.name, locality: store?.locality, address: store?.address },
      offersStatus: or.status,
      rawOfferCount: rows.length,
      pricedOfferCount: priced.length,
      discountOnlyCount: discountOnly.length,
      categoryCounts,
      pricedOffers: priced,
      discountOnlyOffers: discountOnly,
    });
  } catch (error) {
    return NextResponse.json({ stage: "exception", error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
