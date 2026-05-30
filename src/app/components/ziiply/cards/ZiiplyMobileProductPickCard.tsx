"use client";

import React from "react";

export type ZiiplyMobileProductPickResult = {
  id?: string | number;
  ean?: string;
  name?: string;
  title?: string;
  displayName?: string;
  store?: string;
  chain?: string;
  price?: number | string | null;
  image?: string;
  product?: any;
  [key: string]: unknown;
};

export type ZiiplyMobileProductPickCardProps = {
  title?: string;
  subtitle?: string;
  results: ZiiplyMobileProductPickResult[];
  onAdd?: (result: ZiiplyMobileProductPickResult) => void;
  onBack?: () => void;
  formatPrice?: (value: number) => string;
  getProductPrice?: (result: ZiiplyMobileProductPickResult) => number | null | undefined;
  className?: string;
  compact?: boolean;
};

export default function ZiiplyMobileProductPickCard({
  title = "Valitse lisättävä tuote",
  subtitle = "Sama EAN löytyi useammasta kaupasta",
  results,
  onAdd,
  onBack,
  formatPrice,
  getProductPrice,
  className = "",
  compact = false,
}: ZiiplyMobileProductPickCardProps) {
  const shown = Array.isArray(results) ? results : [];

  function getName(result: ZiiplyMobileProductPickResult) {
    return String(
      result.name ||
        result.title ||
        result.displayName ||
        result.product?.name ||
        result.product?.title ||
        result.product?.displayName ||
        "Tuote",
    );
  }

  function getStore(result: ZiiplyMobileProductPickResult) {
    const store = String(result.store || result.product?.store || "").trim();
    const chain = String(result.chain || result.product?.chain || "").trim();

    if (store && chain && store.toLowerCase() !== chain.toLowerCase()) {
      return `${chain} · ${store}`;
    }

    return store || chain || "";
  }

  function getPrice(result: ZiiplyMobileProductPickResult) {
    const directPrice =
      typeof result.price === "number"
        ? result.price
        : typeof result.price === "string"
          ? Number(result.price.replace(",", "."))
          : null;

    const productPrice =
      typeof result.product?.price === "number"
        ? result.product.price
        : typeof result.product?.price === "string"
          ? Number(String(result.product.price).replace(",", "."))
          : null;

    const resolvedPrice = getProductPrice?.(result) ?? directPrice ?? productPrice;

    if (typeof resolvedPrice !== "number" || !Number.isFinite(resolvedPrice)) return "";

    return formatPrice
      ? formatPrice(resolvedPrice)
      : `${resolvedPrice.toFixed(2).replace(".", ",")} €`;
  }

  return (
    <section
      className={[
        "relative isolate w-full overflow-hidden rounded-[1.7rem] border-[5px] border-[#6d5128] bg-[#fff5d9] text-[#163d32]",
        "shadow-[0_16px_40px_rgba(0,0,0,0.18),inset_0_0_0_2px_rgba(255,255,255,0.62)]",
        compact ? "max-w-[430px]" : "",
        className,
      ].join(" ")}
      aria-label={title}
    >
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.055] mix-blend-multiply"
        style={{
          backgroundImage: "radial-gradient(#3f2f16 0.45px, transparent 0.45px)",
          backgroundSize: "7px 7px",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 px-3 pb-3 pt-3">
        <div className="rounded-[1.05rem] border-[3px] border-[#9a7a47] bg-[#efe0b8] px-3 py-3 text-center shadow-[inset_0_2px_0_rgba(255,255,255,0.74)]">
          <div
            className="text-[17px] font-black uppercase leading-none tracking-[0.055em] text-[#163d32]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {title}
          </div>
          {subtitle && (
            <div className="mt-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#6d5430] opacity-80">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 max-h-[min(54vh,430px)] space-y-3 overflow-y-auto px-3 pb-3">
        {shown.map((result, index) => {
          const name = getName(result);
          const meta = getStore(result);
          const price = getPrice(result);
          const image = String(result.image || result.product?.image || "");

          return (
            <article
              key={`${String(result.id || result.ean || name)}-${index}`}
              className="relative overflow-hidden rounded-[1.45rem] border-[3px] border-[#8e6d39] bg-[#fffdf8] p-3 shadow-[0_10px_22px_rgba(0,0,0,0.10)]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-[70px] w-[70px] shrink-0 items-center justify-center overflow-hidden rounded-[1.05rem] border-[2.5px] border-[#d8bf82] bg-[#f8efd5] shadow-[inset_0_1px_0_rgba(255,255,255,0.78)]">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="text-[31px] opacity-70" aria-hidden="true">
                      🛒
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="line-clamp-2 text-[17px] font-black leading-[1.12] text-[#173a31]">
                    {name}
                  </div>

                  {meta && (
                    <div className="mt-2 truncate text-[14px] font-black uppercase text-[#6d5430]">
                      {meta}
                    </div>
                  )}

                  {price && (
                    <div className="mt-2 inline-flex items-center rounded-full border-[2.5px] border-[#3c7a43] bg-[#cbefc2] px-3 py-[5px] text-[16px] font-black leading-none text-[#14381c] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
                      {price}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onAdd?.(result)}
                  className="shrink-0 rounded-full border-[3px] border-[#2d8b3d] bg-[#00a339] px-5 py-3 text-[15px] font-black uppercase tracking-[0.03em] text-white shadow-[0_9px_16px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.28)] active:scale-[0.98]"
                >
                  Lisää
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {onBack && (
        <div className="relative z-10 px-3 pb-3">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[46px] w-full rounded-[1.1rem] border-[2.5px] border-[#9a7a47] bg-[#efe0b8] px-4 text-[14px] font-black uppercase tracking-[0.05em] text-[#163d32] shadow-[inset_0_2px_0_rgba(255,255,255,0.74)] active:scale-[0.99]"
          >
            Takaisin
          </button>
        </div>
      )}
    </section>
  );
}

