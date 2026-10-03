"use client";

// ZiiplyMobileSearchResultsCard v14-loytoluettelo
// - Pitkälle / loputtomalle listalle optimoitu matala tuoterivi.
// - Tuotekuva vasemmalla, jotta rivi pysyy matalana.
// - Ulkoasu linjassa PickCardin paperi/emali-tyylin kanssa.
// - Tuotenimi keskialueelle, kauppa ja vertailuhinta alemmaksi.
// - Hinta ja Lisää-nappi oikeaan alakulmaan samalle linjalle.
// - Lista on oma scrollialue.

import React, { useState } from "react";

export type ZiiplyMobileSearchResultProduct = {
  id?: string | number;
  ean?: string | number;
  name?: string;
  title?: string;
  displayName?: string;
  brandName?: string;
  chain?: string;
  store?: string;
  storeName?: string;
  price?: number | string | null;
  image?: string;
  imageUrl?: string;
  pictureUrl?: string;
  comparisonPrice?: string | number | null;
  comparisonPriceText?: string | number | null;
  unitPrice?: string | number | null;
  pricePerUnit?: string | number | null;
  comparisonUnit?: string;
  priceUnit?: string;
  packageSize?: string;
  unit?: string;
  product?: any;
  [key: string]: any;
};

export type ZiiplyMobileSearchResultsCardProps = {
  open?: boolean;
  loading?: boolean;
  title?: string;
  products?: ZiiplyMobileSearchResultProduct[];
  onClose?: () => void;
  onAddProduct?: (product: ZiiplyMobileSearchResultProduct) => void;
};

const cooper = '"Cooper Black","Cooper Std Black",Georgia,serif';
const copper = '"Copperplate","Baskerville",Georgia,serif';

