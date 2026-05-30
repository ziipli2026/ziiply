"use client";

// UUSI_ZIIPLY_MOBILE_SEARCH_CARD_V610_LAYOUT_ONLY_SAFE_V608_LOGIC
// UUSI: SearchCard ei renderöi hakutuloksia sisäänsä lainkaan.
// UUSI: Äänitä ja Filmaa napit pysyvät paikallaan myös silloin, kun erillinen tuloskortti aukeaa.
// UUSI: tulokset kuuluvat erilliseen ZiiplyMobileSearchResultsCard-komponenttiin.

import React, { useEffect, useMemo, useRef, useState } from "react";

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

function shortProductName(name: string) {
  const clean = name.replace(/\s+/g, " ").trim();
  return clean.length <= 24 ? clean : clean.slice(0, 21).trimEnd() + "...";
}

function GreenPillButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "h-[2.55rem] w-[6.9rem] shrink-0 rounded-[1.25rem] border-[3px] px-0 text-[0.92rem] font-black italic leading-none shadow-[0_0_0_2px_rgba(255,255,255,0.18)_inset,0_4px_0_#064a26] transition active:translate-y-[1px] active:shadow-[0_2px_0_#064a26]",
        disabled
          ? "cursor-not-allowed border-[#9eb49a] bg-gradient-to-b from-[#c7dcc2] to-[#9db996] text-[#eef5df] opacity-80 shadow-[0_0_0_2px_rgba(255,255,255,0.16)_inset,0_4px_0_#789174]"
          : "border-[#0b6330] bg-gradient-to-b from-[#139143] to-[#087237] text-[#fff0d5]",
      )}
      style={{ fontFamily: cooperFont }}
    >
      {label}
    </button>
  );
}


