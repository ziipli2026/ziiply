"use client";

import React from "react";
import Image from "next/image";

export type ZiiplyMobileSearchCardProduct = {
  id?: string | number;
  name?: string;
  title?: string;
  productName?: string;
  brandName?: string;
  price?: number | string;
  image?: string;
  imageUrl?: string;
  pictureUrl?: string;
  chain?: string;
  storeName?: string;
  [key: string]: any;
};

export type ZiiplyMobileSearchCardProps = {
  open?: boolean;
  title?: string;
  subtitle?: string;
  products?: ZiiplyMobileSearchCardProduct[];
  results?: ZiiplyMobileSearchCardProduct[];
  loading?: boolean;
  emptyText?: string;
  onAddProduct?: (product: ZiiplyMobileSearchCardProduct) => void;
  onAdd?: (product: ZiiplyMobileSearchCardProduct) => void;
  onClose?: () => void;
  onVoiceClick?: () => void;
  onScannerClick?: () => void;
  voiceState?: "idle" | "recording" | "processing";
  scannerState?: "idle" | "active" | "processing";
  className?: string;
};

function getProductName(product: ZiiplyMobileSearchCardProduct) {
  return String(
    product.name ||
      product.title ||
      product.productName ||
      product.brandName ||
      "Tuote",
  );
}

function getProductImage(product: ZiiplyMobileSearchCardProduct) {
  return String(product.image || product.imageUrl || product.pictureUrl || "");
}

function formatProductPrice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString("fi-FI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €";
  }

  const text = String(value ?? "").trim();
  if (!text) return "";
  if (text.includes("€")) return text;
  return text;
}

function truncateProductName(name: string) {
  const clean = name.replace(/\s+/g, " ").trim();
  if (clean.length <= 13) return clean;
  return clean.slice(0, 10).trimEnd() + "...";
}

/**
 * ZiiplyMobileSearchCard
 *
 * Responsive mobiilityylinen hakutulos-/tuotevalintaikkuna.
 * Käyttö:
 *
 * <ZiiplyMobileSearchCard
 *   open={searchPanelOpen}
 *   products={normalResults}
 *   onAddProduct={addProductToCart}
 * />
 *
 * Tämä ei sisällä hakumoottoria. Page.tsx pitää edelleen datan ja funktiot.
 */
