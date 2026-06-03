"use client";

// UUSI_ZIIPLY_MOBILE_SEARCH_CARD_V645_REFRAMED_SEARCH_LAYOUT
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
  onOpenNotebook?: () => void;
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
      className="absolute right-[2.9rem] top-1/2 z-20 grid h-[1.8rem] w-[1.8rem] -translate-y-1/2 place-items-center rounded-full border-[2px] border-[#d0aa4f] bg-[#fff1c9] text-[1.05rem] shadow-[0_2px_0_rgba(91,72,44,0.18),inset_0_0_0_1px_rgba(255,255,255,0.65)] active:translate-y-[calc(-50%+1px)]"
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
        "absolute right-[0.82rem] top-1/2 z-20 grid h-[1.8rem] w-[1.8rem] -translate-y-1/2 place-items-center rounded-full border-[2px] text-[1.0rem] shadow-[0_2px_0_rgba(91,72,44,0.18),inset_0_0_0_1px_rgba(255,255,255,0.55)] active:translate-y-[calc(-50%+1px)]",
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
        "relative aspect-square w-full min-w-0 overflow-hidden rounded-[1.05rem] border-[2.5px] p-0 shadow-[0_3px_0_rgba(91,72,44,0.18),inset_0_0_0_2px_rgba(255,255,255,0.45)] active:translate-y-[1px]",
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
    <div className="mx-auto grid h-[2.28rem] w-[13.1rem] grid-cols-2 overflow-hidden rounded-[1.0rem] border-[2px] border-[#a88442] bg-[#ead7a5] p-1 shadow-[0_0_0_2px_#fff4cc_inset,0_3px_0_rgba(91,72,44,0.16)]">
      <button
        type="button"
        onClick={() => onModeChange?.("cart")}
        className={cx(
          "rounded-[0.75rem] px-2 text-[0.68rem] font-black leading-[0.84] transition active:scale-[0.98]",
          mode === "cart"
            ? "bg-[#fff4cf] text-[#23502c] shadow-[inset_0_0_0_2px_#d9bd77,0_1px_0_rgba(91,72,44,0.16)]"
            : "text-[#7a6842]",
        )}
        style={{ fontFamily: cooperFont }}
      >
        Koko
        <br />
        kori
      </button>
      <button
        type="button"
        onClick={() => onModeChange?.("single")}
        className={cx(
          "rounded-[0.75rem] px-2 text-[0.68rem] font-black leading-[0.84] transition active:scale-[0.98]",
          mode === "single"
            ? "bg-[#fff4cf] text-[#23502c] shadow-[inset_0_0_0_2px_#d9bd77,0_1px_0_rgba(91,72,44,0.16)]"
            : "text-[#7a6842]",
        )}
        style={{ fontFamily: cooperFont }}
      >
        Yksi
        <br />
        tuote
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
      className="relative block h-[4.45rem] w-full overflow-hidden border-0 bg-transparent p-0 shadow-none outline-none active:translate-y-[1px]"
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

