"use client";

import React from "react";

export type ZiiplyMobileSearchCardProduct = {
  id?: string | number;
  ean?: string | number;
  name?: string;
  title?: string;
  productName?: string;
  brandName?: string;
  price?: number | string;
  image?: string;
  imageUrl?: string;
  pictureUrl?: string;
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
  className?: string;

  input?: string;
  onInputChange?: (value: string) => void;
  searchMode?: "cart" | "single";
  onSearchModeChange?: (mode: "cart" | "single") => void;
  onAddInputToCart?: () => void;
  onOfferSearch?: () => void;
  onNormalSearch?: () => void;
  hasSearchInput?: boolean;
  loadingOffers?: boolean;
  loadingNormal?: boolean;
  singleProductCompareLoading?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;

  onVoiceClick?: () => void;
  onScannerClick?: () => void;
  voiceState?: "idle" | "recording" | "processing";
  scannerState?: "idle" | "active" | "processing";
};

function getProductName(product: ZiiplyMobileSearchCardProduct) {
  return String(product.name || product.title || product.productName || product.brandName || "Tuote");
}

function getProductImage(product: ZiiplyMobileSearchCardProduct) {
  return String(product.image || product.imageUrl || product.pictureUrl || "");
}

function formatProductPrice(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  }

  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.includes("€") ? text : text;
}

function truncateProductName(name: string) {
  const clean = name.replace(/\s+/g, " ").trim();
  return clean.length <= 13 ? clean : clean.slice(0, 10).trimEnd() + "...";
}

function ActionPlate({
  label,
  sublabel,
  state,
  onClick,
}: {
  label: string;
  sublabel: string;
  state: "idle" | "recording" | "processing" | "active";
  onClick?: () => void;
}) {
  const lightClass =
    state === "recording" || state === "active"
      ? "bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.75)]"
      : state === "processing"
        ? "bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.70)]"
        : "bg-transparent shadow-[inset_0_0_0_3px_rgba(255,232,176,0.95)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative min-h-[5.15rem] overflow-hidden rounded-[1.45rem] border-[4px] border-[#d3ad55] bg-[#173f2d] px-4 py-3 text-left text-[#fff2bf] shadow-[0_8px_0_rgba(91,68,24,0.22),inset_0_1px_0_rgba(255,255,255,0.16)] active:translate-y-[1px] active:shadow-[0_4px_0_rgba(91,68,24,0.18)]"
    >
      <div className="pointer-events-none absolute inset-[5px] rounded-[1.05rem] border border-[#6ca17b]/50" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(255,255,255,0.18),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.10),transparent_48%)]" />

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[1.55rem] font-black leading-none tracking-[-0.04em]">
            {label}
          </span>
          <span className={`mt-0.5 h-5 w-5 shrink-0 rounded-full border-[3px] border-[#f3d99a] ${lightClass}`} />
        </div>

        <span className="mt-3 block text-[0.72rem] font-black uppercase tracking-[0.22em] opacity-85">
          {sublabel}
        </span>
      </div>
    </button>
  );
}

