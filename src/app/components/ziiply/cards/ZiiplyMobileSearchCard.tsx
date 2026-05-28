"use client";

// V460_DESKTOP_STYLE_MOBILE: mobiilin hakukortti rakennettu desktop-hakukortin tyyliin.
// Äänitä- ja Skanneri-napeissa käytetään 3 .webp-tilaa per nappi:
// voice: aanita-off.webp / aanita-on.webp / aanita-search.webp
// scanner: scanner-idle.webp / scanner-on.webp / scanner-search.webp

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

const VOICE_IMAGES = {
  idle: "/ui/voice/aanita-off.webp",
  recording: "/ui/voice/aanita-on.webp",
  processing: "/ui/voice/aanita-search.webp",
} as const;

const SCANNER_IMAGES = {
  idle: "/ui/scanner/scanner-idle.webp",
  active: "/ui/scanner/scanner-on.webp",
  processing: "/ui/scanner/scanner-search.webp",
} as const;

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
  return clean.length <= 22 ? clean : clean.slice(0, 19).trimEnd() + "...";
}

function RetroActionButton({
  kind,
  label,
  state,
  onClick,
}: {
  kind: "voice" | "scanner";
  label: string;
  state: "idle" | "recording" | "processing" | "active";
  onClick?: () => void;
}) {
  const imageSrc =
    kind === "voice"
      ? VOICE_IMAGES[state === "active" ? "recording" : (state as "idle" | "recording" | "processing")]
      : SCANNER_IMAGES[state === "recording" ? "active" : (state as "idle" | "active" | "processing")];

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative min-h-[4.85rem] overflow-hidden rounded-[1.05rem] bg-transparent shadow-[0_5px_0_rgba(91,55,14,0.24)] ring-1 ring-[#6f4a14]/20 active:translate-y-[1px] active:shadow-[0_2px_0_rgba(91,55,14,0.18)]"
    >
      <img src={imageSrc} alt={label} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
    </button>
  );
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[2.85rem] rounded-[1rem] px-3 py-1 text-[0.98rem] font-black leading-none transition active:scale-[0.98] ${
        active
          ? "bg-[#fff8df] text-[#073f28] shadow-inner ring-1 ring-[#b98222]/40"
          : "bg-[#d9a45d]/45 text-[#7b5531] shadow-inner ring-1 ring-[#a87226]/30"
      }`}
    >
      {children}
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
  hasSearchInput = false,
  loadingOffers = false,
  loadingNormal = false,
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
    <div
      className={`fixed inset-0 z-[72] flex items-end justify-center overflow-hidden bg-transparent px-2 pb-[calc(env(safe-area-inset-bottom)+6.15rem)] pt-[calc(env(safe-area-inset-top)+5.0rem)] sm:items-center sm:p-6 ${className}`}
    >
      <div className="h-[min(70dvh,650px)] w-full max-w-[28rem] overflow-visible rounded-[1.75rem] bg-[#f3dfb6] p-1.5 shadow-2xl ring-2 ring-[#8d662e]/45">
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.45rem] border border-[#7b531e]/35 bg-[#ffe8bd] p-3 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.45)]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.20] [background-image:radial-gradient(#b77622_1px,transparent_1px)] [background-size:12px_12px]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,250,235,0.95),transparent_46%)]" />

          <div className="relative z-10 flex h-full min-h-0 flex-col">
            <div className="shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[0.72rem] font-black uppercase tracking-[0.42em] text-[#5b3216]">{title}</p>
                  <h1 className="font-serif text-[2.05rem] font-black italic leading-[0.9] tracking-[-0.055em] text-[#0f3d26] drop-shadow-[0_1px_0_rgba(255,255,255,0.8)]">
                    {showResults ? "Hakutulokset" : "Tuotteet ja vertailu"}
                  </h1>
                </div>

                <button
                  type="button"
                  onClick={onAddInputToCart}
                  disabled={!hasSearchInput && !input.trim()}
                  className={`shrink-0 rounded-[1rem] border-2 px-3.5 py-2 font-serif text-[1.05rem] font-black italic shadow-[0_4px_0_rgba(56,35,8,0.30)] active:translate-y-[1px] ${
                    hasSearchInput || input.trim()
                      ? "border-[#d6aa46] bg-[#0d4a2e] text-[#fff2c8] ring-2 ring-[#112e1f]"
                      : "border-[#dec68d] bg-[#efe4cb] text-[#b7a98d]"
                  }`}
                >
                  Lisää vihkosesta
                </button>

                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#fff2d2] text-xl font-black text-[#6d5234] shadow-sm ring-2 ring-[#c98a2c]/55 active:scale-[0.96]"
                    aria-label="Sulje"
                  >
                    ×
                  </button>
                )}
              </div>

              <div className="mt-3 rounded-[1rem] bg-[#f8e8c6] p-1.5 shadow-[0_4px_0_rgba(105,64,13,0.18)] ring-2 ring-[#b97920]/50">
                <div className="flex items-center gap-2 rounded-[0.8rem] bg-[#fff8e8] px-3 py-2 shadow-inner ring-1 ring-white/70">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(event) => onInputChange?.(event.target.value)}
                    rows={1}
                    placeholder="maito, kahvi, jauheliha"
                    className="max-h-[5.4rem] min-h-[2.35rem] flex-1 resize-none bg-transparent font-serif text-[1.38rem] font-black leading-tight text-[#50361f] outline-none placeholder:text-[#8d6f55]"
                  />
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[1.75rem] text-[#6c4a2d]">⌕</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="rounded-[1rem] bg-[#ccd39b] p-1.5 shadow-[0_4px_0_rgba(87,73,22,0.20)] ring-2 ring-[#9a862f]/55">
                  <div className="flex items-center gap-2">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e7d083] text-[1.35rem] shadow-inner ring-1 ring-[#85581e]/30">🕵️</div>
                    <div className="min-w-0">
                      <div className="font-serif text-[1.35rem] font-black italic leading-none text-[#164127]">Gösta</div>
                      <div className="mt-0.5 text-[0.72rem] font-black leading-tight text-[#22301f]">Etsii huojennukset</div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.1rem] bg-[#d8a15b] p-1 shadow-[0_4px_0_rgba(91,55,14,0.18)] ring-2 ring-[#9d6b21]/55">
                  <div className="grid grid-cols-2 gap-1 rounded-[0.95rem] bg-[#d7a15c]/60 p-1">
                    <ModeButton active={searchMode === "cart"} onClick={() => onSearchModeChange?.("cart")}>
                      Koko<br />kori
                    </ModeButton>
                    <ModeButton active={searchMode === "single"} onClick={() => onSearchModeChange?.("single")}>
                      Yksi<br />tuote
                    </ModeButton>
                  </div>
                </div>

                <div className="rounded-[1rem] bg-[#ffd565] p-1.5 shadow-[0_4px_0_rgba(87,73,22,0.20)] ring-2 ring-[#c99021]/55">
                  <div className="flex items-center gap-2">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#e7d083] text-[1.35rem] shadow-inner ring-1 ring-[#85581e]/30">👩‍🍳</div>
                    <div className="min-w-0">
                      <div className="font-serif text-[1.35rem] font-black italic leading-none text-[#a43c1b]">Justiina</div>
                      <div className="mt-0.5 text-[0.72rem] font-black leading-tight text-[#573417]">Etsii ostokset</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-[0.9rem] bg-[#fff0cf] px-3 py-2 shadow-[0_3px_0_rgba(121,75,18,0.16)] ring-1 ring-[#c88a31]/45">
                <span className="text-xl">📣</span>
                <p className="min-w-0 flex-1 truncate text-[0.84rem] font-black text-[#6d3e1e]">
                  {subtitle || "Justiina ehdottaa sopivia hakusanoja kirjoituksen mukaan."}
                </p>
                <span className="text-xl font-black text-[#834a1e]">›</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <RetroActionButton kind="voice" label="Äänitä" state={voiceState} onClick={onVoiceClick} />
                <RetroActionButton kind="scanner" label="Skanneri" state={scannerState} onClick={onScannerClick} />
              </div>
            </div>

            {showResults && (
              <div className="mt-3 min-h-0 flex-1 overflow-hidden rounded-[1.15rem]">
                <div className="h-full space-y-3 overflow-y-auto py-1 pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {loading && (
                    <div className="rounded-[1.15rem] bg-[#fff5d8] px-5 py-6 text-center text-base font-black text-[#78633a] shadow-[0_5px_0_rgba(132,104,48,0.18)] ring-2 ring-[#d6bd76]">
                      Haetaan tuotteita…
                    </div>
                  )}

                  {!loading && items.length === 0 && (
                    <div className="rounded-[1.15rem] bg-[#fff5d8] px-5 py-6 text-center text-base font-black text-[#78633a] shadow-[0_5px_0_rgba(132,104,48,0.18)] ring-2 ring-[#d6bd76]">
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
                          className="grid grid-cols-[4.4rem_1fr_auto] items-center gap-3 rounded-[1.15rem] bg-[#fff4d9] px-3 py-3 shadow-[0_5px_0_rgba(132,104,48,0.20)] ring-2 ring-[#d6bd76]"
                        >
                          <div className="grid h-[4.1rem] w-[4.1rem] place-items-center overflow-hidden rounded-[0.9rem] bg-white shadow-inner">
                            {image ? (
                              <img src={image} alt="" className="h-full w-full object-contain p-1.5" loading="lazy" />
                            ) : (
                              <span className="text-2xl">🛒</span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="text-[18px] font-black leading-[1.06] tracking-[-0.03em] text-[#1f251c]">{truncateProductName(name)}</div>
                            {price && <div className="mt-1 text-[15px] font-black leading-none text-[#817451]">{price}</div>}
                          </div>

                          <button
                            type="button"
                            onClick={() => addHandler?.(product)}
                            className="rounded-[0.9rem] bg-[#0d8f3f] px-4 py-3 text-[15px] font-black text-white shadow-[0_4px_0_rgba(0,98,39,0.25)] active:translate-y-[1px] active:shadow-none"
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
