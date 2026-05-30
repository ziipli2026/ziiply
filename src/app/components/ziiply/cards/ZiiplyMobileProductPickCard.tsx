"use client";

// ZiiplyMobileProductPickCard v8
// Korjaukset:
// - Ei yläpalkkia.
// - Kaksi tuotetta ovat samankorkoiset.
// - Tuotekuva on suurempi eikä siinä ole erillistä värillistä taustaruutua.
// - Tekstit vasemmalla, kuva oikealla ylhäällä, Lisää-nappi oikealla alhaalla.
// - Hinta renderöidään kortin sisällä oikein: 2.78 -> 2,78 €, 278 -> 2,78 €.
// - Vertailuhinta haetaan useista kentistä ja lasketaan tarvittaessa hinnasta + pakkauskoosta.

import React from "react";

export type ZiiplyProductPickResult = {
  id?: string | number;
  key?: string | number;
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

export type ZiiplyMobileProductPickCardProps = {
  compact?: boolean;
  title?: string;
  subtitle?: string;
  results: ZiiplyProductPickResult[];
  onAdd?: (result: ZiiplyProductPickResult) => void;
  onSelectResult?: (result: ZiiplyProductPickResult) => void;
  formatPrice?: (value: number) => string;
  getProductPrice?: (result: ZiiplyProductPickResult) => number | null | undefined;
};

const cooper = '"Cooper Black","Cooper Std Black",Georgia,serif';

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

function getName(result: ZiiplyProductPickResult) {
  return cleanText(
    firstText(
      result.name,
      result.title,
      result.displayName,
      result.brandName,
      result.product?.name,
      result.product?.title,
      result.product?.displayName,
      "Tuote",
    ),
  );
}

function getImage(result: ZiiplyProductPickResult) {
  return firstText(
    result.image,
    result.imageUrl,
    result.pictureUrl,
    result.product?.image,
    result.product?.imageUrl,
    result.product?.pictureUrl,
  );
}

function getStore(result: ZiiplyProductPickResult) {
  const chain = firstText(result.chain, result.product?.chain);
  const store = firstText(
    result.storeName,
    result.store,
    result.product?.storeName,
    result.product?.store,
  );

  if (chain && store) return `${chain} · ${store}`;
  return chain || store;
}

function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const match = raw
    .replace(/\s/g, "")
    .replace(",", ".")
    .match(/-?\d+(?:\.\d+)?/);

  if (!match) return null;

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function priceToEuros(value: unknown) {
  const n = numericValue(value);
  if (n == null) return null;

  // Ruoanhinta.fi / S/K-data voi tulla joko euroina tai sentteinä.
  // 2.78 on euro, 278 on sentti.
  return Math.abs(n) > 20 ? n / 100 : n;
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

function pickRawPrice(
  result: ZiiplyProductPickResult,
  getProductPrice?: (result: ZiiplyProductPickResult) => number | null | undefined,
) {
  const fromCallback = getProductPrice?.(result);
  if (typeof fromCallback === "number" && Number.isFinite(fromCallback)) return fromCallback;

  const candidates = [
    result.price,
    result.product?.price,
    result.product?.currentPrice,
    result.product?.salePrice,
  ];

  for (const candidate of candidates) {
    if (candidate == null || candidate === "") continue;
    return candidate;
  }

  return null;
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

function inferComparisonUnit(result: ZiiplyProductPickResult) {
  const raw = [
    result.comparisonUnit,
    result.priceUnit,
    result.unit,
    result.packageSize,
    result.name,
    result.title,
    result.product?.comparisonUnit,
    result.product?.priceUnit,
    result.product?.unit,
    result.product?.packageSize,
    result.product?.name,
    result.product?.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b(l|ltr|litra|litran|ml|cl)\b/.test(raw)) return "€/l";
  if (/\b(kpl|pkt|pari|rll|rs|ps|tlk)\b/.test(raw)) return "€/kpl";

  return "€/kg";
}

function parsePackageAmount(result: ZiiplyProductPickResult) {
  const raw = [
    result.packageSize,
    result.unit,
    result.name,
    result.title,
    result.product?.packageSize,
    result.product?.unit,
    result.product?.name,
    result.product?.title,
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

function formatComparisonPrice(result: ZiiplyProductPickResult, rawPrice: unknown) {
  const candidates = [
    result.comparisonPrice,
    result.unitPrice,
    result.pricePerUnit,
    result.comparisonPriceText,
    result.product?.comparisonPrice,
    result.product?.unitPrice,
    result.product?.pricePerUnit,
    result.product?.comparisonPriceText,
  ];

  for (const candidate of candidates) {
    const value = normalizeComparisonValue(candidate);
    if (value == null) continue;

    if (typeof value === "string") return value;

    return `${value.toLocaleString("fi-FI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${inferComparisonUnit(result)}`;
  }

  const euros = priceToEuros(rawPrice);
  const packageAmount = parsePackageAmount(result);

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

export default function ZiiplyMobileProductPickCard({
  compact = false,
  results,
  onAdd,
  onSelectResult,
  getProductPrice,
}: ZiiplyMobileProductPickCardProps) {
  const visibleResults = Array.isArray(results) ? results : [];
  const isTwoItems = visibleResults.length === 2;

  return (
    <section
      className={[
        "relative flex h-full w-full flex-col overflow-hidden rounded-[2rem] border-[5px] border-[#6d5128] bg-[#fff6db]",
        "shadow-[0_12px_0_rgba(72,51,22,0.22),0_22px_48px_rgba(0,0,0,0.22),inset_0_0_0_2px_rgba(255,255,255,0.74)]",
        compact ? "max-w-[27.5rem]" : "",
      ].join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage: "radial-gradient(#4b3417 0.55px, transparent 0.55px)",
          backgroundSize: "8px 8px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col gap-3 p-3">
        {visibleResults.map((result, index) => {
          const image = getImage(result);
          const name = getName(result);
          const store = getStore(result);
          const rawPrice = pickRawPrice(result, getProductPrice);
          const price = formatMainPrice(rawPrice);
          const comparison = formatComparisonPrice(result, rawPrice);

          return (
            <article
              key={String(result.key ?? result.id ?? result.ean ?? index)}
              className={[
                "relative grid min-h-0 grid-cols-[minmax(0,1fr)_42%] overflow-hidden rounded-[1.55rem] border-[4px] border-[#8c6934] bg-[#fffdf8] shadow-[0_6px_0_rgba(91,72,44,0.14)]",
                isTwoItems ? "flex-1" : "min-h-[10.5rem]",
              ].join(" ")}
            >
              <div className="relative min-w-0 px-4 py-4 pb-[4.0rem]">
                <div
                  className="line-clamp-3 text-[1.16rem] font-black leading-[0.98] text-[#123d32]"
                  style={{ fontFamily: cooper }}
                >
                  {name}
                </div>

                {store && (
                  <div className="mt-2 truncate whitespace-nowrap text-[0.86rem] font-black uppercase leading-none text-[#6c532c]">
                    {store}
                  </div>
                )}

                {comparison && (
                  <div className="mt-2 text-[0.82rem] font-black leading-none text-[#8a7a55]">
                    {comparison}
                  </div>
                )}

                {price && (
                  <div className="absolute bottom-3 left-4 inline-flex min-w-[5.7rem] items-center justify-center rounded-full border-[3px] border-[#347a3f] bg-[#d2f1c8] px-3 py-[0.42rem] text-[1.16rem] font-black leading-none text-[#153d1c] shadow-[inset_0_1px_0_rgba(255,255,255,0.70)]">
                    {price}
                  </div>
                )}
              </div>

              <div className="relative flex min-w-0 flex-col p-3 pl-1">
                <div className="grid min-h-[6.6rem] flex-1 place-items-center overflow-visible">
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      className="h-full max-h-[8.6rem] w-full scale-[1.18] object-contain p-0"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-[3.2rem]">🛒</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onAdd?.(result);
                    onSelectResult?.(result);
                  }}
                  className="mt-3 shrink-0 rounded-[0.95rem] border-[3px] border-[#178338] bg-[#08a63d] px-3 py-[0.82rem] text-[0.96rem] font-black uppercase leading-none tracking-[0.02em] text-[#fff3d8] shadow-[0_4px_0_rgba(0,74,24,0.24),inset_0_1px_0_rgba(255,255,255,0.26)] active:translate-y-[1px] active:shadow-[0_2px_0_rgba(0,74,24,0.24)]"
                >
                  Lisää
                </button>
              </div>
            </article>
          );
        })}

        {visibleResults.length === 0 && (
          <div className="relative z-10 rounded-[1.45rem] border-[3px] border-[#d4ba73] bg-[#fff4d6] px-5 py-8 text-center text-[1rem] font-black text-[#78633a] shadow-[0_4px_0_rgba(91,72,44,0.12)]">
            Ei tuotteita.
          </div>
        )}
      </div>
    </section>
  );
}

export { ZiiplyMobileProductPickCard };
