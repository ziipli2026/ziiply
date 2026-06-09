"use client";

// UUSI_ZIIPLY_MOBILE_SEARCH_CARD_V685_VOICE_SCALE_100
// Pohja: v676. Korjaus: Justiinan/Göstan hakuanimaatio näkyy aina myös parentin loading-tilasta, ei vain hetkellisestä searchingAssistant-statesta.
// Yläohje palautettu vain tyhjään odotustilaan ja ei-löytynyt-tilaan; ei näytetä löytöluetteloa ylälaatikossa.
// Pohja: v658 toimiva original-ulkoasu säilytetty sellaisenaan.
// Muutos: Gösta saa käynnistyä myös tyhjällä hakukentällä, jotta tarjouskortti voi näyttää kaikki alueen tarjoukset.
// Justiina ja koriinlisäys vaativat edelleen hakutekstin.

// UUSI_ZIIPLY_MOBILE_SEARCH_CARD_V658_SCANNER_SCALE_088
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

export type ZiiplyAddInputToCartOptions = {
  source?: "mobileSearchCard" | string;
  silent?: boolean;
  keepInput?: boolean;
  keepSearchPanelOpen?: boolean;
  preventAutoSearch?: boolean;
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
  onAddInputToCart?: (options?: ZiiplyAddInputToCartOptions) => void;
  onOpenNotebook?: () => void;
  onOfferSearch?: () => void;
  onNormalSearch?: () => void;
  onOpenResults?: () => void;
  hasSearchInput?: boolean;
  loadingOffers?: boolean;
  loadingNormal?: boolean;
  singleProductCompareLoading?: boolean;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;

  onVoiceClick?: () => void;
  onScannerClick?: () => void;
  voiceState?: "idle" | "recording" | "processing";
  scannerState?: "idle" | "active" | "processing";

  /**
   * Göstan ja Justiinan automaattihaun käynnistysviive millisekunteina.
   * Jos ei anneta, kortti käyttää omaa localStorage-muistia.
   */
  autoSearchDelayMs?: number;
  onAutoSearchDelayChange?: (delayMs: number) => void;
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getProductDisplayName(product: ZiiplyMobileSearchCardProduct): string {
  return String(
    product.name || product.productName || product.title || product.brandName || ""
  ).trim();
}

const cooperFont = '"Cooper Black", "Cooper Std Black", Georgia, serif';
const serifFont = '"Baskerville", Georgia, serif';
const copperplateFont = '"Copperplate", "Baskerville", Georgia, serif';

const SEARCH_TEMPO_OPTIONS = [
  { key: "slow", label: "Rauhallinen", delayMs: 3500, angle: -38 },
  { key: "normal", label: "Normaali", delayMs: 2000, angle: 0 },
  { key: "fast", label: "Nopea", delayMs: 1000, angle: 38 },
] as const;

type SearchTempoKey = (typeof SEARCH_TEMPO_OPTIONS)[number]["key"];

function getTempoByDelay(delayMs: number | null | undefined) {
  if (!delayMs) return SEARCH_TEMPO_OPTIONS[1];

  return SEARCH_TEMPO_OPTIONS.reduce((best, option) => {
    const bestDiff = Math.abs(best.delayMs - delayMs);
    const optionDiff = Math.abs(option.delayMs - delayMs);
    return optionDiff < bestDiff ? option : best;
  }, SEARCH_TEMPO_OPTIONS[1]);
}

function normalizePriceToEuros(value: unknown): number {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.replace(",", ".").replace(/[^0-9.\-]/g, ""))
        : NaN;

  if (!Number.isFinite(numberValue) || numberValue <= 0) return NaN;

  // S/K-tuotehauissa hinta voi tulla sentteinä: 198 = 1,98 €.
  // Jos arvo on epärealistisen suuri ruokatuotteelle, tulkitaan se senteiksi.
  if (numberValue >= 100) return numberValue / 100;

  return numberValue;
}

function formatEuroValue(value: unknown): string | null {
  const euros = normalizePriceToEuros(value);

  if (!Number.isFinite(euros) || euros <= 0) return null;

  return `${euros.toFixed(2).replace(".", ",")} €`;
}

