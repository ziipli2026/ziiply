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
  return clean.length <= 18 ? clean : clean.slice(0, 15).trimEnd() + "...";
}

function BroadcastWaves({ active }: { active: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-y-0 left-1/2 z-[1] w-[70%] -translate-x-1/2">
      <span
        className={`absolute left-[8%] top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border-l-[3px] border-[#f4d98c] opacity-55 ${
          active ? "animate-[ziiplyVoicePulse_1.05s_ease-in-out_infinite]" : ""
        }`}
      />
      <span
        className={`absolute left-[2%] top-1/2 h-12 w-12 -translate-y-1/2 rounded-full border-l-[3px] border-[#f4d98c] opacity-35 ${
          active ? "animate-[ziiplyVoicePulse_1.2s_ease-in-out_infinite]" : ""
        }`}
      />
      <span
        className={`absolute right-[8%] top-1/2 h-8 w-8 -translate-y-1/2 rounded-full border-r-[3px] border-[#f4d98c] opacity-55 ${
          active ? "animate-[ziiplyVoicePulse_1.05s_ease-in-out_infinite]" : ""
        }`}
      />
      <span
        className={`absolute right-[2%] top-1/2 h-12 w-12 -translate-y-1/2 rounded-full border-r-[3px] border-[#f4d98c] opacity-35 ${
          active ? "animate-[ziiplyVoicePulse_1.2s_ease-in-out_infinite]" : ""
        }`}
      />
    </div>
  );
}

function StatusLight({ state }: { state: "idle" | "recording" | "processing" | "active" }) {
  const className =
    state === "recording" || state === "active"
      ? "bg-[#e43227] shadow-[0_0_0_3px_rgba(119,23,16,0.18),0_0_18px_rgba(228,50,39,0.8)]"
      : state === "processing"
        ? "bg-[#f4c542] shadow-[0_0_0_3px_rgba(123,86,13,0.18),0_0_18px_rgba(244,197,66,0.75)]"
        : "bg-[#173f2d] shadow-[inset_0_0_0_3px_rgba(255,226,160,0.95)]";

  return (
    <span className={`absolute right-4 top-4 z-20 h-5 w-5 rounded-full border-[3px] border-[#f6d98d] ${className}`} />
  );
}

