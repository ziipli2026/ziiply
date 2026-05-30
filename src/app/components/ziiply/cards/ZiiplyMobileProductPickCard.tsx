"use client";

// ZiiplyMobileProductPickCard v7
// Korjaus v6:n jälkeen:
// - yläpalkki pois kokonaan
// - kaksi tuoteruutua saman kokoisiksi
// - tekstit vasemmalle, kuva oikealle ylös, Lisää-nappi oikealle alas
// - hinta vasemmalle alas ja vertailuhinta sen yläpuolelle
// - korjaa 0,03 € -virheen: ulkoiselle formatPrice-funktiolle annetaan alkuperäinen hintaluku,
//   ei valmiiksi euroiksi normalisoitua lukua.

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

function getName(result: ZiiplyProductPickResult) {
  return firstText(
    result.name,
    result.title,
    result.displayName,
    result.brandName,
    result.product?.name,
    result.product?.title,
    result.product?.displayName,
    "Tuote",
  ).replace(/\s+/g, " ").trim();
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

function normalizePriceToEuros(price: unknown) {
  if (typeof price === "number" && Number.isFinite(price)) {
    return Math.abs(price) > 20 ? price / 100 : price;
  }

  const raw = String(price ?? "").trim();
  if (!raw) return null;

  if (raw.includes("€")) return raw;

  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  const number = Number(cleaned);
  if (!Number.isFinite(number)) return raw;

  return Math.abs(number) > 20 ? number / 100 : number;
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

function formatMainPrice(
  rawPrice: unknown,
  externalFormatPrice?: (value: number) => string,
) {
  if (typeof rawPrice === "number" && Number.isFinite(rawPrice) && externalFormatPrice) {
    return externalFormatPrice(rawPrice);
  }

  const value = normalizePriceToEuros(rawPrice);
  if (value == null) return "";

  if (typeof value === "string") {
    return value.includes("€") ? value : `${value} €`;
  }

  return (
    value.toLocaleString("fi-FI", {
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

  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(cleaned.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(parsed)) return null;

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

function formatComparisonPrice(result: ZiiplyProductPickResult) {
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

  return "";
}

export default function ZiiplyMobileProductPickCard({
  compact = false,
  results,
  onAdd,
  onSelectResult,
  formatPrice,
  getProductPrice,
}: ZiiplyMobileProductPickCardProps) {
  const visibleResults = Array.isArray(results) ? results : [];
  const isTwoItems = visibleResults.length === 2;

  return (
    <section
      className={[
        "relative flex w-full flex-col overflow-hidden rounded-[2rem] border-[5px] border-[#6d5128] bg-[#fff6db]",
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
          const comparison = formatComparisonPrice(result);
          const rawPrice = pickRawPrice(result, getProductPrice);
          const price = formatMainPrice(rawPrice, formatPrice);

          return (
            <article
              key={String(result.key ?? result.id ?? result.ean ?? index)}
              className={[
                "relative grid min-h-[10.2rem] grid-cols-[minmax(0,1fr)_38%] overflow-hidden rounded-[1.55rem] border-[4px] border-[#8c6934] bg-[#fffdf8] shadow-[0_6px_0_rgba(91,72,44,0.14)]",
                isTwoItems ? "flex-1" : "",
              ].join(" ")}
            >
              <div className="relative min-w-0 px-4 py-4 pb-[4.25rem]">
                <div
                  className="line-clamp-3 text-[1.24rem] font-black leading-[0.98] text-[#123d32]"
                  style={{ fontFamily: cooper }}
                >
                  {name}
                </div>

                {store && (
                  <div className="mt-2 line-clamp-2 text-[0.90rem] font-black uppercase leading-[1.02] text-[#6c532c]">
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
                <div className="grid min-h-[5.6rem] flex-1 place-items-center overflow-hidden rounded-[1.15rem] border-[4px] border-[#dbc37f] bg-[#fff6dd] shadow-[inset_0_1px_9px_rgba(0,0,0,0.08)]">
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      className="h-full w-full object-contain p-2"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-[2.7rem]">🛒</span>
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