function EraserButton({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick?: () => void;
}) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Tyhjennä hakukenttä"
      title="Tyhjennä hakukenttä"
      className="absolute right-[0.62rem] top-1/2 z-20 grid h-[2.05rem] w-[2.05rem] -translate-y-1/2 place-items-center rounded-full border-[2px] border-[#9d8350] bg-[#fff1c9] text-[1.05rem] shadow-[0_2px_0_rgba(91,72,44,0.18),inset_0_0_0_1px_rgba(255,255,255,0.65)] active:translate-y-[calc(-50%+1px)]"
    >
      🧽
    </button>
  );
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
        "relative aspect-square w-full min-w-0 overflow-hidden rounded-[1.25rem] border-[2.5px] p-0 shadow-[0_4px_0_rgba(91,72,44,0.20),inset_0_0_0_2px_rgba(255,255,255,0.45)] active:translate-y-[1px]",
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
        className="absolute left-1/2 top-1/2 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 object-contain object-center"
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
    <div className="mx-auto grid h-[2.55rem] w-[14.4rem] grid-cols-2 overflow-hidden rounded-[1.15rem] border-[3px] border-[#a88442] bg-[#ead7a5] p-1 shadow-[0_0_0_2px_#fff4cc_inset,0_4px_0_rgba(91,72,44,0.20)]">
      <button
        type="button"
        onClick={() => onModeChange?.("cart")}
        className={cx(
          "rounded-[0.85rem] px-2 text-[0.76rem] font-black leading-[0.86] transition active:scale-[0.98]",
          mode === "cart"
            ? "bg-[#fff4cf] text-[#23502c] shadow-[inset_0_0_0_2px_#d9bd77,0_1px_0_rgba(91,72,44,0.16)]"
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
          "rounded-[0.85rem] px-2 text-[0.76rem] font-black leading-[0.86] transition active:scale-[0.98]",
          mode === "single"
            ? "bg-[#fff4cf] text-[#23502c] shadow-[inset_0_0_0_2px_#d9bd77,0_1px_0_rgba(91,72,44,0.16)]"
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
      : state === "active" || state === "processing"
        ? "/ui/scanner/scanner-on.webp"
        : "/ui/scanner/scanner-idle.webp";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative block h-[5.35rem] w-full overflow-hidden border-0 bg-transparent p-0 shadow-none outline-none active:translate-y-[1px]"
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
  title = "HAKU",
  subtitle,
  products,
  results,
  loading = false,
  emptyText = "Ei löydöksiä vielä.",
  onAddProduct,
  onAdd,
  className = "",
  input = "",
  onInputChange,
  searchMode = "cart",
  onSearchModeChange,
  onAddInputToCart,
  onOfferSearch,
  onNormalSearch,
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
  const autoSearchInputRef = useRef("");
  const [triggeredSearchInput, setTriggeredSearchInput] = useState("");

  const cleanInput = input.trim();
  const notFoundCanShow =
    triggeredSearchInput.length > 0 &&
    triggeredSearchInput === cleanInput &&
    !loading &&
    items.length === 0 &&
    cleanInput.length >= 2;

  const predictiveText = useMemo(() => {
    const clean = input.trim();

    if (!clean) {
      return "Kirjoita hakusana tai sano ostos ääneen.";
    }

    if (notFoundCanShow) {
      return `Hakemaasi “${clean}” ei löytynyt.`;
    }

    const lastWord = clean.split(/[,\s]+/).filter(Boolean).at(-1) || clean;

    const suggestions = [
      `${lastWord} tarjous`,
      `${lastWord} halvin`,
      `${lastWord} kotimainen`,
    ];

    return suggestions.join(" · ");
  }, [input, notFoundCanShow]);

  useEffect(() => {
    const clean = input.trim();

    // Kun käyttäjä muuttaa tekstiä, vanha "ei löytynyt" -tila poistuu heti.
    if (triggeredSearchInput && clean !== triggeredSearchInput) {
      setTriggeredSearchInput("");
    }

    if (!open || !clean || clean.length < 2) return;
    if (loadingOffers || loadingNormal || singleProductCompareLoading) return;
    if (autoSearchInputRef.current === clean) return;

    const timer = window.setTimeout(() => {
      const latest = input.trim();
      if (!latest || latest.length < 2) return;
      if (autoSearchInputRef.current === latest) return;

      autoSearchInputRef.current = latest;
      setTriggeredSearchInput(latest);

      onNormalSearch?.();
    }, 7000);

    return () => window.clearTimeout(timer);
  }, [
    input,
    open,
    triggeredSearchInput,
    loadingOffers,
    loadingNormal,
    singleProductCompareLoading,
    onNormalSearch,
  ]);

  const handleManualSearch = (handler?: () => void) => {
    const clean = input.trim();
    if (clean.length >= 2) {
      autoSearchInputRef.current = clean;
      setTriggeredSearchInput(clean);
    }

    handler?.();
  };

  const handleClearInput = () => {
    autoSearchInputRef.current = "";
    setTriggeredSearchInput("");
    onInputChange?.("");
  };

  if (!open) return null;

  return (
    <div
      data-ziiply-mobile-search-card-version="UUSI_V610_LAYOUT_ONLY_SAFE_V608_LOGIC"
      className={`fixed inset-0 z-[140] flex items-stretch justify-center overflow-hidden bg-[#f8edc9] px-2 pb-[calc(env(safe-area-inset-bottom)+5.15rem)] pt-[calc(env(safe-area-inset-top)+0.45rem)] sm:hidden ${className}`}
    >
      <section className="relative isolate flex h-full w-full max-w-[28rem] flex-col overflow-hidden rounded-[1.8rem] bg-[#f6ebc6] px-3 pb-3 pt-5 text-[#20301f] shadow-[inset_0_0_0_2px_rgba(216,189,117,0.58)]">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[1.55rem] bg-[#f6ebc6]">
          <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(#d8bd75_1.15px,transparent_1.15px)] [background-size:16px_16px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.55),transparent_54%)]" />
        </div>

        <div className="relative z-10 flex h-full min-h-0 flex-col">
          <div className="grid grid-cols-[minmax(0,1fr)_7.9rem] items-start gap-3">
            <div className="min-w-0">
              <div
                className="text-[0.72rem] font-black uppercase leading-none tracking-[0.42em] text-[#6f674f]"
                style={{ fontFamily: copperplateFont }}
              >
                {title}
              </div>
              <h1
                className="mt-1 text-[1.9rem] font-black italic leading-[0.86] text-[#123d32]"
                style={{ fontFamily: cooperFont }}
              >
                Tuotteet ja<br />vertailu
              </h1>

              <div className="relative mt-5 h-[4.35rem] overflow-hidden rounded-[1.6rem] border-[3px] border-[#9d8350] bg-[#fff4d3] p-1.5 shadow-[0_4px_0_rgba(91,72,44,0.18),inset_0_3px_8px_rgba(91,65,28,0.10)]">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => {
                    autoSearchInputRef.current = "";
                    setTriggeredSearchInput("");
                    onInputChange?.(event.target.value);
                  }}
                  rows={2}
                  placeholder={searchMode === "single" ? "Kirjoita yksi tuote" : "maito, kahvi"}
                  className="block h-full w-full resize-none overflow-hidden rounded-[1.2rem] border-0 bg-[#fffaf0] px-3 py-2 pr-[2.7rem] text-center text-[1.28rem] font-black leading-[1.02] text-[#102216] outline-none placeholder:text-[#7d7461]"
                  style={{ fontFamily: hasText ? serifFont : cooperFont }}
                />
                <EraserButton visible={hasText} onClick={handleClearInput} />
              </div>
            </div>

            <div className="grid w-[7.9rem] shrink-0 grid-rows-[auto_4.35rem] gap-[1.35rem] pt-[0.25rem]">
              <GreenPillButton label="Vihkonen" onClick={onAddInputToCart} />
              <div className="flex items-center">
                <GreenPillButton label="koriin" onClick={onAddInputToCart} disabled={!hasText} />
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-4 flex justify-center">
            <ModeToggle mode={searchMode} onModeChange={onSearchModeChange} />
          </div>

          <div className="relative z-10 mt-4 grid grid-cols-[1.22fr_0.64fr_1.22fr] items-center gap-2.5">
            <AssistantButton
              kind="gosta"
              onClick={() => handleManualSearch(onOfferSearch)}
              disabled={!hasText}
              loading={loadingOffers}
            />

            <div className="flex h-full items-center justify-center">
              <div className="flex h-[5.6rem] w-full max-w-[5.4rem] flex-col items-center justify-center rounded-[1.1rem] border-[3px] border-[#d8bd75] bg-[#fff1bf]/70 px-1.5 text-center shadow-[0_3px_0_rgba(91,72,44,0.16),inset_0_0_0_2px_rgba(255,255,255,0.45)]">
                <div className="text-[0.66rem] font-black uppercase leading-[0.95] text-[#174c2c]">
                  Tänään
                </div>
                <div className="mt-1 text-[0.62rem] font-black leading-[0.95] text-[#6f5630]">
                  halvin kori
                </div>
              </div>
            </div>

            <AssistantButton
              kind="justiina"
              onClick={() => handleManualSearch(onNormalSearch)}
              disabled={!hasText}
              loading={justiinaLoading}
            />
          </div>

          <div className="relative z-10 mt-6 flex min-h-[5.4rem] items-center justify-center overflow-hidden rounded-[1.25rem] border-[3px] border-[#d2b170] bg-[#fff1bf] px-4 text-center text-[clamp(0.78rem,2.55vw,0.96rem)] font-black leading-[1.12] text-[#6f5630] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_3px_0_rgba(91,72,44,0.12)]">
            <span className="block w-full whitespace-normal">
              {subtitle || predictiveText}
            </span>
          </div>

          <div className="relative z-10 mt-4 grid grid-cols-2 gap-3">
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

          {/* V508: hakutuloksia ei renderöidä tämän kortin sisään.
              Erillinen ZiiplyMobileSearchResultsCard avataan page.tsx:ssä vain kun tuloksia löytyy. */}
        </div>
      </section>
    </div>
  );
}

export { ZiiplyMobileSearchCard };