function getProductStoreKey(product: ZiiplyMobileSearchCardProduct): string {
  return String(
    product.storeName ||
      product.store ||
      product.shopName ||
      product.shop ||
      product.chain ||
      product.chainName ||
      ""
  ).trim();
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
      className="absolute right-[3.6rem] top-1/2 z-20 grid h-[2.35rem] w-[2.35rem] -translate-y-1/2 place-items-center rounded-full border-[2px] border-[#d0aa4f] bg-[#fff1c9] text-[1.22rem] shadow-[0_3px_0_rgba(91,72,44,0.18),inset_0_0_0_1px_rgba(255,255,255,0.65)] active:translate-y-[calc(-50%+1px)]"
    >
      🧽
    </button>
  );
}

function CartIconButton({
  visible,
  disabled,
  success,
  onClick,
}: {
  visible: boolean;
  disabled?: boolean;
  success?: boolean;
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
        "absolute right-[0.78rem] top-1/2 z-20 grid h-[2.35rem] w-[2.35rem] -translate-y-1/2 place-items-center rounded-full border-[2px] text-[1.30rem] shadow-[0_3px_0_rgba(91,72,44,0.20),inset_0_0_0_1px_rgba(255,255,255,0.72)] transition active:translate-y-[calc(-50%+1px)]",
        disabled
          ? "cursor-not-allowed border-[#b7b0a2] bg-[#ece6d8] text-[#aaa08e] opacity-70"
          : success
            ? "border-[#0b6330] bg-gradient-to-b from-[#fff7d8] to-[#dff1c9] text-[#0b6330] ring-2 ring-[#159948]/35"
            : "border-[#0b6330] bg-gradient-to-b from-[#fff7d8] to-[#dff1c9] text-[#0b6330] hover:brightness-105",
      )}
    >
      {success ? "✓" : "🛒"}
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
        "relative aspect-square w-full min-w-0 overflow-hidden rounded-[1.05rem] border-[2.5px] p-0 shadow-[0_5px_0_rgba(91,72,44,0.24),0_7px_14px_rgba(91,72,44,0.12),inset_0_0_0_2px_rgba(255,255,255,0.52)] active:translate-y-[1px]",
        isGosta
          ? "border-[#6f8f56] bg-gradient-to-b from-[#f5f7dc] to-[#c8d98d]"
          : "border-[#c99f3c] bg-gradient-to-b from-[#fff4c9] to-[#eac85b]",
        disabled ? "cursor-not-allowed opacity-90 saturate-[1.08]" : "hover:brightness-105 hover:saturate-[1.08]",
        loading && "animate-pulse ring-2 ring-[#fff1bf]/70",
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
      : "/ui/scanner/scanner-idle.webp";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="relative block h-full w-full overflow-hidden rounded-[1.28rem] border-[2px] border-[#c89b44]/46 bg-gradient-to-b from-[#2f3326] via-[#182019] to-[#0f140f] p-0 shadow-[0_5px_0_rgba(91,72,44,0.20),inset_0_2px_5px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,235,165,0.12)] outline-none transition-transform duration-150 hover:scale-[1.01] active:translate-y-[1px]"
    >
      <img
        src={imageSrc}
        alt={label}
        className={cx(
          "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 object-contain object-center select-none drop-shadow-[0_4px_9px_rgba(0,0,0,0.42)]",
          // V679: Äänitä-assetissa on enemmän tyhjää canvasia kuin Filmaa-assetissa.
          // Skaalataan VAIN Äänitä-kuvaa ylöspäin, jotta näkyvä kuvake vastaa Filmaa-napin kokoa.
          kind === "voice" ? "h-[100%] w-[100%]" : "h-[92%] w-[92%]",
        )}
        draggable={false}
      />
    </button>
  );
}

