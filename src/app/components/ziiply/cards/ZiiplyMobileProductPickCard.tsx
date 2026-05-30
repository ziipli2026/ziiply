"use client";

import React from "react";

export type ZiiplyProductPickResult = {
  id?: string | number;
  ean?: string | number;
  name?: string;
  title?: string;
  displayName?: string;
  brandName?: string;
  chain?: string;
  store?: string;
  storeName?: string;
  price?: number | string;
  image?: string;
  imageUrl?: string;
  pictureUrl?: string;
  comparisonPrice?: string | number | null;
  comparisonUnit?: string;
  priceUnit?: string;
  unit?: string;
  packageSize?: string;
  unitPrice?: string | number | null;
  pricePerUnit?: string | number | null;
  comparisonPriceText?: string | number | null;
  product?: any;
  [key: string]: unknown;
};

type Props = {
  title?: string;
  subtitle?: string;
  results: ZiiplyProductPickResult[];
  onAdd?: (result: ZiiplyProductPickResult) => void;
  formatPrice?: (value: number) => string;
  getProductPrice?: (result: ZiiplyProductPickResult) => number | null | undefined;
  compact?: boolean;
  className?: string;
};

const cooper = '"Cooper Black","Cooper Std Black",Georgia,serif';
const copper = '"Copperplate","Baskerville",Georgia,serif';

function normalizeText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizePriceToEuros(price: unknown) {
  if (typeof price === "number" && Number.isFinite(price)) {
    return Math.abs(price) > 20 ? price / 100 : price;
  }

  const raw = String(price ?? "").trim();
  if (!raw) return null;

  const cleaned = raw.replace(/\s/g, "").replace("€", "").replace(",", ".");
  const number = Number(cleaned);
  if (!Number.isFinite(number)) return raw;

  return Math.abs(number) > 20 ? number / 100 : number;
}

function formatEuroPrice(price: unknown, externalFormatter?: (value: number) => string) {
  const value = normalizePriceToEuros(price);
  if (value == null) return "";

  if (typeof value === "string") {
    return value.includes("€") ? value : `${value} €`;
  }

  return externalFormatter
    ? externalFormatter(value)
    : `${value.toLocaleString("fi-FI", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} €`;
}

function normalizeComparisonValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.abs(value) > 20 ? value / 100 : value;
  }

  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (raw.includes("€") || raw.includes("/")) return raw;

  const parsed = Number(raw.replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(parsed)) return null;

  return Math.abs(parsed) > 20 ? parsed / 100 : parsed;
}

function inferComparisonUnit(result: ZiiplyProductPickResult) {
  const product = result.product ?? {};
  const raw = [
    result.comparisonUnit,
    result.priceUnit,
    result.unit,
    result.packageSize,
    result.name,
    result.title,
    product.comparisonUnit,
    product.priceUnit,
    product.unit,
    product.packageSize,
    product.name,
    product.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b(l|ltr|litra|litran|ml|cl)\b/.test(raw)) return "€/l";
  if (/\b(kpl|pkt|pari|rll|rs|ps|tlk)\b/.test(raw)) return "€/kpl";
  return "€/kg";
}

