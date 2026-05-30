"use client";

// ZiiplyMobileProductPickCard v6
// - Ei yläpalkkia lainkaan.
// - Tuoteruudut jakavat tilan 50/50 silloin kun tuotteita on kaksi.
// - Tuoteruudut pakotetaan samankorkuisiksi.
// - Tuotekuva isompi.
// - Tekstidata oikealle, Lisää-nappi oikeaan alanurkkaan.
// - Hinta + vertailuhinta näkyvät samassa logiikassa kuin SearchResultsCardissa.
// - Yhteensopiva page.tsx:n nykyisten propsien kanssa: compact, title, subtitle, results,
//   formatPrice, getProductPrice, onAdd / onSelectResult.

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

function normalizePriceToEuros(price: unknown) {
  if (typeof price === "number" && Number.isFinite(price)) {
    return Math.abs(price) > 20 ? price / 100 : price;
  }

  const raw = String(price ?? "").trim();
  if (!raw) return null;

  const cleaned = raw
    .replace(/\s/g, "")
    .replace("€", "")
    .replace(",", ".");

  const number = Number(cleaned);
  if (!Number.isFinite(number)) return raw;

  return Math.abs(number) > 20 ? number / 100 : number;
}

function formatEuroPrice(price: unknown, externalFormatPrice?: (value: number) => string) {
  const value = normalizePriceToEuros(price);

  if (value == null) return "";

  if (typeof value === "string") {
    return value.includes("€") ? value : `${value} €`;
  }

  if (externalFormatPrice) return externalFormatPrice(value);

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

function getResolvedPrice(
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

function displayName(name: string) {
  return name.replace(/\s+/g, " ").trim();
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
          const name = displayName(getName(result));
          const store = getStore(result);
          const comparison = formatComparisonPrice(result);
          const price = formatEuroPrice(
            getResolvedPrice(result, getProductPrice),
            formatPrice,
          );

          return (
            <article
              key={String(result.key ?? result.id ?? result.ean ?? index)}
              className={[
                "relative grid min-h-[10.4rem] grid-cols-[42%_minmax(0,1fr)] overflow-hidden rounded-[1.55rem] border-[4px] border-[#8c6934] bg-[#fffdf8] shadow-[0_6px_0_rgba(91,72,44,0.14)]",
                isTwoItems ? "flex-1" : "",
              ].join(" ")}
            >
              <div className="flex h-full min-h-0 items-center justify-center p-3 pr-2">
                <div className="grid h-full max-h-[8.9rem] min-h-[7.7rem] w-full place-items-center overflow-hidden rounded-[1.25rem] border-[4px] border-[#dbc37f] bg-[#fff6dd] shadow-[inset_0_1px_9px_rgba(0,0,0,0.08)]">
                  {image ? (
                    <img
                      src={image}
                      alt=""
                      className="h-full w-full object-contain p-2"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-[3.2rem]">🛒</span>
                  )}
                </div>
              </div>

              <div className="relative min-w-0 px-2 py-4 pb-[4.35rem] pr-3">
                <div
                  className="line-clamp-3 text-[1.28rem] font-black leading-[0.98] text-[#123d32]"
                  style={{ fontFamily: cooper }}
                >
                  {name}
                </div>

                {store && (
                  <div className="mt-2 line-clamp-2 text-[0.92rem] font-black uppercase leading-[1.02] text-[#6c532c]">
                    {store}
                  </div>
                )}

                {comparison && (
                  <div className="mt-2 text-[0.84rem] font-black leading-none text-[#8a7a55]">
                    {comparison}
                  </div>
                )}

                <div className="absolute bottom-3 left-2 right-3 flex items-end justify-between gap-2">
                  {price ? (
                    <div className="inline-flex min-w-[5.15rem] items-center justify-center rounded-full border-[3px] border-[#347a3f] bg-[#d2f1c8] px-3 py-[0.38rem] text-[1.18rem] font-black leading-none text-[#153d1c] shadow-[inset_0_1px_0_rgba(255,255,255,0.70)]">
                      {price}
                    </div>
                  ) : (
                    <span />
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      onAdd?.(result);
                      onSelectResult?.(result);
                    }}
                    className="shrink-0 rounded-[0.95rem] border-[3px] border-[#178338] bg-[#08a63d] px-4 py-[0.86rem] text-[1rem] font-black uppercase leading-none tracking-[0.02em] text-[#fff3d8] shadow-[0_4px_0_rgba(0,74,24,0.24),inset_0_1px_0_rgba(255,255,255,0.26)] active:translate-y-[1px] active:shadow-[0_2px_0_rgba(0,74,24,0.24)]"
                  >
                    Lisää
                  </button>
                </div>
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
