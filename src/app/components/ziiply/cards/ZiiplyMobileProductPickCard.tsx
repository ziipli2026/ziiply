"use client";

import React from "react";

export type ZiiplyProductPickResult = {
  id?: string | number;
  name?: string;
  title?: string;
  displayName?: string;
  chain?: string;
  store?: string;
  price?: number | string;
  image?: string;
  imageUrl?: string;
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
    return String(
      result.name ||
        result.title ||
        result.displayName ||
        result.product?.name ||
        result.product?.title ||
        "Tuote",
    );
  }

  function getStore(result: ZiiplyProductPickResult) {
    const chain = String(result.chain || result.product?.chain || "").trim();
    const store = String(result.store || result.product?.store || "").trim();

    if (chain && store) return `${chain} · ${store}`;
    return chain || store;
  }

  function getImage(result: ZiiplyProductPickResult) {
    return String(
      result.image ||
        result.imageUrl ||
        result.product?.image ||
        result.product?.imageUrl ||
        "",
    );
  }

  function getPrice(result: ZiiplyProductPickResult) {
    const raw =
      getProductPrice?.(result) ??
      (typeof result.price === "number"
        ? result.price
        : typeof result.price === "string"
          ? Number(String(result.price).replace(",", "."))
          : null) ??
      (typeof result.product?.price === "number" ? result.product.price : null);

    if (typeof raw !== "number" || !Number.isFinite(raw)) return "";
    return formatPrice ? formatPrice(raw) : `${raw.toFixed(2).replace(".", ",")} €`;
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

      <div className="relative z-10 p-3">
        <div className="rounded-[1rem] border-[3px] border-[#9a7a47] bg-[#efe0b8] px-3 py-3 text-center shadow-[inset_0_2px_0_rgba(255,255,255,0.76)]">
          <div
            className="truncate text-[20px] font-black uppercase leading-none tracking-[0.06em] text-[#163d32]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {title}
          </div>

          {!!subtitle && (
            <div className="mt-2 truncate text-[11px] font-black uppercase tracking-[0.16em] text-[#7b6544]">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 flex max-h-[min(54vh,420px)] flex-col gap-3 overflow-y-auto px-3 pb-3">
        {results.map((result, index) => {
          const image = getImage(result);
          const price = getPrice(result);
          const store = getStore(result);

          return (
            <article
              key={`${getName(result)}-${store}-${index}`}
              className="relative min-h-[128px] overflow-hidden rounded-[1.35rem] border-[3px] border-[#8e6d39] bg-[#fffdf8] p-3 pr-[108px] shadow-[0_8px_20px_rgba(0,0,0,0.12)]"
            >
              <div className="flex min-w-0 gap-3">
                <div className="flex h-[74px] w-[74px] shrink-0 items-center justify-center overflow-hidden rounded-[1rem] border-[3px] border-[#d8bf82] bg-[#f8efd5] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  {image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={image}
                      alt=""
                      className="h-full w-full object-contain p-1"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-[34px] opacity-70">🛒</span>
                  )}
                </div>

                <div className="min-w-0 flex-1 pb-10">
                  <div className="line-clamp-2 text-[20px] font-black leading-[1.08] tracking-[-0.02em] text-[#173a31]">
                    {getName(result)}
                  </div>

                  {!!store && (
                    <div className="mt-2 truncate text-[15px] font-black uppercase tracking-[0.02em] text-[#6d5430]">
                      {store}
                    </div>
                  )}
                </div>
              </div>

              {!!price && (
                <div className="absolute bottom-3 left-[90px] inline-flex rounded-full border-[3px] border-[#3c7a43] bg-[#cbefc2] px-4 py-[5px] text-[18px] font-black leading-none text-[#14381c] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                  {price}
                </div>
              )}

              <button
                type="button"
                onClick={() => onAdd?.(result)}
                className="absolute bottom-3 right-3 rounded-full border-[3px] border-[#2d8b3d] bg-[#00a339] px-5 py-3 text-[17px] font-black uppercase tracking-[0.03em] text-white shadow-[0_9px_17px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.28)] active:scale-[0.98]"
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