function SearchTempoKnob({
  value,
  onChange,
}: {
  value: SearchTempoKey;
  onChange: (value: SearchTempoKey) => void;
}) {
  const current =
    SEARCH_TEMPO_OPTIONS.find((option) => option.key === value) ||
    SEARCH_TEMPO_OPTIONS[1];

  const rotateTempo = () => {
    const index = SEARCH_TEMPO_OPTIONS.findIndex((option) => option.key === current.key);
    const next = SEARCH_TEMPO_OPTIONS[(index + 1) % SEARCH_TEMPO_OPTIONS.length];
    onChange(next.key);
  };

  return (
    <div className="flex h-full items-center justify-center">
      <button
        type="button"
        onClick={rotateTempo}
        aria-label={`Hakutahti ${current.label}`}
        title={`Hakutahti: ${current.label}`}
        className="relative flex h-[4.85rem] w-full max-w-[5.55rem] flex-col items-center justify-center rounded-[1.05rem] border-[2px] border-[#d8bd75] bg-[#fff1bf]/72 px-1 shadow-[0_2px_0_rgba(91,72,44,0.14),inset_0_0_0_2px_rgba(255,255,255,0.48)] transition active:translate-y-[1px]"
      >
        <div className="relative grid h-[2.74rem] w-[2.74rem] place-items-center rounded-full border-[3px] border-[#5d4322] bg-[radial-gradient(circle_at_35%_28%,#fff8dc_0_8%,#d6c08e_15%,#806239_55%,#24180d_100%)] shadow-[0_5px_0_rgba(91,72,44,0.28),0_9px_15px_rgba(0,0,0,0.18),inset_0_0_0_2px_rgba(255,246,207,0.35)]">
          <span
            className="absolute left-1/2 top-[0.30rem] h-[1.12rem] w-[0.20rem] origin-bottom -translate-x-1/2 rounded-full bg-[#8f2018] shadow-[0_0_0_1px_rgba(255,239,189,0.45)] transition-transform duration-200"
            style={{ transform: `translateX(-50%) rotate(${current.angle}deg)` }}
          />
          <span className="h-[0.60rem] w-[0.60rem] rounded-full bg-[#f7e1a2] shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)]" />
        </div>

        <div
          className="mt-[0.32rem] text-center text-[0.50rem] font-black uppercase leading-none tracking-[0.08em] text-[#174c2c]"
          style={{ fontFamily: copperplateFont }}
        >
          Hakutahti
        </div>
        <div className="mt-[0.08rem] text-center text-[0.52rem] font-black leading-none text-[#6f5630]">
          {current.label}
        </div>
        <div className="mt-[0.10rem] text-center text-[0.43rem] font-black leading-none text-[#8b6b35]">
          {(current.delayMs / 1000).toLocaleString("fi-FI")} s
        </div>
      </button>
    </div>
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


function TopGuideStatusBox({
  assistant,
  notFoundText,
  showGuide,
}: {
  assistant: "gosta" | "justiina" | null;
  notFoundText?: string | null;
  showGuide?: boolean;
}) {
  if (assistant) {
    return <InlineSearchRunner assistant={assistant} />;
  }

  const visible = Boolean(notFoundText) || Boolean(showGuide);

  return (
    <div
      aria-hidden={!visible}
      className={cx(
        "relative z-10 mt-1.5 h-[2.85rem] overflow-hidden rounded-[1.15rem] border-[2px] border-[#d8bd75] bg-[#fff4d3]/72 px-3 py-2 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.42)] transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0",
        notFoundText ? "border-[#b85f45] bg-[#fff1d3]/86" : "",
      )}
      role={visible ? "status" : undefined}
      aria-live={visible ? "polite" : undefined}
    >
      {notFoundText ? (
        <div className="flex h-full items-center justify-center text-center">
          <div
            className="text-[0.82rem] font-black leading-tight text-[#8f2f22]"
            style={{ fontFamily: cooperFont }}
          >
            {notFoundText}
          </div>
        </div>
      ) : showGuide ? (
        <div className="flex h-full flex-col justify-center text-center">
          <div
            className="text-[0.82rem] font-black leading-tight text-[#174c2c]"
            style={{ fontFamily: cooperFont }}
          >
            Justiina auttaa löytämään tuotteet ja tarjoukset.
          </div>
          <div className="mt-0.5 text-[0.66rem] font-bold leading-tight text-[#6f5630]">
            Kirjoita tuote, tuoteryhmä tai ostoslista.
          </div>
        </div>
      ) : null}
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
  onOpenResults,
  loadingOffers = false,
  loadingNormal = false,
  singleProductCompareLoading = false,
  inputRef,
  onVoiceClick,
  onScannerClick,
  voiceState = "idle",
  scannerState = "idle",
  autoSearchDelayMs,
  onAutoSearchDelayChange,
}: ZiiplyMobileSearchCardProps) {
  const items = Array.isArray(products)
    ? products
    : Array.isArray(results)
      ? results
      : [];
  const hasText = input.trim().length > 0;
  const justiinaLoading = loadingNormal || singleProductCompareLoading;
  const autoSearchInputRef = useRef("");
  const userEditedSearchRef = useRef(false);
  const [triggeredSearchInput, setTriggeredSearchInput] = useState("");
  const [searchingAssistant, setSearchingAssistant] = useState<
    "gosta" | "justiina" | null
  >(null);
  const searchStartedAtRef = useRef(0);
  const searchClearTimerRef = useRef<number | null>(null);
  const latestSearchLoadingRef = useRef(false);
  const [cartToast, setCartToast] = useState<string | null>(null);
  const cartToastTimerRef = useRef<number | null>(null);
  const autoSearchTimerRef = useRef<number | null>(null);
  const localInputRef = useRef<HTMLTextAreaElement | null>(null);
  const suppressedAutoSearchTermsRef = useRef<Set<string>>(new Set());
  const [tempoKey, setTempoKey] = useState<SearchTempoKey>(() => {
    if (typeof window === "undefined") return "normal";
    const stored = window.localStorage.getItem("ziiply-search-tempo");
    return stored === "slow" || stored === "normal" || stored === "fast"
      ? stored
      : "normal";
  });
  const [tempoToast, setTempoToast] = useState<string | null>(null);

  const cleanInput = input.trim();
  const notFoundCanShow =
    triggeredSearchInput.length > 0 &&
    triggeredSearchInput === cleanInput &&
    !loading &&
    items.length === 0 &&
    cleanInput.length >= 2;
  const topGuideCanShow =
    !hasText &&
    !loading &&
    !loadingOffers &&
    !loadingNormal &&
    !singleProductCompareLoading &&
    searchingAssistant === null;
  const topNotFoundText = notFoundCanShow
    ? `Hakemaasi “${cleanInput}” ei löytynyt.`
    : null;


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

  const suggestionItems = useMemo(() => {
    const seen = new Set<string>();

    return items
      .map(getProductDisplayName)
      .filter(Boolean)
      .filter((name) => {
        const key = name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 5);
  }, [items]);

  const foundCount = items.length;
  const hasFoundProducts = hasText && foundCount > 0;
  const effectiveTempo = autoSearchDelayMs
    ? getTempoByDelay(autoSearchDelayMs)
    : SEARCH_TEMPO_OPTIONS.find((option) => option.key === tempoKey) || SEARCH_TEMPO_OPTIONS[1];
  const effectiveAutoSearchDelayMs = effectiveTempo.delayMs;
  const cheapestPrice = useMemo(() => {
    const prices = items
      .map((item) => {
        const raw = item.price ?? item.currentPrice ?? item.unitPrice ?? item.comparisonPrice;
        return normalizePriceToEuros(raw);
      })
      .filter((value) => Number.isFinite(value) && value > 0);

    if (prices.length === 0) return null;
    return Math.min(...prices);
  }, [items]);
  const cheapestPriceText = formatEuroValue(cheapestPrice);
  const storeCount = useMemo(() => {
    const stores = new Set(
      items.map(getProductStoreKey).filter((value) => value.length > 0),
    );
    return stores.size;
  }, [items]);

  const handleTempoChange = (next: SearchTempoKey) => {
    const option =
      SEARCH_TEMPO_OPTIONS.find((item) => item.key === next) ||
      SEARCH_TEMPO_OPTIONS[1];

    setTempoKey(option.key);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("ziiply-search-tempo", option.key);
    }

    onAutoSearchDelayChange?.(option.delayMs);
    setTempoToast(`Hakutahti: ${option.label}`);
    window.setTimeout(() => setTempoToast(null), 1600);
  };

  const dismissKeyboard = () => {
    // iOS Safari pitää näppäimistön auki niin kauan kuin textarea on fokuksessa.
    // Kun löytöluettelo avataan, fokuksen pitää poistua ENNEN SearchResultsCardin näyttämistä.
    localInputRef.current?.blur();
    inputRef?.current?.blur();

    if (typeof document !== "undefined") {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
    }

    // iOS tarvitsee joskus vielä seuraavan frame-blurin, jos toolbar/animaatio on käynnissä.
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        localInputRef.current?.blur();
        inputRef?.current?.blur();
        const active = document.activeElement;
        if (active instanceof HTMLElement) active.blur();
      });
    }
  };

  const handleOpenFindingsLedger = () => {
    if (!hasFoundProducts) return;

    dismissKeyboard();

    if (autoSearchTimerRef.current !== null) {
      window.clearTimeout(autoSearchTimerRef.current);
      autoSearchTimerRef.current = null;
    }

    setSearchingAssistant(null);
    autoSearchInputRef.current = cleanInput;
    userEditedSearchRef.current = false;
    setTriggeredSearchInput(cleanInput);

    if (onOpenResults) {
      window.setTimeout(() => onOpenResults(), 220);
      return;
    }

    // Fallback: vanha parent-polku voi avata löydökset normaalin haun valmistuttua.
    window.setTimeout(() => onNormalSearch?.(), 220);
  };

  const predictiveText = useMemo(() => {
    const clean = input.trim();

    if (!clean) {
      return "Kirjoita tuote – Ziiply ymmärtää myös kokis, juhlamokka ja nauta jauheliha.";
    }

    if (notFoundCanShow) {
      return `Hakemaasi “${clean}” ei löytynyt.`;
    }

    if (suggestionItems.length > 0) {
      return `Ehdotukset: ${suggestionItems.slice(0, 3).join(" · ")}`;
    }

    return `Tulkitaan hakuna: ${clean}`;
  }, [input, notFoundCanShow, suggestionItems]);

  useEffect(() => {
    const clean = input.trim();

    // Kun käyttäjä muuttaa tekstiä, vanha "ei löytynyt" -tila poistuu heti.
    if (triggeredSearchInput && clean !== triggeredSearchInput) {
      setTriggeredSearchInput("");
    }

    if (!open || !clean || clean.length < 2) return;

    // V674: jos sana on lisätty ostoslistaan abstraktina tuotteena, se on tietoisesti
    // käsitelty ilman hakua. Sama teksti ei saa myöhemmin laukaista Justiinan automaattihakua.
    if (suppressedAutoSearchTermsRef.current.has(clean.toLowerCase())) return;

    // V671: automaattihaku saa käynnistyä vain käyttäjän uuden kirjoitusmuutoksen jälkeen.
    // Tämä estää tilanteen, jossa SearchResultsCard avautuu hetkeksi, hakukortti remounttaa
    // samalla tekstillä ja Justiina käynnistää saman haun uudelleen ilman käyttäjän uutta syötettä.
    if (!userEditedSearchRef.current) return;

    if (loadingOffers || loadingNormal || singleProductCompareLoading) return;
    if (autoSearchInputRef.current === clean) return;

    if (autoSearchTimerRef.current !== null) {
      window.clearTimeout(autoSearchTimerRef.current);
      autoSearchTimerRef.current = null;
    }

    autoSearchTimerRef.current = window.setTimeout(() => {
      autoSearchTimerRef.current = null;

      // V672: jos käyttäjä ehti lisätä sanan ostoslistaan, kyseistä tekstiä ei saa
      // enää käyttää automaattihaun käynnistämiseen. Ostoslistaan lisääminen on
      // tietoinen toiminto ilman hakua.
      if (!userEditedSearchRef.current) return;

      const latest = input.trim();
      if (!latest || latest.length < 2) return;
      if (suppressedAutoSearchTermsRef.current.has(latest.toLowerCase())) return;
      if (autoSearchInputRef.current === latest) return;

      autoSearchInputRef.current = latest;
      userEditedSearchRef.current = false;
      setTriggeredSearchInput(latest);

      if (searchClearTimerRef.current !== null) {
        window.clearTimeout(searchClearTimerRef.current);
        searchClearTimerRef.current = null;
      }

      searchStartedAtRef.current = Date.now();
      setSearchingAssistant("justiina");

      onNormalSearch?.();
    }, effectiveAutoSearchDelayMs);

    return () => {
      if (autoSearchTimerRef.current !== null) {
        window.clearTimeout(autoSearchTimerRef.current);
        autoSearchTimerRef.current = null;
      }
    };
  }, [
    input,
    open,
    triggeredSearchInput,
    loadingOffers,
    loadingNormal,
    singleProductCompareLoading,
    effectiveAutoSearchDelayMs,
    onNormalSearch,
  ]);

  const handleManualSearch = async (
    assistant: "gosta" | "justiina",
    handler?: () => void,
  ) => {
    const clean = input.trim();
    if (clean.length >= 2) {
      autoSearchInputRef.current = clean;
      userEditedSearchRef.current = false;
      setTriggeredSearchInput(clean);
    }

    if (assistant === "justiina" && clean.length < 2) return;

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

    // V674: tämä on "lisää abstrakti tuote ostoslistaan" -toiminto, ei haku.
    // Estetään kaikki tähän samaan kirjoitettuun sanaan liittyvät automaattihaut.
    suppressedAutoSearchTermsRef.current.add(clean.toLowerCase());

    if (autoSearchTimerRef.current !== null) {
      window.clearTimeout(autoSearchTimerRef.current);
      autoSearchTimerRef.current = null;
    }

    if (searchClearTimerRef.current !== null) {
      window.clearTimeout(searchClearTimerRef.current);
      searchClearTimerRef.current = null;
    }

    autoSearchInputRef.current = clean;
    userEditedSearchRef.current = false;
    setTriggeredSearchInput("");
    setSearchingAssistant(null);

    const rows = clean
      .split(/[,.\n]+/)
      .map((row) => row.trim())
      .filter(Boolean);

    // V675: abstraktin tekstituotteen lisääminen hoidetaan parentin omalla
    // ostoslistafunktiolla hiljaisena lisäyksenä. Ei kutsuta onAddProduct/onAdd
    // täällä, koska ne käynnistävät tuotekortin normaalin lisäyspolun ja voivat
    // avata/tyhjentää näkymiä -> iPhonella näkyvä pomppu/välähdys.
    onAddInputToCart?.({
      source: "mobileSearchCard",
      silent: true,
      keepInput: true,
      keepSearchPanelOpen: true,
      preventAutoSearch: true,
    });

    const toastLabel =
      rows.length > 1
        ? `${rows.length} tuotetta lisätty ostoslistaan`
        : `${rows[0] || clean} lisätty ostoslistaan`;

    if (cartToastTimerRef.current !== null) {
      window.clearTimeout(cartToastTimerRef.current);
      cartToastTimerRef.current = null;
    }

    setCartToast(toastLabel);
    cartToastTimerRef.current = window.setTimeout(() => {
      setCartToast(null);
      cartToastTimerRef.current = null;
    }, 2800);
  };

  const handleClearInput = () => {
    if (autoSearchTimerRef.current !== null) {
      window.clearTimeout(autoSearchTimerRef.current);
      autoSearchTimerRef.current = null;
    }

    autoSearchInputRef.current = "";
    userEditedSearchRef.current = false;
    setTriggeredSearchInput("");
    setSearchingAssistant(null);
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
      data-ziiply-mobile-search-card-version="UUSI_V685_VOICE_SCALE_100"
      className={`fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.25rem)] z-[72] flex h-[calc(100lvh-env(safe-area-inset-top)-5.45rem)] max-h-[calc(100lvh-env(safe-area-inset-top)-5.45rem)] items-stretch justify-center overflow-hidden bg-transparent px-2 sm:hidden [transform:translateZ(0)] [backface-visibility:hidden] ${className}`}
    >
      <section className="relative isolate flex h-full w-full max-w-[28rem] flex-col overflow-hidden rounded-[1.85rem] border-[3px] border-[#173f2f] bg-[#d9bd77] p-2 text-[#20301f] shadow-[0_7px_0_rgba(91,72,44,0.24),inset_0_0_0_2px_rgba(255,246,207,0.52)]">
        <div className="pointer-events-none absolute inset-[0.42rem] z-0 overflow-hidden rounded-[1.45rem] border-[2px] border-[#ead9a8] bg-[#f6ebc6] shadow-[inset_0_0_0_2px_rgba(216,189,117,0.30)]">
          <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(#d8bd75_1.15px,transparent_1.15px)] [background-size:16px_16px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.48),transparent_54%)]" />
        </div>

        <div className="relative z-10 flex h-full min-h-0 flex-col px-1.5 pb-1.5 pt-1.5">
          {tempoToast && (
            <div
              className="absolute left-1/2 top-[7.0rem] z-[135] -translate-x-1/2 rounded-full border-[2px] border-[#d8bd75] bg-[#fff1bf] px-4 py-2 text-center text-[0.78rem] font-black text-[#174c2c] shadow-[0_5px_0_rgba(91,72,44,0.16),0_10px_18px_rgba(0,0,0,0.12)] animate-[ziiplyTempoToast_1.6s_ease-out_both]"
              role="status"
              aria-live="polite"
              style={{ fontFamily: cooperFont }}
            >
              {tempoToast}
            </div>
          )}

          {cartToast && (
            <div
              className="absolute left-3 right-3 top-[5.85rem] z-[145] rounded-[1.15rem] border-[3px] border-[#0b6330] bg-gradient-to-b from-[#fff7d8] to-[#dff1c9] px-4 py-3 text-[#123d32] shadow-[0_7px_0_rgba(91,72,44,0.18),0_12px_24px_rgba(0,0,0,0.18)] animate-[ziiplyCartToast_2.8s_ease-out_both]"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-[2.35rem] w-[2.35rem] shrink-0 place-items-center rounded-full border-[2px] border-[#0b6330] bg-[#159948] text-[1.35rem] font-black text-[#fff7dc] shadow-[0_2px_0_rgba(0,0,0,0.22)]">
                  ✓
                </div>
                <div className="min-w-0">
                  <div
                    className="text-[0.94rem] font-black leading-tight"
                    style={{ fontFamily: cooperFont }}
                  >
                    Lisätty ostoslistaan
                  </div>
                  <div className="mt-0.5 truncate text-[0.82rem] font-bold leading-tight text-[#23502c]">
                    {cartToast}
                  </div>
                </div>
              </div>
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
              className="mt-0.5 h-[2.28rem] w-full rounded-[0.95rem] text-[0.84rem] shadow-[0_0_0_2px_rgba(255,255,255,0.18)_inset,0_3px_0_#064a26]"
            />
          </div>

          <TopGuideStatusBox
            assistant={
              searchingAssistant ||
              (loadingOffers
                ? "gosta"
                : loadingNormal || singleProductCompareLoading || loading
                  ? "justiina"
                  : null)
            }
            notFoundText={topNotFoundText}
            showGuide={topGuideCanShow}
          />

          {/* V641: kevyt hakuanimaatio on nyt omalla varatulla radallaan, ei koko ruudun overlayna.
              mutta v637:n keyboard-stabiili ankkurointi palautetaan, jotta näppäimistö ei työnnä näkymää ylös. */}
          <div className="relative z-10 mt-1 rounded-[1.35rem] border-[2px] border-[#d8bd75] bg-[#fff7dc]/62 px-2 pb-2 pt-2 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.36),0_3px_0_rgba(91,72,44,0.12)]">
            <div className="grid grid-cols-[1.12fr_0.74fr_1.12fr] items-center gap-2.5">
              <AssistantButton
                kind="gosta"
                onClick={() => handleManualSearch("gosta", onOfferSearch)}
                disabled={false}
                loading={loadingOffers}
              />

              <SearchTempoKnob
                value={effectiveTempo.key}
                onChange={handleTempoChange}
              />

              <AssistantButton
                kind="justiina"
                onClick={() => handleManualSearch("justiina", onNormalSearch)}
                disabled={!hasText}
                loading={justiinaLoading}
              />
            </div>

            <div className="mt-1.5">
              <div className="relative isolate h-[3.35rem] overflow-hidden rounded-[1.28rem] border-[2px] border-[#9d8350] bg-[#fff4d3] px-[0.34rem] py-[0.32rem] shadow-[0_3px_0_rgba(91,72,44,0.16),inset_0_3px_8px_rgba(91,65,28,0.10)]">
                <textarea
                  ref={(node) => {
                    localInputRef.current = node;
                    if (inputRef) {
                      (inputRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
                    }
                  }}
                  value={input}
                  onFocus={keepPageAnchoredOnInputFocus}
                  onClick={keepPageAnchoredOnInputFocus}
                  onChange={(event) => {
                    if (autoSearchTimerRef.current !== null) {
                      window.clearTimeout(autoSearchTimerRef.current);
                      autoSearchTimerRef.current = null;
                    }

                    autoSearchInputRef.current = "";
                    userEditedSearchRef.current = true;
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
                  autoCorrect="on"
                  spellCheck={true}
                  autoCapitalize="sentences"
                  enterKeyHint="search"
                  placeholder={
                    searchMode === "single"
                      ? "Kirjoita yksi tuote"
                      : "maito, kahvi"
                  }
                  className="block h-full w-full resize-none overflow-hidden rounded-[1.02rem] border-0 bg-[#fffaf0] px-4 py-[0.45rem] pr-[6.55rem] text-center text-[1.26rem] font-black leading-[1.05] text-[#102216] outline-none placeholder:text-[#7d7461]"
                  style={{ fontFamily: hasText ? serifFont : cooperFont }}
                />

                <EraserButton visible={hasText} onClick={handleClearInput} />
                <CartIconButton
                  visible={hasText}
                  disabled={!hasText}
                  success={cartToast !== null}
                  onClick={handleAddInputToCart}
                />
              </div>
            </div>

            {hasFoundProducts && (
              <button
                type="button"
                onClick={handleOpenFindingsLedger}
                className="relative z-10 mt-1.5 w-full overflow-hidden rounded-[1.05rem] border-[2px] border-[#d8bd75] bg-gradient-to-b from-[#fff1bf] to-[#f4df9f] px-3 py-[0.62rem] text-left text-[#174c2c] shadow-[0_2px_0_rgba(91,72,44,0.11),inset_0_0_0_2px_rgba(255,255,255,0.48)] active:translate-y-[1px]"
                aria-label={`Avaa löytöluettelo, ${foundCount} tuotetta`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="grid h-[1.65rem] w-[1.65rem] shrink-0 place-items-center rounded-full border border-[#0b6330] bg-[#159948] text-[0.82rem] text-[#fff7dc] shadow-[0_2px_0_rgba(91,72,44,0.14)]">
                    🔎
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className="block truncate text-[0.66rem] font-black uppercase tracking-[0.16em] text-[#174c2c]"
                      style={{ fontFamily: copperplateFont }}
                    >
                      Löytöluettelossa
                    </span>
                    <span className="mt-0.5 block truncate text-[0.76rem] font-black leading-tight text-[#6f5630]">
                      {foundCount} tuotetta
                      {storeCount > 0 ? ` · ${storeCount} kauppaa` : ""}
                      {cheapestPriceText ? ` · halvin ${cheapestPriceText}` : ""}
                    </span>
                  </span>

                  <span className="shrink-0 text-[1.18rem] font-black text-[#0b6330]">›</span>
                </div>
              </button>
            )}

            <div className="relative z-10 mx-auto mt-2 h-[2px] w-[92%] rounded-full bg-[#b58b3d]/55 shadow-[0_1px_0_rgba(255,255,255,0.55)]" />

            <div className="relative z-10 mx-auto mt-2 w-full max-w-[23.6rem] overflow-visible px-2 py-1">
              {/* V679: puinen yhteinen taustapaneeli poistettu. Nappien kontit ovat samankokoiset.
                  Äänitä-asset skaalataan erikseen, koska sen näkyvä grafiikka on Filmaa-assetia pienempi. */}
              <div className="grid h-[7.15rem] grid-cols-2 items-center gap-4">
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

          @keyframes ziiplyCartToast {
            0% { opacity: 0; transform: translateY(-12px) scale(0.98); }
            12% { opacity: 1; transform: translateY(0) scale(1); }
            84% { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(-10px) scale(0.99); }
          }

          @keyframes ziiplyTempoToast {
            0% { opacity: 0; transform: translate(-50%, -8px) scale(0.98); }
            18% { opacity: 1; transform: translate(-50%, 0) scale(1); }
            78% { opacity: 1; transform: translate(-50%, 0) scale(1); }
            100% { opacity: 0; transform: translate(-50%, -6px) scale(0.99); }
          }
        `}</style>
      </section>
    </div>
  );
}

export { ZiiplyMobileSearchCard };