function RetroActionButton({
  kind,
  label,
  sublabel,
  state,
  onClick,
}: {
  kind: "voice" | "scanner";
  label: string;
  sublabel: string;
  state: "idle" | "recording" | "processing" | "active";
  onClick?: () => void;
}) {
  const active = state === "recording" || state === "processing" || state === "active";

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative min-h-[5.2rem] overflow-hidden rounded-[1.35rem] border-[4px] border-[#cfaa56] bg-[#163f2d] px-4 py-3 text-left text-[#fff2bf] shadow-[0_8px_0_rgba(92,70,26,0.22),inset_0_1px_0_rgba(255,255,255,0.16)] active:translate-y-[1px] active:shadow-[0_4px_0_rgba(92,70,26,0.18)]"
    >
      <div className="pointer-events-none absolute inset-[5px] rounded-[0.95rem] border border-[#77a889]/45" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_0%,rgba(255,255,255,0.22),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.10),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:radial-gradient(#ffe9a7_1px,transparent_1px)] [background-size:10px_10px]" />

      {kind === "voice" && <BroadcastWaves active={active} />}
      <StatusLight state={state} />

      <div className="relative z-10 flex h-full flex-col justify-between">
        <span className="max-w-[80%] text-[1.62rem] font-black leading-none tracking-[-0.05em]">
          {label}
        </span>

        <div className="mt-3 flex items-end justify-between gap-2">
          <span className="block text-[0.73rem] font-black uppercase tracking-[0.22em] opacity-85">
            {sublabel}
          </span>
          <span className="text-[1.28rem] leading-none opacity-90">
            {kind === "voice" ? "◉" : "▥"}
          </span>
        </div>
      </div>
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
      className={`min-h-[2.7rem] rounded-[1.15rem] px-3 py-1 text-[1rem] font-black transition active:scale-[0.98] ${
        active
          ? "bg-[#008c3a] text-white shadow-[0_4px_0_rgba(0,83,32,0.24)] ring-1 ring-black/10"
          : "bg-white text-[#253247] ring-2 ring-[#e2e8f0]"
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
    <div
      className={`fixed inset-0 z-[72] flex items-end justify-center overflow-hidden bg-transparent px-2 pb-[calc(env(safe-area-inset-bottom)+6.45rem)] pt-[calc(env(safe-area-inset-top)+5.0rem)] sm:items-center sm:p-6 ${className}`}
    >
      <div className="h-[min(70dvh,650px)] w-full max-w-[28rem] overflow-visible overscroll-none rounded-[1.9rem] bg-white/80 p-2.5 shadow-2xl ring-1 ring-white/80 backdrop-blur-2xl">
        <div className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[1.55rem] border-[3px] border-[#f2f6f3] bg-[#fffdf7] p-3 shadow-[0_18px_55px_rgba(15,23,42,0.10)] ring-1 ring-white sm:rounded-[2rem] sm:p-4">
          <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:radial-gradient(#d9c171_1px,transparent_1px)] [background-size:13px_13px]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.85),transparent_42%)]" />

          <div className="relative z-10 flex h-full min-h-0 flex-col">
            <div className="shrink-0">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.25rem] bg-[#eafff2] text-[1.55rem] shadow-sm ring-2 ring-[#c6f7d8]">
                  🔎
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.48em] text-[#008c3a]">
                    {title}
                  </p>
                  <h1 className="mt-0.5 text-[1.32rem] font-black leading-[1.02] tracking-[-0.045em] text-[#08111f]">
                    {showResults ? "Hakutulokset" : "Mitä haluat ostaa?"}
                  </h1>
                  <p className="mt-1 text-[0.82rem] font-black leading-snug text-[#64748b]">
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

              <div className="mt-3 rounded-[1.45rem] bg-white/80 p-1 ring-2 ring-[#e7eef4]">
                <div className="grid grid-cols-2 gap-1.5">
                  <ModeButton active={searchMode === "cart"} onClick={() => onSearchModeChange?.("cart")}>
                    🛒 Koko kori
                  </ModeButton>
                  <ModeButton active={searchMode === "single"} onClick={() => onSearchModeChange?.("single")}>
                    🔎 Yksi tuote
                  </ModeButton>
                </div>
              </div>

              <div className="mt-3 rounded-[1.45rem] border border-[#c8f6d5] bg-white/92 p-3 shadow-sm ring-1 ring-[#dcffe8]">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[0.82rem] font-black uppercase tracking-[0.08em] text-[#516178]">
                    Tuotteet
                  </p>
                  <button
                    type="button"
                    onClick={onAddInputToCart}
                    disabled={!hasSearchInput}
                    className={`rounded-full px-4 py-1.5 text-sm font-black ring-2 ${
                      hasSearchInput
                        ? "bg-[#f2fff6] text-[#087a3a] ring-[#b7efcf] active:scale-[0.98]"
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
                  className="min-h-[5.25rem] w-full resize-none rounded-[1.25rem] border-[4px] border-[#00a747] bg-white px-4 py-3 text-[1.08rem] font-black leading-snug text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#008c3a] focus:ring-4 focus:ring-green-100"
                />

                <p className="mt-2 text-[0.78rem] font-black text-slate-400">
                  Max 8 tuotetta. Liitä muistilistasta.
                </p>
              </div>

              <div className="mt-3 rounded-[1.25rem] bg-white/72 p-2 shadow-sm ring-1 ring-[#e7eef4]">
                <div className="grid grid-cols-2 gap-3">
                  <RetroActionButton
                    kind="voice"
                    label="Äänitä"
                    sublabel="RCA-mikki"
                    state={voiceState}
                    onClick={onVoiceClick}
                  />

                  <RetroActionButton
                    kind="scanner"
                    label="Skanneri"
                    sublabel="EAN / viivakoodi"
                    state={scannerState}
                    onClick={onScannerClick}
                  />
                </div>
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
                            {price && (
                              <div className="mt-1 text-[16px] font-black leading-none text-[#817451]">
                                {price}
                              </div>
                            )}
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

      <style jsx>{`
        @keyframes ziiplyVoicePulse {
          0%, 100% { transform: translateY(-50%) scale(0.92); opacity: 0.28; }
          50% { transform: translateY(-50%) scale(1.06); opacity: 0.72; }
        }
      `}</style>
    </div>
  );
}

export { ZiiplyMobileSearchCard };
