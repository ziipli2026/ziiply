"use client";

// V471_MOBILE_SEARCH_MOCKUP_LAYOUT_REFINEMENT:
 // - Sisäinen asettelu mockupin mukaiseksi ilman kortin ulkokuoren/fonttien vaihtoa
 // - Gösta/Justiina-kehys säilyy, vain kuvaa suurennettu napin sisällä
 // - Hakukenttä korkeampi ja Lisää koriin -nappi samaa pill-muotoa/fonttia kuin Vihkonen

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

function ProductName(name: string) {
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
        "relative h-[4.15rem] w-full min-w-0 overflow-hidden rounded-[1.15rem] border-[2.5px] p-0 shadow-[0_4px_0_rgba(91,72,44,0.20),inset_0_0_0_2px_rgba(255,255,255,0.45)] active:translate-y-[1px]",
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
        className="absolute inset-[-12%] h-[124%] w-[124%] object-cover object-center"
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
    <div className="mx-auto grid h-[3.3rem] w-full max-w-[10.9rem] grid-cols-2 rounded-[1.35rem] border-[3px] border-[#b99d64] bg-[#ead7a5] p-1.5 shadow-[0_0_0_2px_#fff4cc_inset,0_4px_0_rgba(91,72,44,0.20)]">
      <button
        type="button"
        onClick={() => onModeChange?.("cart")}
        className={cx(
          "rounded-[0.95rem] px-1 text-[0.84rem] font-black leading-[0.92] transition active:scale-[0.98]",
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
          "rounded-[0.95rem] px-1 text-[0.84rem] font-black leading-[0.92] transition active:scale-[0.98]",
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

function GreenPillButton({
  label,
  onClick,
  disabled,
  className = "",
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "h-[2.45rem] shrink-0 rounded-[1.2rem] border-[3px] border-[#0b6330] bg-gradient-to-b from-[#139143] to-[#087237] px-3 text-[0.88rem] font-black italic leading-none text-[#fff0d5] shadow-[0_0_0_2px_rgba(255,255,255,0.18)_inset,0_4px_0_#064a26] transition active:translate-y-[1px] active:shadow-[0_2px_0_#064a26]",
        disabled && "cursor-not-allowed opacity-45",
        className,
      )}
      style={{ fontFamily: cooperFont }}
    >
      {label}
    </button>
  );
}

function NotebookButton({
  onClick,
}: {
  onClick?: () => void;
}) {
  return <GreenPillButton label="Vihkonen" onClick={onClick} />;
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
      className={cx(
        "relative block w-full overflow-hidden border-0 bg-transparent p-0 shadow-none outline-none active:translate-y-[1px]",
        kind === "scanner"
          ? "aspect-[850/295]"
          : "h-[4.95rem] min-h-[4.95rem]",
      )}
    >
      <img
        src={imageSrc}
        alt={label}
        className="absolute inset-0 h-full w-full object-contain object-center select-none"
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
      className={`fixed inset-0 z-[72] flex items-end justify-center overflow-hidden bg-transparent px-2 pb-[calc(env(safe-area-inset-bottom)+6.15rem)] pt-[calc(env(safe-area-inset-top)+5rem)] sm:items-center sm:p-6 ${className}`}
    >
      <section className="relative isolate h-[min(64dvh,36.5rem)] w-full max-w-[28rem] overflow-visible rounded-[2rem] border-[4px] border-[#5b482c] bg-transparent px-3 pt-3 text-[#20301f] shadow-[0_0_0_2px_#d8bd75_inset,0_12px_0_rgba(60,45,20,0.24),0_22px_45px_rgba(15,23,42,0.18)]">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[1.65rem] bg-[#f6ebc6]">
          <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(#d8bd75_1.15px,transparent_1.15px)] [background-size:16px_16px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.55),transparent_54%)]" />
        </div>

        <div className="relative z-10 flex h-full min-h-0 flex-col">
          <div className="grid h-[3.5rem] grid-cols-[minmax(0,1fr)_auto] items-start gap-2.5">
            <div className="min-w-0 overflow-hidden">
              <div
                className="text-[0.72rem] font-black uppercase leading-none tracking-[0.42em] text-[#6f674f]"
                style={{ fontFamily: copperplateFont }}
              >
                {title}
              </div>
              <h1
                className="mt-0.5 text-[1.36rem] font-black italic leading-[0.88] text-[#203b25] min-[390px]:text-[1.56rem]"
                style={{ fontFamily: cooperFont }}
              >
                Tuotteet ja vertailu
              </h1>
            </div>

            <NotebookButton onClick={onAddInputToCart} />
          </div>

          <div className="relative z-10 mt-3 h-[4.1rem] overflow-hidden rounded-[1.45rem] border-[3px] border-[#9d8350] bg-[#fff4d3] p-1.5 shadow-[inset_0_3px_8px_rgba(91,65,28,0.10)]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => onInputChange?.(event.target.value)}
              rows={3}
              placeholder={searchMode === "single" ? "Kirjoita yksi tuote" : "maito, kahvi"}
              className="block h-full w-full resize-none overflow-hidden rounded-[1.15rem] border-0 bg-[#fffaf0] px-4 py-2 text-center text-[1.18rem] font-black leading-[1.02] text-[#102216] outline-none placeholder:text-[#7d7461]"
              style={{ fontFamily: hasText ? serifFont : cooperFont }}
            />
          </div>

          <div className="relative z-10 mt-2 flex justify-center">
            <GreenPillButton
              label="Lisää koriin"
              onClick={onAddInputToCart}
              disabled={!hasText}
              className="px-5"
            />
          </div>

          <div className="relative z-10 mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2.5">
            <div className="w-full">
              <AssistantButton
                kind="gosta"
                onClick={onOfferSearch}
                disabled={!hasText}
                loading={loadingOffers}
              />
            </div>

            <div className="flex flex-col items-center justify-center gap-2 rounded-[1.25rem] border-[3px] border-[#b99d64] bg-[#ead7a5] px-2 py-2 shadow-[0_0_0_2px_#fff4cc_inset,0_4px_0_rgba(91,72,44,0.20)]">
              <button
                type="button"
                onClick={() => onSearchModeChange?.("cart")}
                className={`min-w-[5.8rem] rounded-[0.9rem] px-2 py-1 text-[0.78rem] font-black leading-[0.92] ${
                  searchMode === "cart"
                    ? "bg-[#fff0c8] text-[#1c5c2e] shadow-[0_2px_0_rgba(91,72,44,0.18)]"
                    : "text-[#7a6948]"
                }`}
              >
                Koko<br />kori
              </button>

              <button
                type="button"
                onClick={() => onSearchModeChange?.("single")}
                className={`min-w-[5.8rem] rounded-[0.9rem] px-2 py-1 text-[0.78rem] font-black leading-[0.92] ${
                  searchMode === "single"
                    ? "bg-[#fff0c8] text-[#1c5c2e] shadow-[0_2px_0_rgba(91,72,44,0.18)]"
                    : "text-[#7a6948]"
                }`}
              >
                Yksi<br />tuote
              </button>
            </div>

            <div className="w-full">
              <AssistantButton
                kind="justiina"
                onClick={onNormalSearch}
                disabled={!hasText}
                loading={justiinaLoading}
              />
            </div>
          </div>

          <div className="relative z-10 mt-3 flex min-h-[3rem] items-center justify-center overflow-hidden rounded-[1.18rem] border-[3px] border-[#d2b170] bg-[#fff1bf] px-3 text-center text-[0.84rem] font-black text-[#7a6842] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_3px_0_rgba(91,72,44,0.12)]">
            <span className="block ">
              {subtitle || "Justiina ehdottaa sopivia hakusanoja kirjoituksen mukaan."}
            </span>
          </div>

          <div className="relative z-10 mt-6 grid grid-cols-2 gap-3">
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
                className="mb-2  text-[0.82rem] font-black uppercase tracking-[0.34em] text-[#746749]"
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
                            className=" text-[1.02rem] font-black leading-[1.05] text-[#1f251c]"
                            style={{ fontFamily: serifFont }}
                          >
                            {ProductName(name)}
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
