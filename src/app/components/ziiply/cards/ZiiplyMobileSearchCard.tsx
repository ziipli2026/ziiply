"use client";

// UUSI_ZIIPLY_MOBILE_SEARCH_CARD_V629_KEYBOARD_CLEAR_LIFT
// Pohja: v608/v510 toimiva hakulogiikka.
// Muutettu vain JSX/CSS layout vastaamaan annettua finalleiska-mallia.

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
        "shrink-0 rounded-[1.25rem] border-[3px] px-0 font-black italic leading-none shadow-[0_0_0_2px_rgba(255,255,255,0.18)_inset,0_4px_0_#064a26] transition active:translate-y-[1px] active:shadow-[0_2px_0_#064a26]",
        disabled
          ? "cursor-not-allowed border-[#9eb49a] bg-gradient-to-b from-[#c7dcc2] to-[#9db996] text-[#eef5df] opacity-80 shadow-[0_0_0_2px_rgba(255,255,255,0.16)_inset,0_4px_0_#789174]"
          : "border-[#0b6330] bg-gradient-to-b from-[#139143] to-[#087237] text-[#fff0d5]",
        className,
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
      className="absolute right-[2.55rem] top-1/2 z-20 grid h-[1.8rem] w-[1.8rem] -translate-y-1/2 place-items-center rounded-full border-[2px] border-[#d0aa4f] bg-[#fff1c9] text-[1.05rem] shadow-[0_2px_0_rgba(91,72,44,0.18),inset_0_0_0_1px_rgba(255,255,255,0.65)] active:translate-y-[calc(-50%+1px)]"
    >
      🧽
    </button>
  );
}