function InlineSearchRunner({
  assistant,
}: {
  assistant: "gosta" | "justiina" | null;
}) {
  const visible = assistant !== null;
  const isGosta = assistant === "gosta";

  return (
    <div
      aria-hidden={!visible}
      className={cx(
        "relative z-10 mt-1.5 h-[2.85rem] overflow-hidden rounded-[1.15rem] border-[2px] border-[#d8bd75] bg-[#fff4d3]/72 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.42)] transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      <div className="absolute left-[1.0rem] right-[1.0rem] top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[repeating-linear-gradient(90deg,#114936_0_7px,transparent_7px_18px)] opacity-70" />

      {visible && (
        <>
          {isGosta ? (
            <div className="absolute top-1/2 flex -translate-y-1/2 items-center gap-1 animate-[ziiplyPriceRunner_3.8s_linear_infinite]">
              <div className="relative grid h-[2.35rem] w-[2.35rem] place-items-center rounded-full border-[3px] border-[#b58b3d] bg-[#fff0bd] text-[1.25rem] shadow-[0_3px_0_rgba(91,72,44,0.20)]">
                €
                <span className="absolute -right-[0.55rem] -bottom-[0.25rem] h-[0.72rem] w-[1.1rem] rotate-[-18deg] rounded-full bg-[#174c2c]" />
              </div>
              <span className="h-[0.35rem] w-[0.35rem] rounded-full bg-[#174c2c]" />
              <span className="h-[0.35rem] w-[0.35rem] rounded-full bg-[#174c2c]" />
            </div>
          ) : (
            <div className="absolute top-1/2 flex -translate-y-1/2 items-end gap-1 animate-[ziiplyBasketRunner_4.1s_linear_infinite]">
              <div className="relative h-[2.25rem] w-[2.8rem] animate-[ziiplyBasketBob_0.72s_ease-in-out_infinite]">
                <div className="absolute left-[0.38rem] top-[-0.38rem] h-[1.05rem] w-[2.0rem] rounded-t-full border-[3px] border-b-0 border-[#8b6128]" />
                <div className="absolute left-[0.50rem] top-[0.12rem] h-[1.28rem] w-[0.38rem] rotate-[-14deg] rounded-full border border-[#6f5128] bg-[#f5f0dd]" />
                <div className="absolute left-[1.28rem] top-[-0.06rem] h-[1.65rem] w-[0.38rem] rotate-[17deg] rounded-full border border-[#9a6b2d] bg-[#d7a34b]" />
                <div className="absolute left-[1.88rem] top-[0.18rem] h-[1.22rem] w-[0.40rem] rotate-[10deg] rounded-full border border-[#5b7b35] bg-[#8ab35b]" />
                <div className="absolute bottom-0 left-0 h-[1.55rem] w-[2.8rem] rounded-b-[0.55rem] rounded-t-[0.2rem] border-[2px] border-[#7b5526] bg-[#b57a34] shadow-[inset_0_0_0_2px_rgba(255,231,168,0.30)]">
                  <div className="absolute inset-x-[0.22rem] top-[0.42rem] h-[2px] bg-[#6f4a20]/65" />
                  <div className="absolute inset-x-[0.22rem] top-[0.88rem] h-[2px] bg-[#6f4a20]/55" />
                  <div className="absolute left-[0.72rem] top-[0.1rem] h-[1.28rem] w-[2px] bg-[#6f4a20]/50" />
                  <div className="absolute left-[1.38rem] top-[0.1rem] h-[1.28rem] w-[2px] bg-[#6f4a20]/50" />
                  <div className="absolute left-[2.04rem] top-[0.1rem] h-[1.28rem] w-[2px] bg-[#6f4a20]/50" />
                </div>
              </div>
              <span className="mb-[0.78rem] h-[0.35rem] w-[0.35rem] rounded-full bg-[#174c2c]" />
              <span className="mb-[0.78rem] h-[0.35rem] w-[0.35rem] rounded-full bg-[#174c2c]" />
            </div>
          )}

          <div
            className="absolute bottom-[0.04rem] left-1/2 -translate-x-1/2 whitespace-nowrap text-[0.70rem] font-black italic text-[#75562b]"
            style={{ fontFamily: cooperFont }}
          >
            {isGosta
              ? "Gösta penkoo tarjouksia..."
              : "Justiina käy ostoskorilla..."}
          </div>
        </>
      )}
    </div>
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
  onOpenNotebook,
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
  const items = Array.isArray(products)
    ? products
    : Array.isArray(results)
      ? results
      : [];
  const hasText = input.trim().length > 0;
  const justiinaLoading = loadingNormal || singleProductCompareLoading;
  const autoSearchInputRef = useRef("");
  const [triggeredSearchInput, setTriggeredSearchInput] = useState("");
  const [searchingAssistant, setSearchingAssistant] = useState<
    "gosta" | "justiina" | null
  >(null);
  const searchStartedAtRef = useRef(0);
  const searchClearTimerRef = useRef<number | null>(null);
  const latestSearchLoadingRef = useRef(false);
  const [cartFlash, setCartFlash] = useState(false);

  const cleanInput = input.trim();
  const notFoundCanShow =
    triggeredSearchInput.length > 0 &&
    triggeredSearchInput === cleanInput &&
    !loading &&
    items.length === 0 &&
    cleanInput.length >= 2;


  useEffect(() => {
    latestSearchLoadingRef.current =
      loadingOffers || loadingNormal || singleProductCompareLoading || loading;
  }, [loadingOffers, loadingNormal, singleProductCompareLoading, loading]);

  useEffect(() => {
    if (!searchingAssistant) return;

    const stillLoading =
      loadingOffers || loadingNormal || singleProductCompareLoading || loading;

    if (stillLoading) return;

    // V644: ei pakotettua 3 s minimikestoa.
    // Animaatio katkeaa heti, kun parent-komponentin loading-tila kertoo haun olevan valmis.
    if (searchClearTimerRef.current !== null) {
      window.clearTimeout(searchClearTimerRef.current);
      searchClearTimerRef.current = null;
    }

    setSearchingAssistant(null);

    return () => {
      if (searchClearTimerRef.current !== null) {
        window.clearTimeout(searchClearTimerRef.current);
        searchClearTimerRef.current = null;
      }
    };
  }, [
    searchingAssistant,
    loadingOffers,
    loadingNormal,
    singleProductCompareLoading,
    loading,
  ]);

  const predictiveText = useMemo(() => {
    const clean = input.trim();

    if (!clean) {
      return "Justiina ehdottaa sopivia hakusanoja kirjoittaessasi.";
    }

    if (notFoundCanShow) {
      return `Hakemaasi “${clean}” ei löytynyt.`;
    }

    const lastWord =
      clean
        .split(/[,\s]+/)
        .filter(Boolean)
        .at(-1) || clean;

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

  const handleManualSearch = async (
    assistant: "gosta" | "justiina",
    handler?: () => void,
  ) => {
    const clean = input.trim();
    if (clean.length >= 2) {
      autoSearchInputRef.current = clean;
      setTriggeredSearchInput(clean);
    }

    if (clean.length < 2) return;

    if (searchClearTimerRef.current !== null) {
      window.clearTimeout(searchClearTimerRef.current);
      searchClearTimerRef.current = null;
    }

    searchStartedAtRef.current = Date.now();
    setSearchingAssistant(assistant);

    await Promise.resolve(handler?.());
  };

  const handleAddInputToCart = () => {
    const clean = input.trim();
    if (!clean) return;

    onAddInputToCart?.();

    const rows = clean
      .split(/[,.\n]+/)
      .map((row) => row.trim())
      .filter(Boolean);

    if (rows.length > 0 && (onAddProduct || onAdd)) {
      rows.forEach((name, index) => {
        const product: ZiiplyMobileSearchCardProduct = {
          id: `manual-${Date.now()}-${index}`,
          name,
          title: name,
          productName: name,
        };

        onAddProduct?.(product);
        onAdd?.(product);
      });
    }

    setCartFlash(true);
    window.setTimeout(() => setCartFlash(false), 950);
  };

  const handleClearInput = () => {
    autoSearchInputRef.current = "";
    setTriggeredSearchInput("");
    onInputChange?.("");
  };

  // V639: pidetään v637:n keyboard-stabiili ankkurointi mukana.
  // Kortti lukitaan 100lvh-korkeuteen ilman bottom-insettiä, jotta iOS-näppäimistö
  // ei kutista fixed-korttia eikä työnnä näkymää ylös. Pieni scroll-palautus tehdään
  // vain jos Safari ehtii vierittää sivua inputin fokuksessa.
  const keepPageAnchoredOnInputFocus = () => {
    if (typeof window === "undefined") return;
    const restoreX = window.scrollX;
    const restoreY = 0;

    window.requestAnimationFrame(() => {
      if (window.scrollY !== restoreY) window.scrollTo(restoreX, restoreY);
      window.setTimeout(() => {
        if (window.scrollY !== restoreY) window.scrollTo(restoreX, restoreY);
      }, 90);
    });
  };

  if (!open) return null;

  return (
    <div
      data-ziiply-mobile-search-card-version="UUSI_V645_REFRAMED_SEARCH_LAYOUT"
      className={`fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.25rem)] z-[72] flex h-[calc(100lvh-env(safe-area-inset-top)-5.45rem)] max-h-[calc(100lvh-env(safe-area-inset-top)-5.45rem)] items-stretch justify-center overflow-hidden bg-transparent px-2 sm:hidden [transform:translateZ(0)] [backface-visibility:hidden] ${className}`}
    >
      <section className="relative isolate flex h-full w-full max-w-[28rem] flex-col overflow-hidden rounded-[1.85rem] border-[3px] border-[#173f2f] bg-[#d9bd77] p-2 text-[#20301f] shadow-[0_7px_0_rgba(91,72,44,0.24),inset_0_0_0_2px_rgba(255,246,207,0.52)]">
        <div className="pointer-events-none absolute inset-[0.42rem] z-0 overflow-hidden rounded-[1.45rem] border-[2px] border-[#ead9a8] bg-[#f6ebc6] shadow-[inset_0_0_0_2px_rgba(216,189,117,0.30)]">
          <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(#d8bd75_1.15px,transparent_1.15px)] [background-size:16px_16px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.48),transparent_54%)]" />
        </div>

        <div className="relative z-10 flex h-full min-h-0 flex-col px-1.5 pb-1.5 pt-1.5">
          {cartFlash && (
            <div
              className="pointer-events-none absolute left-1/2 top-[46%] z-[130] -translate-x-1/2 rounded-full border-[3px] border-[#0b6330] bg-[#fff1c8] px-5 py-2 text-[1rem] font-black italic text-[#174c2c] shadow-[0_4px_0_rgba(91,72,44,0.22)] animate-[ziiplyCartStamp_0.95s_ease-out_both]"
              style={{ fontFamily: cooperFont }}
            >
              Lisätty koriin
            </div>
          )}
          <div className="grid grid-cols-[minmax(0,1fr)_6.8rem] items-start gap-2">
            <div className="min-w-0">
              <div
                className="text-[0.66rem] font-black uppercase leading-none tracking-[0.38em] text-[#6f674f]"
                style={{ fontFamily: copperplateFont }}
              >
                {title}
              </div>

              <h1
                className="mt-0.5 text-[1.72rem] font-black italic leading-[0.86] text-[#123d32]"
                style={{ fontFamily: cooperFont }}
              >
                Tuotteet ja
                <br />
                vertailu
              </h1>
            </div>

            <GreenPillButton
              label="Vihkonen"
              onClick={onOpenNotebook}
              className="mt-1.5 h-[2.45rem] w-full rounded-[1.05rem] text-[0.92rem]"
            />
          </div>

          <div className="relative z-10 mt-2 flex min-h-[3.05rem] items-center justify-center overflow-hidden rounded-[1.2rem] border-[2px] border-[#d2b170] bg-[#fff1bf] px-3 py-[0.42rem] text-center text-[clamp(0.78rem,2.55vw,0.94rem)] font-black leading-[1.08] text-[#6f5630] shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_3px_0_rgba(91,72,44,0.12)]">
            <span className="block w-full whitespace-normal">
              {subtitle || predictiveText}
            </span>
          </div>

          <InlineSearchRunner assistant={searchingAssistant} />

          {/* V641: kevyt hakuanimaatio on nyt omalla varatulla radallaan, ei koko ruudun overlayna.
              mutta v637:n keyboard-stabiili ankkurointi palautetaan, jotta näppäimistö ei työnnä näkymää ylös. */}
          <div className="relative z-10 mt-1.5 rounded-[1.35rem] border-[2px] border-[#d8bd75] bg-[#fff7dc]/62 px-2 pb-2 pt-2 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.36),0_3px_0_rgba(91,72,44,0.12)]">
            <div className="grid grid-cols-[1.12fr_0.74fr_1.12fr] items-center gap-2.5">
              <AssistantButton
                kind="gosta"
                onClick={() => handleManualSearch("gosta", onOfferSearch)}
                disabled={!hasText}
                loading={loadingOffers}
              />

              <div className="flex h-full items-center justify-center">
                <div className="flex h-[4.8rem] w-full max-w-[5.35rem] flex-col items-center justify-center rounded-[0.95rem] border-[2px] border-[#d8bd75] bg-[#fff1bf]/78 px-1.5 text-center shadow-[0_2px_0_rgba(91,72,44,0.14),inset_0_0_0_2px_rgba(255,255,255,0.45)]">
                  <div className="text-[0.66rem] font-black uppercase leading-[0.92] text-[#174c2c]">
                    Tänään
                    <br />
                    halvin
                  </div>
                  <div className="mt-1 text-[0.62rem] font-black leading-[0.92] text-[#6f5630]">
                    kori
                    <br />
                    lähelläsi
                  </div>
                </div>
              </div>

              <AssistantButton
                kind="justiina"
                onClick={() => handleManualSearch("justiina", onNormalSearch)}
                disabled={!hasText}
                loading={justiinaLoading}
              />
            </div>

            <div className="mt-2">
              <div className="relative isolate h-[2.85rem] overflow-hidden rounded-[1.15rem] border-[2px] border-[#9d8350] bg-[#fff4d3] px-[0.34rem] py-[0.32rem] shadow-[0_3px_0_rgba(91,72,44,0.16),inset_0_3px_8px_rgba(91,65,28,0.10)]">
                <textarea
                  ref={inputRef}
                  value={input}
                  onFocus={keepPageAnchoredOnInputFocus}
                  onClick={keepPageAnchoredOnInputFocus}
                  onChange={(event) => {
                    autoSearchInputRef.current = "";
                    setTriggeredSearchInput("");
                    onInputChange?.(event.target.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      handleAddInputToCart();
                    }
                  }}
                  rows={1}
                  placeholder={
                    searchMode === "single"
                      ? "Kirjoita yksi tuote"
                      : "maito, kahvi"
                  }
                  className="block h-full w-full resize-none overflow-hidden rounded-[0.92rem] border-0 bg-[#fffaf0] px-4 py-[0.32rem] pr-[5.65rem] text-center text-[1.08rem] font-black leading-[1.0] text-[#102216] outline-none placeholder:text-[#7d7461]"
                  style={{ fontFamily: hasText ? serifFont : cooperFont }}
                />

                <EraserButton visible={hasText} onClick={handleClearInput} />
                <CartIconButton
                  visible={hasText}
                  disabled={!hasText}
                  onClick={handleAddInputToCart}
                />
              </div>
            </div>

            <div className="relative z-10 mt-2 flex justify-center">
              <ModeToggle mode={searchMode} onModeChange={onSearchModeChange} />
            </div>

            <div className="relative z-10 mt-1.5 grid grid-cols-2 gap-2.5 pb-[0.35rem] pt-1">
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

        <style>{`
          @keyframes ziiplyBasketRunner {
            0% { left: -4.6rem; }
            100% { left: calc(100% + 1.2rem); }
          }

          @keyframes ziiplyPriceRunner {
            0% { left: -4.2rem; }
            100% { left: calc(100% + 1.2rem); }
          }

          @keyframes ziiplyBasketBob {
            0%, 100% { transform: translateY(0) rotate(-1deg); }
            50% { transform: translateY(-3px) rotate(2deg); }
          }

          @keyframes ziiplyCartStamp {
            0% { opacity: 0; transform: translate(-50%, 8px) scale(0.92); }
            18% { opacity: 1; transform: translate(-50%, 0) scale(1.04); }
            72% { opacity: 1; transform: translate(-50%, 0) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -8px) scale(0.98); }
          }
        `}</style>
      </section>
    </div>
  );
}

export { ZiiplyMobileSearchCard };
