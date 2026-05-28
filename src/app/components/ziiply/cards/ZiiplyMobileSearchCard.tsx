"use client";

// V463_MOBILE_IDLE_TYPING_LAYOUT:
// Mobiili-Haku noudattaa desktop-kortin kahta tilaa:
// 1) tyhjä hakukenttä: pieni kenttä Göstan ja Justiinan välissä
// 2) tekstiä syötetty: leveä hakukenttä ylhäällä, alla Gösta + mode-toggle + Justiina.
// Äänitä/Skanneri ovat kiinteäkokoiset WEBP-napit ilman erillistä taustalaatikkoa.

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

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const cooperFont = '"Cooper Black", "Cooper Std Black", Georgia, serif';
const serifFont = '"Baskerville", Georgia, serif';
const copperplateFont = '"Copperplate", "Baskerville", Georgia, serif';

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

function AssistantButton({
  kind,
  loading,
  disabled,
  onClick,
}: {
  kind: "gosta" | "justiina";
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const isGosta = kind === "gosta";
  const name = isGosta ? "Gösta" : "Justiina";
  const image = isGosta ? "/assistants/gosta.png" : "/assistants/justiina.png";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      aria-label={name}
      title={name}
      className={cx(
        "relative h-[4.45rem] min-w-0 overflow-hidden rounded-[1.25rem] border-[2.5px] p-0 shadow-[0_4px_0_rgba(91,72,44,0.20),inset_0_0_0_2px_rgba(255,255,255,0.45)] active:translate-y-[1px]",
        isGosta
          ? "border-[#7f9866] bg-gradient-to-b from-[#f0f3d7] to-[#d0dda0]"
          : "border-[#d3b255] bg-gradient-to-b from-[#fff2c4] to-[#efd06f]",
        disabled ? "cursor-not-allowed opacity-45" : "hover:brightness-105",
        loading && "animate-pulse",
      )}
    >
      <img
        src={image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        draggable={false}
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    </button>
  );
}

function ModeToggle({
  mode,
  onModeChange,
}: {
  mode: "cart" | "single";
  onModeChange?: (mode: "cart" | "single") => void;
}) {
  return (
    <div className="mx-auto grid h-[3.55rem] w-full max-w-[12.2rem] grid-cols-2 rounded-[1.45rem] border-[3px] border-[#b99d64] bg-[#ead7a5] p-1.5 shadow-[0_0_0_2px_#fff4cc_inset,0_4px_0_rgba(91,72,44,0.20)]">
      <button
        type="button"
        onClick={() => onModeChange?.("cart")}
        className={cx(
          "rounded-[1rem] px-1 text-[0.92rem] font-black leading-[0.9] transition active:scale-[0.98]",
          mode === "cart"
            ? "bg-[#fff4cf] text-[#23502c] shadow-[inset_0_0_0_2px_#d9bd77,0_2px_0_rgba(91,72,44,0.18)]"
            : "text-[#7a6842]",
        )}
        style={{ fontFamily: cooperFont }}
      >
        Koko<br />kori
      </button>
      <button
        type="button"
        onClick={() => onModeChange?.("single")}
        className={cx(
          "rounded-[1rem] px-1 text-[0.92rem] font-black leading-[0.9] transition active:scale-[0.98]",
          mode === "single"
            ? "bg-[#fff4cf] text-[#23502c] shadow-[inset_0_0_0_2px_#d9bd77,0_2px_0_rgba(91,72,44,0.18)]"
            : "text-[#7a6842]",
        )}
        style={{ fontFamily: cooperFont }}
      >
        Yksi<br />tuote
      </button>
    </div>
  );
}

function RetroAssetButton({
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
      ? state === "recording"
        ? "/ui/voice/aanita-on.webp"
        : state === "processing"
          ? "/ui/voice/aanita-search.webp"
          : "/ui/voice/aanita-off.webp"
      : "/ui/scanner/scanner-idle.webp";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative block h-[5.35rem] min-h-[5.35rem] w-full overflow-visible border-0 bg-transparent p-0 shadow-none outline-none active:translate-y-[1px]"
    >
      <img
        src={imageSrc}
        alt={label}
        className="absolute inset-0 h-full w-full object-fill"
        draggable={false}
      />
    </button>
  );
}

export default function ZiiplyMobileSearchCard({
  open = true,
  title = "Haku",
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
  const hasText = input.trim().length > 0;
  const showResults = loading || items.length > 0 || Boolean(subtitle);
  const justiinaLoading = loadingNormal || singleProductCompareLoading;

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-[72] flex items-end justify-center overflow-hidden bg-transparent px-2 pb-[calc(env(safe-area-inset-bottom)+6.25rem)] pt-[calc(env(safe-area-inset-top)+5rem)] sm:items-center sm:p-6 ${className}`}
    >
      <section className="relative isolate h-[min(68dvh,38rem)] w-full max-w-[28rem] overflow-visible rounded-[2rem] border-[4px] border-[#5b482c] bg-transparent px-3 pt-3 text-[#20301f] shadow-[0_0_0_2px_#d8bd75_inset,0_12px_0_rgba(60,45,20,0.24),0_22px_45px_rgba(15,23,42,0.18)]">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[1.65rem] bg-[#f6ebc6]">
          <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(#d8bd75_1.15px,transparent_1.15px)] [background-size:16px_16px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.55),transparent_54%)]" />
        </div>

        <div className="relative z-10 flex h-full min-h-0 flex-col">
          <div className="grid h-[3.4rem] grid-cols-[minmax(0,1fr)_auto_auto] items-start gap-2">
            <div className="min-w-0 overflow-hidden">
              <div
                className="text-[0.72rem] font-black uppercase leading-none tracking-[0.42em] text-[#6f674f]"
                style={{ fontFamily: copperplateFont }}
              >
                {title}
              </div>
              <h1
                className="mt-1 truncate whitespace-nowrap text-[1.9rem] font-black italic leading-[0.92] text-[#203b25]"
                style={{ fontFamily: cooperFont }}
              >
                Tuotteet ja vertailu
              </h1>
            </div>

            <button
              type="button"
              onClick={onAddInputToCart}
              disabled={!hasSearchInput}
              className={cx(
                "h-[2.65rem] rounded-[1.25rem] border-[3px] px-3 text-[0.96rem] font-black italic leading-none shadow-[0_0_0_2px_rgba(255,255,255,0.18)_inset,0_4px_0_#064a26] active:translate-y-[1px]",
                hasSearchInput
                  ? "border-[#0b6330] bg-gradient-to-b from-[#139143] to-[#087237] text-[#fff0d5]"
                  : "cursor-not-allowed border-[#a9a08a] bg-[#ddd1aa] text-[#9d9173] shadow-[0_0_0_2px_rgba(255,255,255,0.18)_inset,0_4px_0_rgba(91,72,44,0.18)]",
              )}
              style={{ fontFamily: cooperFont }}
            >
              Lisää
            </button>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="grid h-[2.65rem] w-[2.65rem] place-items-center rounded-full border-[3px] border-[#b99d64] bg-[#fff4cf] text-[1.45rem] font-black leading-none text-[#7a6842] shadow-[0_3px_0_rgba(91,72,44,0.18)] active:translate-y-[1px]"
                aria-label="Sulje"
              >
                ×
              </button>
            )}
          </div>

          {!hasText ? (
            <div className="relative z-10 mt-3 grid grid-cols-[minmax(0,1fr)_minmax(7.5rem,9.2rem)_minmax(0,1fr)] items-center gap-2">
              <AssistantButton
                kind="gosta"
                onClick={onOfferSearch}
                disabled={!hasText}
                loading={loadingOffers}
              />

              <div className="h-[4.65rem] overflow-hidden rounded-[1.45rem] border-[3px] border-[#9d8350] bg-[#fff4d3] p-1.5 shadow-[inset_0_3px_8px_rgba(91,65,28,0.10)]">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => onInputChange?.(event.target.value)}
                  rows={2}
                  placeholder={searchMode === "single" ? "Yksi tuote" : "maito,\nkahvi"}
                  className="block h-full w-full resize-none overflow-hidden rounded-[1.15rem] border-0 bg-[#fffaf0] px-2 py-2 text-center text-[1.15rem] font-black leading-[1.02] text-[#102216] outline-none placeholder:text-[#7d7461]"
                  style={{ fontFamily: cooperFont }}
                />
              </div>

              <AssistantButton
                kind="justiina"
                onClick={onNormalSearch}
                disabled={!hasText}
                loading={justiinaLoading}
              />
            </div>
          ) : (
            <>
              <div className="relative z-10 mt-2 h-[4.65rem] overflow-hidden rounded-[1.45rem] border-[3px] border-[#9d8350] bg-[#fff4d3] p-1.5 shadow-[inset_0_3px_8px_rgba(91,65,28,0.10)]">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => onInputChange?.(event.target.value)}
                  rows={2}
                  placeholder={searchMode === "single" ? "Kirjoita yksi tuote" : "maito, kahvi, jauheliha"}
                  className="block h-full w-full resize-none overflow-hidden rounded-[1.15rem] border-0 bg-[#fffaf0] px-4 py-2 text-center text-[1.32rem] font-black leading-[1.05] text-[#102216] outline-none placeholder:text-[#7d7461]"
                  style={{ fontFamily: serifFont }}
                />
              </div>

              <div className="relative z-10 mt-3 grid grid-cols-[minmax(0,1fr)_minmax(10.8rem,12.2rem)_minmax(0,1fr)] items-center gap-2">
                <AssistantButton
                  kind="gosta"
                  onClick={onOfferSearch}
                  loading={loadingOffers}
                />
                <ModeToggle mode={searchMode} onModeChange={onSearchModeChange} />
                <AssistantButton
                  kind="justiina"
                  onClick={onNormalSearch}
                  loading={justiinaLoading}
                />
              </div>
            </>
          )}

          <div className="relative z-10 mt-3 flex h-[2.75rem] items-center justify-center overflow-hidden rounded-[1.18rem] border-[3px] border-[#d2b170] bg-[#fff1bf] px-3 text-center text-[0.84rem] font-black text-[#7a6842] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_3px_0_rgba(91,72,44,0.12)]">
            <span className="block truncate">
              {subtitle || "Justiina ehdottaa sopivia hakusanoja kirjoituksen mukaan."}
            </span>
          </div>

          <div className="relative z-10 mt-3 grid grid-cols-2 gap-3">
            <RetroAssetButton
              kind="voice"
              label="Äänitä"
              state={voiceState}
              onClick={onVoiceClick}
            />
            <RetroAssetButton
              kind="scanner"
              label="Skanneri"
              state={scannerState}
              onClick={onScannerClick}
            />
          </div>

          {showResults && (
            <div className="relative z-20 mt-3 min-h-0 flex-1 overflow-hidden rounded-[1.45rem] border-[3px] border-[#b99755] bg-[#ead39a] p-3 shadow-[0_0_0_2px_#fff4cd_inset,0_8px_0_rgba(70,50,24,0.18)]">
              <div
                className="mb-2 truncate text-[0.82rem] font-black uppercase tracking-[0.34em] text-[#746749]"
                style={{ fontFamily: copperplateFont }}
              >
                Hakutulokset
              </div>

              <div className="h-[calc(100%-1.65rem)] space-y-2 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {loading && (
                  <div className="rounded-[1.1rem] bg-[#fff4d3] px-4 py-5 text-center text-[1rem] font-black text-[#78633a] shadow-[0_4px_0_rgba(132,104,48,0.18)] ring-2 ring-[#d6bd76]">
                    Haetaan tuotteita…
                  </div>
                )}

                {!loading && items.length === 0 && (
                  <div className="rounded-[1.1rem] bg-[#fff4d3] px-4 py-5 text-center text-[1rem] font-black text-[#78633a] shadow-[0_4px_0_rgba(132,104,48,0.18)] ring-2 ring-[#d6bd76]">
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
                        className="grid grid-cols-[4rem_1fr_auto] items-center gap-2 rounded-[1.1rem] bg-[#fff4d9] px-2.5 py-2.5 shadow-[0_4px_0_rgba(132,104,48,0.20)] ring-2 ring-[#d6bd76]"
                      >
                        <div className="grid h-[3.75rem] w-[3.75rem] place-items-center overflow-hidden rounded-[0.85rem] bg-white shadow-inner">
                          {image ? (
                            <img src={image} alt="" className="h-full w-full object-contain p-1.5" loading="lazy" />
                          ) : (
                            <span className="text-2xl">🛒</span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div
                            className="truncate text-[1.02rem] font-black leading-[1.05] text-[#1f251c]"
                            style={{ fontFamily: serifFont }}
                          >
                            {truncateProductName(name)}
                          </div>
                          {price && (
                            <div className="mt-1 text-[0.9rem] font-black leading-none text-[#817451]">
                              {price}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => addHandler?.(product)}
                          className="rounded-[0.9rem] bg-[#0a8b3c] px-3 py-2.5 text-[0.84rem] font-black text-[#fff0d5] shadow-[0_3px_0_rgba(0,83,32,0.30)] active:translate-y-[1px] active:shadow-none"
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
      </section>
    </div>
  );
}

export { ZiiplyMobileSearchCard };