function firstText(...values: unknown[]) {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function getName(product: ZiiplyMobileSearchResultProduct) {
  return cleanText(
    firstText(
      product.name,
      product.title,
      product.displayName,
      product.brandName,
      product.product?.name,
      product.product?.title,
      product.product?.displayName,
      "Tuote",
    ),
  );
}

function getImage(product: ZiiplyMobileSearchResultProduct) {
  return firstText(
    product.image,
    product.imageUrl,
    product.pictureUrl,
    product.product?.image,
    product.product?.imageUrl,
    product.product?.pictureUrl,
  );
}

function getStore(product: ZiiplyMobileSearchResultProduct) {
  const chain = firstText(product.chain, product.product?.chain);
  const store = firstText(
    product.storeName,
    product.store,
    product.product?.storeName,
    product.product?.store,
  );

  if (chain && store) return `${chain} · ${store}`;
  return chain || store;
}

function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const match = raw.replace(/\s/g, "").replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function usesEuroPrices(product: ZiiplyMobileSearchResultProduct) {
  const source = [product.chain, product.store, product.storeName, product.source, product.product?.chain, product.product?.source].join(" ").toLowerCase();
  return /tokmanni|eurospar|\bspar\b/.test(source);
}

function hasMatchingLegacyCentUnitPrice(value: number, product: ZiiplyMobileSearchResultProduct) {
  if (usesEuroPrices(product) || !Number.isInteger(value) || value < 0 || value >= 100) return false;
  // Only disambiguate sub-euro integer cents when the independently supplied
  // numeric comparison price corroborates the same cent amount (e.g. 85 c/l).
  // A genuine 25-euro item must not become 0.25 euro merely due to magnitude.
  const unitCandidates = [
    product.comparisonPrice, product.unitPrice, product.pricePerUnit,
    product.product?.comparisonPrice, product.product?.unitPrice, product.product?.pricePerUnit,
  ];
  return unitCandidates.some((candidate) => {
    if (typeof candidate === "number") return Number.isInteger(candidate) && candidate === value;
    const raw = String(candidate ?? "").trim();
    return /^\\d+$/.test(raw) && Number(raw) === value;
  }) && parsePackageAmount(product)?.amount === 1;
}

function priceToEuros(value: unknown, product: ZiiplyMobileSearchResultProduct) {
  const n = numericValue(value);
  if (n == null) return null;
  // Legacy S/K integer cents: retain the existing >=100 rule and verify
  // ambiguous 0–99 values against a matching one-unit comparison price.
  return usesEuroPrices(product) ? n : Math.abs(n) >= 100 || hasMatchingLegacyCentUnitPrice(n, product) ? n / 100 : n;
}

function pickRawPrice(product: ZiiplyMobileSearchResultProduct) {
  const candidates = [
    product.price,
    product.product?.price,
    product.product?.currentPrice,
    product.product?.salePrice,
  ];

  for (const candidate of candidates) {
    if (candidate == null || candidate === "") continue;
    return candidate;
  }

  return null;
}

function formatMainPrice(value: unknown, product: ZiiplyMobileSearchResultProduct) {
  const euros = priceToEuros(value, product);
  if (euros == null) return "";

  return (
    euros.toLocaleString("fi-FI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
}

function normalizeComparisonValue(value: unknown, product: ZiiplyMobileSearchResultProduct) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return usesEuroPrices(product) ? value : Math.abs(value) >= 100 || hasMatchingLegacyCentUnitPrice(value, product) ? value / 100 : value;
  }

  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (raw.includes("€") || raw.includes("/")) return raw;

  const parsed = numericValue(raw);
  if (parsed == null) return null;

  return usesEuroPrices(product) ? parsed : Math.abs(parsed) >= 100 || hasMatchingLegacyCentUnitPrice(parsed, product) ? parsed / 100 : parsed;
}

function inferComparisonUnit(product: ZiiplyMobileSearchResultProduct) {
  const raw = [
    product.comparisonUnit,
    product.priceUnit,
    product.unit,
    product.packageSize,
    product.name,
    product.title,
    product.product?.comparisonUnit,
    product.product?.priceUnit,
    product.product?.unit,
    product.product?.packageSize,
    product.product?.name,
    product.product?.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b(l|ltr|litra|litran|ml|cl)\b/.test(raw)) return "€/l";
  if (/\b(kpl|pkt|pari|rll|rs|ps|tlk)\b/.test(raw)) return "€/kpl";
  return "€/kg";
}

function parsePackageAmount(product: ZiiplyMobileSearchResultProduct) {
  const raw = [
    product.packageSize,
    product.unit,
    product.name,
    product.title,
    product.product?.packageSize,
    product.product?.unit,
    product.product?.name,
    product.product?.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(",", ".");

  const kg = raw.match(/(\d+(?:\.\d+)?)\s*kg\b/);
  if (kg) return { amount: Number(kg[1]), unit: "kg" as const };

  const g = raw.match(/(\d+(?:\.\d+)?)\s*g\b/);
  if (g) return { amount: Number(g[1]) / 1000, unit: "kg" as const };

  const l = raw.match(/(\d+(?:\.\d+)?)\s*(?:l|ltr|litra)\b/);
  if (l) return { amount: Number(l[1]), unit: "l" as const };

  const ml = raw.match(/(\d+(?:\.\d+)?)\s*ml\b/);
  if (ml) return { amount: Number(ml[1]) / 1000, unit: "l" as const };

  return null;
}

function formatComparisonPrice(product: ZiiplyMobileSearchResultProduct, rawPrice: unknown) {
  const candidates = [
    product.comparisonPrice,
    product.unitPrice,
    product.pricePerUnit,
    product.comparisonPriceText,
    product.product?.comparisonPrice,
    product.product?.unitPrice,
    product.product?.pricePerUnit,
    product.product?.comparisonPriceText,
  ];

  for (const candidate of candidates) {
    const value = normalizeComparisonValue(candidate, product);
    if (value == null) continue;

    if (typeof value === "string") return value;

    return `${value.toLocaleString("fi-FI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${inferComparisonUnit(product)}`;
  }

  const euros = priceToEuros(rawPrice, product);
  const packageAmount = parsePackageAmount(product);

  if (euros != null && packageAmount?.amount && packageAmount.amount > 0) {
    const unitPrice = euros / packageAmount.amount;
    const unit = packageAmount.unit === "l" ? "€/l" : "€/kg";

    return `${unitPrice.toLocaleString("fi-FI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${unit}`;
  }

  return "";
}

export default function ZiiplyMobileSearchResultsCard({
  open = false,
  loading = false,
  title = "Löydökset",
  products = [],
  onClose,
  onAddProduct,
}: ZiiplyMobileSearchResultsCardProps) {
  const [expandedProduct, setExpandedProduct] = useState<ZiiplyMobileSearchResultProduct | null>(null);
  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[95] flex items-stretch justify-center bg-slate-950/22 px-2 pb-[calc(env(safe-area-inset-bottom)+5.45rem)] pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-[3px] sm:hidden">
      <section className="pointer-events-auto relative flex h-full w-full max-w-[28rem] flex-col overflow-hidden rounded-[2rem] border-[5px] border-[#6d5128] bg-[#fff6db] shadow-[0_12px_0_rgba(72,51,22,0.22),0_22px_48px_rgba(0,0,0,0.22),inset_0_0_0_2px_rgba(255,255,255,0.74)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              "radial-gradient(#4b3417 0.55px, transparent 0.55px)",
            backgroundSize: "8px 8px",
          }}
          aria-hidden="true"
        />

        <header className="relative z-20 shrink-0 px-4 pb-3 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pt-[0.05rem]">
              <div
                className="text-[0.78rem] font-black uppercase tracking-[0.42em] text-[#7d6b45]"
                style={{ fontFamily: copper }}
              >
                LÖYTÖLUETTELO
              </div>

              <div
                className="mt-1 truncate text-[1.08rem] font-black italic text-[#123d32]"
                style={{ fontFamily: cooper }}
              >
                {title || "Tuotteet"}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="pointer-events-auto grid h-[2.55rem] w-[2.55rem] shrink-0 place-items-center rounded-full border-[3px] border-[#6f5730] bg-[#fff2cb] text-[1.25rem] font-black leading-none text-[#513d1f] shadow-[0_3px_0_rgba(91,72,44,0.24)] active:translate-y-[1px]"
              aria-label="Sulje löydökset"
              title="Sulje"
            >
              ×
            </button>
          </div>
        </header>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-2">
            {loading && (
              <div className="rounded-[1.45rem] border-[3px] border-[#d4ba73] bg-[#fff4d6] px-5 py-8 text-center text-[1rem] font-black text-[#78633a] shadow-[0_4px_0_rgba(91,72,44,0.12)]">
                Haetaan löytöluetteloa…
              </div>
            )}

            {!loading && products.length === 0 && (
              <div className="rounded-[1.45rem] border-[3px] border-[#d4ba73] bg-[#fff4d6] px-5 py-8 text-center text-[1rem] font-black text-[#78633a] shadow-[0_4px_0_rgba(91,72,44,0.12)]">
                Ei löydöksiä luettelossa vielä.
              </div>
            )}

            {!loading &&
              products.map((product, index) => {
                const image = getImage(product);
                const name = getName(product);
                const rawPrice = pickRawPrice(product);
                const researchOnly = product.priceVerified === false || product.product?.priceVerified === false;
                // observedPriceEur is explicitly stored in euros, never cents.
                const observedEuros = numericValue(product.observedPriceEur);
                const observedPrice = researchOnly && observedEuros != null && observedEuros >= 0
                  ? `${observedEuros.toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
                  : "";
                const price = researchOnly ? "" : formatMainPrice(rawPrice, product);
                const comparison = researchOnly ? "" : formatComparisonPrice(product, rawPrice);

                return (
                  <article
                    key={String(product.id ?? product.ean ?? index)}
                    className="relative flex items-start gap-3 overflow-hidden rounded-[1.15rem] border-[3px] border-[#8c6934] bg-[#fffdf8] px-2.5 py-2.5 shadow-[0_3px_0_rgba(91,72,44,0.12)]"
                  >
                    <div className="flex w-[5.8rem] shrink-0 flex-col items-center gap-1.5">
                      <button type="button" onClick={() => setExpandedProduct(product)} aria-label={`Näytä tuotteen ${name} suurempi kuva ja tiedot`} className="flex h-[5.15rem] w-[5.15rem] items-center justify-center overflow-hidden rounded-[0.65rem] border border-[#e6dcc3] bg-[#faf5e9]">
                        {image ? (
                          <img src={image} alt="" className="h-full w-full object-contain" loading="lazy" />
                        ) : (
                          <span aria-hidden="true" className="text-[0.61rem] font-bold uppercase tracking-[0.08em] text-[#aa9b7d]">Ei kuvaa</span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onAddProduct?.(product)}
                        disabled={!onAddProduct}
                        aria-label={`Lisää koriin: ${name}, ${price || "hinta puuttuu"}`}
                        className="flex min-h-[3.1rem] w-full flex-col items-center justify-center rounded-[0.6rem] border-[2px] border-[#496443] bg-[linear-gradient(180deg,#edf4d9_0%,#dce8c3_100%)] px-1 py-1 text-[#087237] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <span className="whitespace-nowrap text-[1.05rem] font-black leading-tight" style={{ fontFamily: cooper }}>{price || "—"}</span>
                        <span className="whitespace-nowrap text-[0.57rem] font-black leading-tight text-[#244525]">🛒 Lisää koriin</span>
                      </button>
                    </div>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="break-words text-[0.86rem] font-black leading-tight text-[#123d32]" style={{ fontFamily: cooper }}>{name}</div>
                      {(product.ean || product.product?.ean) && (
                        <div className="mt-1 break-all text-[0.61rem] font-bold text-[#8a7a55]">
                          EAN {String(product.ean || product.product?.ean)}
                        </div>
                      )}
                      {researchOnly && (
                        <div className="mt-1 text-[0.65rem] font-bold leading-tight text-[#78633a]">
                          {observedPrice ? `Havaittu ${observedPrice} (${product.observedDate ?? "päiväys puuttuu"}) · ei vahvistettu` : "Hinta ei vahvistettu"}
                        </div>
                      )}
                      {!researchOnly && comparison && (
                        <div className="mt-1 break-words text-[0.68rem] font-black text-[#8a7a55]">{comparison}</div>
                      )}
                    </div>
                  </article>
                );
              })}
          </div>
        </div>
        {expandedProduct && (
          <div className="pointer-events-auto absolute inset-0 z-[80] flex items-center justify-center bg-[#1c251c]/60 p-3" role="dialog" aria-modal="true" aria-label="Suurennettu tuotenäkymä">
            <div className="max-h-full w-full max-w-[26rem] overflow-y-auto rounded-[1.2rem] border-[3px] border-[#8c6934] bg-[#fffdf8] p-3 shadow-xl">
              <div className="mb-3 flex items-center justify-between gap-2">
                <strong className="text-[#123d32]">Tuotetiedot</strong>
                <button type="button" onClick={() => setExpandedProduct(null)} aria-label="Sulje tuotenäkymä" className="rounded-lg border border-[#8c6934] px-3 py-1 font-black">✕</button>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex w-[7.5rem] shrink-0 flex-col gap-2">
                  <div className="flex h-[7.5rem] items-center justify-center rounded-lg border border-[#e6dcc3] bg-[#faf5e9]">
                    {getImage(expandedProduct) ? <img src={getImage(expandedProduct)} alt="" className="h-full w-full object-contain" /> : <span className="text-xs text-[#78633a]">Ei kuvaa</span>}
                  </div>
                  <button type="button" disabled={!onAddProduct} onClick={() => onAddProduct?.(expandedProduct)} className="flex min-h-[3.4rem] flex-col items-center justify-center rounded-lg border-2 border-[#496443] bg-[#dce8c3] px-1 text-[#087237] disabled:opacity-45">
                    <strong className="text-lg">{expandedProduct.priceVerified === false || expandedProduct.product?.priceVerified === false ? "—" : formatMainPrice(pickRawPrice(expandedProduct), expandedProduct) || "—"}</strong>
                    <span className="text-xs font-black text-[#244525]">🛒 Lisää koriin</span>
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="break-words font-black leading-tight text-[#123d32]">{getName(expandedProduct)}</div>
                  {formatComparisonPrice(expandedProduct, pickRawPrice(expandedProduct)) && <div className="mt-2 text-sm text-[#78633a]">{formatComparisonPrice(expandedProduct, pickRawPrice(expandedProduct))}</div>}
                  {(expandedProduct.ean || expandedProduct.product?.ean) && <div className="mt-2 break-all text-xs text-[#78633a]">EAN {String(expandedProduct.ean || expandedProduct.product?.ean)}</div>}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

export { ZiiplyMobileSearchResultsCard };