export default function ZiiplyMobileSearchCard({
  open = true,
  title = "HAKU",
  subtitle,
  products,
  results,
  loading = false,
  emptyText = "Ei hakutuloksia.",
  onAddProduct,
  onAdd,
  onClose,
  className = "",
  input = "",
  onInputChange,
  searchMode = "cart",
  onSearchModeChange,
  onAddInputToCart,
  onOfferSearch,
  onNormalSearch,
  hasSearchInput = false,
  loadingOffers = false,
  loadingNormal = false,
  singleProductCompareLoading = false,
  inputRef,
  onVoiceClick,
  onScannerClick,
  voiceState = "idle",
  scannerState = "idle",
}: ZiiplyMobileSearchCardProps) {
  const items = Array.isArray(products) ? products : Array.isArray(results) ? results : [];
  const addHandler = onAddProduct || onAdd;
  const showResults = loading || items.length > 0 || Boolean(subtitle);

  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-[72] flex items-end justify-center overflow-hidden bg-transparent px-2 pb-[calc(env(safe-area-inset-bottom)+6.45rem)] pt-[calc(env(safe-area-inset-top)+5.0rem)] sm:items-center sm:p-6 ${className}`}>
      <div className="h-[min(70dvh,650px)] w-full max-w-[28rem] overflow-visible overscroll-none rounded-[1.65rem] bg-white/90 p-2.5 shadow-2xl ring-1 ring-white/70 backdrop-blur-2xl">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/95 p-3 shadow-[0_18px_55px_rgba(15,23,42,0.10)] ring-1 ring-slate-100 sm:rounded-[2rem] sm:p-4">
          <div className="flex h-full min-h-0 flex-col">
            <div className="shrink-0">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-green-50 text-xl shadow-sm ring-1 ring-green-100">🔎</div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.32em] text-green-700">{title}</p>
                  <h1 className="mt-0.5 text-[1.14rem] font-black leading-[1.05] tracking-tight text-slate-950 sm:text-[1.42rem]">
                    {showResults ? "Hakutulokset" : "Mitä haluat ostaa?"}
                  </h1>
                  <p className="mt-0.5 text-[11px] font-bold leading-snug text-slate-500">
                    {subtitle || "Kirjoita tuotteet ja valitse toiminto alta."}
                  </p>
                </div>
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-100 text-lg font-black text-slate-500 shadow-sm ring-1 ring-slate-200 active:scale-[0.96]"
                    aria-label="Sulje"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="mt-1 rounded-[1.05rem] bg-slate-50/90 p-1 ring-1 ring-slate-100">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSearchModeChange?.("cart")}
                    className={`min-h-[2.35rem] rounded-[0.9rem] px-3 py-1 text-sm font-black transition active:scale-[0.98] ${
                      searchMode === "cart"
                        ? "bg-green-700 text-white shadow-md shadow-green-600/20 ring-1 ring-black/10"
                        : "bg-white text-slate-700 ring-1 ring-slate-200"
                    }`}
                  >
                    🛒 Koko kori
                  </button>
                  <button
                    type="button"
                    onClick={() => onSearchModeChange?.("single")}
                    className={`min-h-[2.35rem] rounded-[0.9rem] px-3 py-1 text-sm font-black transition active:scale-[0.98] ${
                      searchMode === "single"
                        ? "bg-green-700 text-white shadow-md shadow-green-600/20 ring-1 ring-black/10"
                        : "bg-white text-slate-700 ring-1 ring-slate-200"
                    }`}
                  >
                    🔎 Yksi tuote
                  </button>
                </div>
              </div>

              <div className="mt-2 rounded-[1.25rem] border border-green-100 bg-white p-3 shadow-sm ring-1 ring-green-50">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-slate-500">Tuotteet</p>
                  <button
                    type="button"
                    onClick={onAddInputToCart}
                    disabled={!hasSearchInput}
                    className={`rounded-full px-4 py-1.5 text-sm font-black ring-1 ${
                      hasSearchInput
                        ? "bg-green-50 text-green-700 ring-green-200 active:scale-[0.98]"
                        : "cursor-not-allowed bg-slate-50 text-slate-300 ring-slate-100"
                    }`}
                  >
                    Liitä
                  </button>
                </div>

                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => onInputChange?.(event.target.value)}
                  rows={2}
                  placeholder="Kirjoita tuotteet riveittäin tai pilkulla, esim. maito, kahvi, jauheliha"
                  className="min-h-[5rem] w-full resize-none rounded-[1.1rem] border-[3px] border-green-600 bg-white px-4 py-3 text-[1.05rem] font-black leading-snug text-slate-900 outline-none placeholder:text-slate-400 focus:border-green-700 focus:ring-4 focus:ring-green-100"
                />

                <p className="mt-2 text-xs font-black text-slate-400">Max 8 tuotetta. Liitä muistilistasta.</p>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <ActionPlate label="Äänitä" sublabel="RCA-mikki" state={voiceState} onClick={onVoiceClick} />
                <ActionPlate label="Skanneri" sublabel="EAN / viivakoodi" state={scannerState} onClick={onScannerClick} />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onOfferSearch}
                  disabled={!hasSearchInput || loadingOffers}
                  className={`min-h-[2.55rem] rounded-[1rem] px-3 text-xs font-black leading-tight transition ${
                    !hasSearchInput || loadingOffers
                      ? "cursor-not-allowed bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                      : "bg-rose-100 text-rose-700 shadow-sm ring-1 ring-rose-200 active:scale-[0.98]"
                  }`}
                >
                  {loadingOffers ? "Haetaan…" : "🔥 Huojennukset"}
                </button>
                <button
                  type="button"
                  onClick={onNormalSearch}
                  disabled={!hasSearchInput || loadingNormal || singleProductCompareLoading}
                  className={`min-h-[2.55rem] rounded-[1rem] px-3 text-xs font-black leading-tight transition ${
                    !hasSearchInput || loadingNormal || singleProductCompareLoading
                      ? "cursor-not-allowed bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                      : "bg-green-700 text-white shadow-md shadow-green-600/20 ring-1 ring-black/10 active:scale-[0.98]"
                  }`}
                >
                  {loadingNormal || singleProductCompareLoading ? "Haetaan…" : "🔎 Vertailu"}
                </button>
              </div>
            </div>

            {showResults && (
              <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-[1.35rem]">
                <div className="h-full space-y-3 overflow-y-auto py-1 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {loading && (
                    <div className="rounded-[1.35rem] bg-[#fff5d8] px-5 py-6 text-center text-base font-black text-[#78633a] shadow-[0_5px_0_rgba(132,104,48,0.18)] ring-2 ring-[#d6bd76]">
                      Haetaan tuotteita…
                    </div>
                  )}

                  {!loading && items.length === 0 && (
                    <div className="rounded-[1.35rem] bg-[#fff5d8] px-5 py-6 text-center text-base font-black text-[#78633a] shadow-[0_5px_0_rgba(132,104,48,0.18)] ring-2 ring-[#d6bd76]">
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
                          className="grid grid-cols-[4.8rem_1fr_auto] items-center gap-3 rounded-[1.35rem] bg-[#fff4d9] px-3 py-3 shadow-[0_5px_0_rgba(132,104,48,0.20)] ring-2 ring-[#d6bd76]"
                        >
                          <div className="grid h-[4.45rem] w-[4.45rem] place-items-center overflow-hidden rounded-[1rem] bg-white shadow-inner">
                            {image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={image} alt="" className="h-full w-full object-contain p-1.5" loading="lazy" />
                            ) : (
                              <span className="text-2xl">🛒</span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="text-[19px] font-black leading-[1.06] tracking-[-0.03em] text-[#1f251c]">
                              {truncateProductName(name)}
                            </div>
                            {price && <div className="mt-1 text-[16px] font-black leading-none text-[#817451]">{price}</div>}
                          </div>

                          <button
                            type="button"
                            onClick={() => addHandler?.(product)}
                            className="rounded-[0.95rem] bg-[#00b948] px-4 py-3 text-[15px] font-black text-white shadow-[0_4px_0_rgba(0,98,39,0.25)] active:translate-y-[1px] active:shadow-none"
                          >
                            Lisää
                          </button>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export { ZiiplyMobileSearchCard };