function CartIconButton({
  visible,
  disabled,
  onClick,
}: {
  visible: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Lisää koriin"
      title="Lisää koriin"
      className={cx(
        "absolute right-[0.55rem] top-1/2 z-20 grid h-[1.8rem] w-[1.8rem] -translate-y-1/2 place-items-center rounded-full border-[2px] text-[1.0rem] shadow-[0_2px_0_rgba(91,72,44,0.18),inset_0_0_0_1px_rgba(255,255,255,0.55)] active:translate-y-[calc(-50%+1px)]",
        disabled
          ? "cursor-not-allowed border-[#9eb49a] bg-[#c7dcc2] text-[#eef5df] opacity-60"
          : "border-[#0b6330] bg-gradient-to-b from-[#159948] to-[#087237] text-[#fff0d5]",
      )}
    >
      🛒
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
        className="absolute left-1/2 top-1/2 h-[126%] w-[126%] -translate-x-1/2 -translate-y-1/2 object-contain object-center"
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
    <div className="mx-auto grid h-[2.55rem] w-[14.6rem] grid-cols-2 overflow-hidden rounded-[1.15rem] border-[3px] border-[#a88442] bg-[#ead7a5] p-1 shadow-[0_0_0_2px_#fff4cc_inset,0_4px_0_rgba(91,72,44,0.20)]">
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
      className="relative block h-[5.0rem] w-full overflow-hidden border-0 bg-transparent p-0 shadow-none outline-none active:translate-y-[1px]"
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
  const hasText = input.trim().length > 0;
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
      return "Justiina ehdottaa sopivia hakusanoja kirjoittaessasi.";
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

  const keepViewportStableOnInputFocus = () => {
    if (typeof window === "undefined") return;

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    window.requestAnimationFrame(() => {
      window.scrollTo(scrollX, scrollY);
      window.setTimeout(() => window.scrollTo(scrollX, scrollY), 60);
      window.setTimeout(() => window.scrollTo(scrollX, scrollY), 180);
    });
  };

  if (!open) return null;

  return (
    <div
      data-ziiply-mobile-search-card-version="UUSI_V629_KEYBOARD_CLEAR_LIFT"
      className={`fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.25rem)] bottom-[calc(env(safe-area-inset-bottom)+5.2rem)] z-[72] flex items-stretch justify-center overflow-hidden bg-transparent px-2 sm:hidden ${className}`}
    >
      <section className="relative isolate flex h-full w-full max-w-[28rem] flex-col overflow-hidden rounded-[1.8rem] border-[2px] border-[#ead9a8] bg-[#f6ebc6] px-3 pb-3 pt-3 text-[#20301f] shadow-[inset_0_0_0_2px_rgba(216,189,117,0.34)]">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[1.55rem] bg-[#f6ebc6]">
          <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(#d8bd75_1.15px,transparent_1.15px)] [background-size:16px_16px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.48),transparent_54%)]" />
        </div>

        <div className="relative z-10 flex h-full min-h-0 flex-col">
          <div className="grid grid-cols-[minmax(0,1fr)_8.1rem] items-start gap-3">
            <div className="min-w-0">
              <div
                className="text-[0.72rem] font-black uppercase leading-none tracking-[0.42em] text-[#6f674f]"
                style={{ fontFamily: copperplateFont }}
              >
                {title}
              </div>

              <h1
                className="mt-1 text-[2.02rem] font-black italic leading-[0.84] text-[#123d32]"
                style={{ fontFamily: cooperFont }}
              >
                Tuotteet ja<br />vertailu
              </h1>
            </div>

            <GreenPillButton
              label="Vihkonen"
              onClick={onAddInputToCart}
              className="mt-3 h-[3.0rem] w-full text-[1.08rem]"
            />
          </div>

          <div className="relative z-10 mt-4 flex min-h-[6.0rem] items-end justify-center overflow-hidden rounded-[1.55rem] border-[3px] border-[#d2b170] bg-[#fff1bf] px-4 pb-4 pt-3 text-center text-[clamp(0.88rem,2.85vw,1.08rem)] font-black leading-[1.16] text-[#6f5630] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_4px_0_rgba(91,72,44,0.13)]">
            <span className="block w-full whitespace-normal">
              {subtitle || predictiveText}
            </span>
          </div>

          {/* V628: koko alakokonaisuus nostetaan staattisesti ylöspäin.
              Tämä ei riipu iOS visualViewport-tapahtumista, joten muutos näkyy heti myös
              tilanteessa, jossa näppäimistö peittää näkymää mutta viewport-arvo ei päivity. */}
          <div className="relative z-10 -translate-y-[2.9rem]">
            <div className="mt-[0.2rem] grid grid-cols-[1.18fr_0.72fr_1.18fr] items-center gap-3">
              <AssistantButton
                kind="gosta"
                onClick={() => handleManualSearch(onOfferSearch)}
                disabled={!hasText}
                loading={loadingOffers}
              />

              <div className="flex h-full items-center justify-center">
                <div className="flex h-[5.45rem] w-full max-w-[5.9rem] flex-col items-center justify-center rounded-[1.1rem] border-[3px] border-[#d8bd75] bg-[#fff1bf]/70 px-1.5 text-center shadow-[0_3px_0_rgba(91,72,44,0.16),inset_0_0_0_2px_rgba(255,255,255,0.45)]">
                  <div className="text-[0.72rem] font-black uppercase leading-[0.95] text-[#174c2c]">
                    Tänään<br />halvin
                  </div>
                  <div className="mt-1 text-[0.68rem] font-black leading-[0.95] text-[#6f5630]">
                    kori<br />lähelläsi
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

            <div className="mt-2">
              <div className="relative h-[3.0rem] overflow-hidden rounded-[1.35rem] border-[3px] border-[#9d8350] bg-[#fff4d3] p-1 shadow-[0_4px_0_rgba(91,72,44,0.18),inset_0_3px_8px_rgba(91,65,28,0.10)]">
                <textarea
                  ref={inputRef}
                  value={input}
                  onFocus={keepViewportStableOnInputFocus}
                  onClick={keepViewportStableOnInputFocus}
                  onChange={(event) => {
                    autoSearchInputRef.current = "";
                    setTriggeredSearchInput("");
                    onInputChange?.(event.target.value);
                  }}
                  rows={1}
                  placeholder={searchMode === "single" ? "Kirjoita yksi tuote" : "maito, kahvi"}
                  className="block h-full w-full resize-none overflow-hidden rounded-[1.05rem] border-0 bg-[#fffaf0] px-3 py-[0.35rem] pr-[5.0rem] text-center text-[1.18rem] font-black leading-[1.0] text-[#102216] outline-none placeholder:text-[#7d7461]"
                  style={{ fontFamily: hasText ? serifFont : cooperFont }}
                />

                <EraserButton visible={hasText} onClick={handleClearInput} />
                <CartIconButton
                  visible={hasText}
                  disabled={!hasText}
                  onClick={onAddInputToCart}
                />
              </div>
            </div>

            <div className="mt-2 flex justify-center">
              <ModeToggle mode={searchMode} onModeChange={onSearchModeChange} />
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3 pb-[3.1rem] pt-2">
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
          </div>

          {/* Hakutulokset renderöidään erillisessä ZiiplyMobileSearchResultsCard-komponentissa. */}
        </div>
      </section>
    </div>
  );
}

export { ZiiplyMobileSearchCard };