export default function ZiiplyMobileSearchCard({
  open = true,
  title = "HAKUTULOKSET",
  subtitle,
  products,
  results,
  loading = false,
  emptyText = "Ei hakutuloksia.",
  onAddProduct,
  onAdd,
  onClose,
  onVoiceClick,
  onScannerClick,
  voiceState = "idle",
  scannerState = "idle",
  className = "",
}: ZiiplyMobileSearchCardProps) {
  const items = Array.isArray(products) ? products : Array.isArray(results) ? results : [];
  const addHandler = onAddProduct || onAdd;

  const voiceAsset =
    voiceState === "recording"
      ? "/ui/voice/aanita-rec.webp"
      : voiceState === "processing"
        ? "/ui/voice/aanita-processing.webp"
        : "/ui/voice/aanita-idle.webp";

  const scannerAsset =
    scannerState === "active"
      ? "/ui/scanner/scanner-active.webp"
      : scannerState === "processing"
        ? "/ui/scanner/scanner-processing.webp"
        : "/ui/scanner/scanner-idle.webp";

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[92] flex items-start justify-center overflow-hidden bg-black/18 px-3 pb-[calc(env(safe-area-inset-bottom)+5.8rem)] pt-[calc(env(safe-area-inset-top)+5.4rem)] backdrop-blur-[1px] sm:items-center sm:px-6 sm:py-8 ${className}`}
    >
      <div className="relative h-[min(76svh,720px)] w-full max-w-[360px] overflow-hidden rounded-[2.15rem] border-[5px] border-[#c9a85c] bg-[#ecd38f] shadow-[0_24px_50px_rgba(50,38,11,0.34),inset_0_0_0_4px_rgba(255,246,201,0.95)] sm:max-w-[430px]">
        <div className="pointer-events-none absolute inset-[7px] border-[3px] border-[#fff4c4]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(255,255,255,0.25),transparent_30%),linear-gradient(180deg,rgba(255,246,200,0.45),rgba(213,175,89,0.18))]" />

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-20 grid h-9 w-9 place-items-center rounded-full bg-[#fff3c8] text-lg font-black text-[#6c5a35] shadow-[0_3px_0_rgba(98,75,32,0.25)] active:translate-y-[1px]"
            aria-label="Sulje"
          >
            ×
          </button>
        )}

        <div className="relative z-10 flex h-full flex-col px-7 pb-6 pt-9">
          <div className="mb-6 text-center">
            <div className="text-[20px] font-black uppercase tracking-[0.55em] text-[#76633c] sm:text-[22px]">
              {title}
            </div>
            {subtitle && (
              <div className="mt-2 text-xs font-black uppercase tracking-[0.08em] text-[#8a7547]">
                {subtitle}
              </div>
            )}
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[1.35rem]">
            <div className="absolute right-0 top-0 z-20 h-full w-[12px] rounded-full bg-[#d7bd78]">
              <div className="mx-auto mt-0 h-[28%] w-[11px] rounded-full bg-[#7b693e]" />
            </div>

            <div className="h-full space-y-4 overflow-y-auto py-1 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {loading && (
                <div className="rounded-[1.65rem] bg-[#fff5d8] px-5 py-8 text-center text-lg font-black text-[#78633a] shadow-[0_7px_0_rgba(132,104,48,0.22)] ring-2 ring-[#d6bd76]">
                  Haetaan tuotteita…
                </div>
              )}

              {!loading && items.length === 0 && (
                <div className="rounded-[1.65rem] bg-[#fff5d8] px-5 py-8 text-center text-lg font-black text-[#78633a] shadow-[0_7px_0_rgba(132,104,48,0.22)] ring-2 ring-[#d6bd76]">
                  {emptyText}
                </div>
              )}

              {!loading &&
                items.map((product, index) => {
                  const name = getProductName(product);
                  const image = getProductImage(product);
                  const price = formatProductPrice(product.price);
                  const key = String(product.id ?? product.ean ?? `${name}-${index}`);

                  return (
                    <div
                      key={key}
                      className="grid grid-cols-[5.7rem_1fr_auto] items-center gap-3 rounded-[1.65rem] bg-[#fff4d9] px-4 py-3 shadow-[0_7px_0_rgba(132,104,48,0.25)] ring-2 ring-[#d6bd76]"
                    >
                      <div className="grid h-[5.25rem] w-[5.25rem] place-items-center overflow-hidden rounded-[1.2rem] bg-white shadow-inner">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={image}
                            alt=""
                            className="h-full w-full object-contain p-1.5"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-3xl">🛒</span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-[22px] font-black leading-[1.06] tracking-[-0.03em] text-[#1f251c] sm:text-[24px]">
                          {truncateProductName(name)}
                        </div>
                        {price && (
                          <div className="mt-1 text-[18px] font-black leading-none text-[#817451]">
                            {price}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => addHandler?.(product)}
                        className="rounded-[1.05rem] bg-[#00b948] px-5 py-3 text-[18px] font-black text-white shadow-[0_4px_0_rgba(0,98,39,0.25)] active:translate-y-[1px] active:shadow-none"
                      >
                        Lisää
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onVoiceClick}
              className="group relative overflow-hidden rounded-[1.7rem] border-[3px] border-[#caa24f] bg-[#214734] shadow-[0_7px_0_rgba(82,58,18,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] active:translate-y-[1px] active:shadow-[0_3px_0_rgba(82,58,18,0.22)]"
            >
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent_45%)]" />

              <div className="relative flex items-center justify-center px-3 py-2">
                <Image
                  src={voiceAsset}
                  alt="Äänitä"
                  width={260}
                  height={84}
                  className="h-auto w-full object-contain"
                  priority
                />
              </div>
            </button>

            <button
              type="button"
              onClick={onScannerClick}
              className="group relative overflow-hidden rounded-[1.7rem] border-[3px] border-[#caa24f] bg-[#214734] shadow-[0_7px_0_rgba(82,58,18,0.28),inset_0_1px_0_rgba(255,255,255,0.14)] active:translate-y-[1px] active:shadow-[0_3px_0_rgba(82,58,18,0.22)]"
            >
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),transparent_45%)]" />

              <div className="relative flex items-center justify-center px-3 py-2">
                <Image
                  src={scannerAsset}
                  alt="Skanneri"
                  width={260}
                  height={84}
                  className="h-auto w-full object-contain"
                />
              </div>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export { ZiiplyMobileSearchCard };