function formatComparisonPrice(result: ZiiplyProductPickResult) {
  const product = result.product ?? {};
  const candidates = [
    result.comparisonPrice,
    result.unitPrice,
    result.pricePerUnit,
    result.comparisonPriceText,
    product.comparisonPrice,
    product.unitPrice,
    product.pricePerUnit,
    product.comparisonPriceText,
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
  title = "Valitse lisättävä tuote",
  subtitle = "Sama EAN löytyi useammasta kaupasta",
  results,
  onAdd,
  formatPrice,
  getProductPrice,
  compact = false,
  className = "",
}: Props) {
  function getName(result: ZiiplyProductPickResult) {
    return normalizeText(
      result.name ||
        result.title ||
        result.displayName ||
        result.brandName ||
        result.product?.name ||
        result.product?.title ||
        result.product?.brandName ||
        "Tuote",
    );
  }

  function getStore(result: ZiiplyProductPickResult) {
    const chain = normalizeText(result.chain || result.product?.chain);
    const store = normalizeText(result.storeName || result.store || result.product?.storeName || result.product?.store);
    if (chain && store) return `${chain} · ${store}`;
    return chain || store;
  }

  function getImage(result: ZiiplyProductPickResult) {
    return normalizeText(
      result.image ||
        result.imageUrl ||
        result.pictureUrl ||
        result.product?.image ||
        result.product?.imageUrl ||
        result.product?.pictureUrl,
    );
  }

  function getMainPrice(result: ZiiplyProductPickResult) {
    const product = result.product ?? {};
    const raw =
      getProductPrice?.(result) ??
      result.price ??
      product.price ??
      product.currentPrice ??
      null;

    return formatEuroPrice(raw, formatPrice);
  }

  return (
    <div
      className={[
        "relative w-full overflow-hidden rounded-[1.45rem]",
        compact ? "max-w-[430px]" : "",
        "border-[4px] border-[#6d5128] bg-[#fff5d9]",
        "shadow-[0_14px_34px_rgba(0,0,0,0.20),inset_0_0_0_2px_rgba(255,255,255,0.68)]",
        "text-[#163d32]",
        className,
      ].join(" ")}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.055] mix-blend-multiply"
        style={{
          backgroundImage: "radial-gradient(#3f2f16 0.45px, transparent 0.45px)",
          backgroundSize: "7px 7px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 p-3 pb-2">
        <div className="rounded-[1rem] border-[3px] border-[#9a7a47] bg-[#efe0b8] px-3 py-3 text-center shadow-[inset_0_2px_0_rgba(255,255,255,0.76)]">
          <div
            className="truncate text-[20px] font-black uppercase leading-none tracking-[0.055em] text-[#163d32]"
            style={{ fontFamily: cooper }}
            title={title}
          >
            {title}
          </div>

          {!!subtitle && (
            <div
              className="mt-2 truncate text-[11px] font-black uppercase tracking-[0.16em] text-[#7b6544]"
              style={{ fontFamily: copper }}
              title={subtitle}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 flex max-h-[min(54vh,420px)] flex-col gap-3 overflow-y-auto px-3 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {results.map((result, index) => {
          const name = getName(result);
          const image = getImage(result);
          const store = getStore(result);
          const price = getMainPrice(result);
          const comparisonPrice = formatComparisonPrice(result);

          return (
            <article
              key={String(result.id ?? result.ean ?? `${name}-${store}-${index}`)}
              className="relative grid min-h-[132px] grid-cols-[96px_minmax(0,1fr)] gap-3 overflow-hidden rounded-[1.35rem] border-[3px] border-[#8e6d39] bg-[#fffdf8] p-3 shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
            >
              <div className="grid h-[96px] w-[96px] place-items-center overflow-hidden rounded-[1.08rem] border-[3px] border-[#d8bf82] bg-[#fff7df] shadow-[inset_0_1px_8px_rgba(0,0,0,0.08)]">
                {image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={image}
                    alt=""
                    className="h-full w-full object-contain p-1.5"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-[38px] opacity-70">🛒</span>
                )}
              </div>

              <div className="min-w-0 pb-[3.45rem] pr-[5.95rem]">
                <div
                  className="text-[19px] font-black leading-[1.05] tracking-[-0.025em] text-[#173a31] line-clamp-3"
                  style={{ fontFamily: cooper }}
                  title={name}
                >
                  {name}
                </div>

                {!!store && (
                  <div className="mt-2 truncate text-[14px] font-black uppercase tracking-[0.02em] text-[#6d5430]" title={store}>
                    {store}
                  </div>
                )}

                {comparisonPrice && (
                  <div className="mt-1 truncate text-[12px] font-black text-[#8a7a55]" title={comparisonPrice}>
                    {comparisonPrice}
                  </div>
                )}
              </div>

              {price && (
                <div className="absolute bottom-3 left-[112px] inline-flex rounded-full border-[3px] border-[#3c7a43] bg-[#cbefc2] px-4 py-[5px] text-[18px] font-black leading-none text-[#14381c] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                  {price}
                </div>
              )}

              <button
                type="button"
                onClick={() => onAdd?.(result)}
                className="absolute bottom-3 right-3 z-20 h-[52px] w-[92px] rounded-[1rem] border-[3px] border-[#2d8b3d] bg-[#00a339] px-2 text-[16px] font-black uppercase tracking-[0.03em] text-white shadow-[0_8px_15px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.28)] active:translate-y-[1px]"
              >
                Lisää
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export { ZiiplyMobileProductPickCard };
