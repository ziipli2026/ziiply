"use client";

// ZiiplyMobileSearchResultsCard v12
// Mockup-rakenne korjattu:
// - tuotekuva vasemmalla ylhäällä
// - yksi Lisää-nappi vasemmalla kuvan alla
// - tuotenimi oikealla ja saa käyttää koko oikean tekstialueen
// - €/kg + hinta nimen alla
// - tarkoitettu pitkälle / loputtomalle scrollilistalle

import React from "react";

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

function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const match = raw.replace(/\s/g, "").replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function priceToEuros(value: unknown) {
  const n = numericValue(value);
  if (n == null) return null;
  return Math.abs(n) > 20 ? n / 100 : n;
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

function formatMainPrice(value: unknown) {
  const euros = priceToEuros(value);
  if (euros == null) return "";

  return (
    euros.toLocaleString("fi-FI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
}

function normalizeComparisonValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.abs(value) > 20 ? value / 100 : value;
  }

  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (raw.includes("€") || raw.includes("/")) return raw;

  const parsed = numericValue(raw);
  if (parsed == null) return null;

  return Math.abs(parsed) > 20 ? parsed / 100 : parsed;
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
    const value = normalizeComparisonValue(candidate);
    if (value == null) continue;

    if (typeof value === "string") return value;

    return `${value.toLocaleString("fi-FI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${inferComparisonUnit(product)}`;
  }

  const euros = priceToEuros(rawPrice);
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
  title = "Tuotteet",
  products = [],
  onClose,
  onAddProduct,
}: ZiiplyMobileSearchResultsCardProps) {
  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[95] flex items-end justify-center bg-slate-950/22 px-2 pb-[calc(env(safe-area-inset-bottom)+5.45rem)] pt-[calc(env(safe-area-inset-top)+5.8rem)] backdrop-blur-[3px] sm:hidden">
      <section className="pointer-events-auto relative flex h-[min(76dvh,42rem)] w-full max-w-[28rem] flex-col overflow-hidden rounded-[2rem] border-[5px] border-[#6d5128] bg-[#fff6db] shadow-[0_12px_0_rgba(72,51,22,0.22),0_22px_48px_rgba(0,0,0,0.22),inset_0_0_0_2px_rgba(255,255,255,0.74)]">
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
            <div className="min-w-0">
              <div
                className="text-[0.78rem] font-black uppercase tracking-[0.42em] text-[#7d6b45]"
                style={{ fontFamily: copper }}
              >
                LÖYDÖKSET
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
                Haetaan löydöksiä…
              </div>
            )}

            {!loading && products.length === 0 && (
              <div className="rounded-[1.45rem] border-[3px] border-[#d4ba73] bg-[#fff4d6] px-5 py-8 text-center text-[1rem] font-black text-[#78633a] shadow-[0_4px_0_rgba(91,72,44,0.12)]">
                Ei löydöksiä vielä.
              </div>
            )}

            {!loading &&
              products.map((product, index) => {
                const image = getImage(product);
                const name = getName(product);
                const rawPrice = pickRawPrice(product);
                const price = formatMainPrice(rawPrice);
                const comparison = formatComparisonPrice(product, rawPrice);

                return (
                  <article
                    key={String(product.id ?? product.ean ?? index)}
                    className="relative grid min-h-[5.35rem] grid-cols-[4.25rem_minmax(0,1fr)] overflow-hidden rounded-[1.15rem] border-[3px] border-[#8c6934] bg-[#fffdf8] px-2.5 py-2 shadow-[0_3px_0_rgba(91,72,44,0.12)]"
                  >
                    <div className="flex h-full flex-col items-center justify-start pr-1">
                      <div className="flex h-[2.85rem] w-full items-center justify-center overflow-visible">
                        {image ? (
                          <img
                            src={image}
                            alt=""
                            className="h-full w-full scale-[1.1] object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-[2.2rem]">🛒</span>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 pr-[5.25rem] pt-[0.05rem]">
                      <div
                        className="line-clamp-2 text-[0.87rem] font-black leading-[0.88] text-[#123d32]"
                        style={{ fontFamily: cooper }}
                      >
                        {name}
                      </div>

                      <div className="mt-[0.42rem] flex min-w-0 items-center gap-1.5 text-[0.68rem] font-black leading-none text-[#7a6947]">
                        {comparison && <span className="shrink-0">{comparison}</span>}

                        {comparison && price && (
                          <span className="shrink-0 opacity-50">•</span>
                        )}

                        {price && (
                          <span className="shrink-0 text-[0.88rem] text-[#234b24]">
                            {price}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onAddProduct?.(product)}
                      className="pointer-events-auto absolute bottom-2 right-2.5 rounded-[0.78rem] border-[2.5px] border-[#178338] bg-[#08a63d] px-2.5 py-[0.58rem] text-[0.78rem] font-black uppercase leading-none tracking-[0.02em] text-[#fff3d8] shadow-[0_3px_0_rgba(0,74,24,0.24),inset_0_1px_0_rgba(255,255,255,0.26)] active:translate-y-[1px] active:shadow-[0_1px_0_rgba(0,74,24,0.24)]"
                    >
                      Lisää
                    </button>
                  </article>
                );
              })}
          </div>
        </div>
      </section>
    </div>
  );
}

export { ZiiplyMobileSearchResultsCard };
