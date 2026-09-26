"use client";

// ZIIPLY_MOBILE_COMPARE_SELECTION_CARD_V13_LEATHER_BACK_ARROW
// Kauppakohtainen erittely: isot 2x2-painikkeet, aktiivinen tila vihreänä.
// V12: paluu vasempaan yläkulmaan paperilappu-/hintalappu-tyyliin mockupin mukaan.
// Selection-kortille EI lisätä jaa-koria; vain paluu vertailuun ja sulje.

import React from "react";

export type ZiiplyCompareSelectionStore = {
  id: string;
  name: string;
  chain?: "S" | "K";
  totalPrice?: number;
  itemCount?: number;
  savingsVsHighest?: number;
  distanceKm?: number;
  badge?: string;
  matches?: unknown[];
  missingItems?: number;
};

export type ZiiplyCompareSelectionItem = {
  id?: string | number;
  name?: string;
  title?: string;
  productName?: string;
  selectedPrice?: number;
  cheapestPrice?: number;
  price?: number | string;
  quantity?: number;
  qualityMode?: "cheapest" | "same_quality" | "own_brands" | "same_brand";
  matchType?: "ean" | "name" | "manual";
  isMissingComparisonItem?: boolean;
  storePrices?: Record<string, number | string | undefined>;
  product?: {
    id?: string | number;
    name?: string;
    ean?: string;
    price?: number;
    image?: string;
    imageUrl?: string;
  };
  cartItem?: {
    name?: string;
    quantity?: number;
  };
  [key: string]: any;
};

export type ZiiplyMobileCompareSelectionCardProps = {
  open?: boolean;
  embedded?: boolean;
  store: ZiiplyCompareSelectionStore;
  items?: unknown[];
  isBest?: boolean;
  onBack?: () => void;
  onSelectStore?: () => void;
  onShareStore?: () => void;
  onChangeMatchMode?: (
    storeId: string,
    match: unknown,
    mode: "cheapest" | "same_quality" | "own_brands" | "same_brand",
  ) => void | Promise<void>;
  onResetMatchMode?: (storeId: string, match: unknown) => void | Promise<void>;
  onClose?: () => void;
  className?: string;
};

const cooperFont = '"Cooper Black", "Cooper Std Black", Georgia, serif';
const copperplateFont = '"Copperplate", "Baskerville", Georgia, serif';
const serifFont = '"Baskerville", Georgia, serif';

type QualityMode = "cheapest" | "same_quality" | "own_brands" | "same_brand";

const QUALITY_MODES: Array<{
  mode: QualityMode;
  label: string;
  hint: string;
}> = [
  { mode: "cheapest", label: "Edullisin", hint: "Halvin sopiva" },
  { mode: "same_quality", label: "Vastaava", hint: "Sama taso" },
  { mode: "own_brands", label: "Oma merkki", hint: "Kaupan oma" },
  { mode: "same_brand", label: "Sama merkki", hint: "Sama brändi" },
];

function formatComparePrice(value: unknown) {
  if (value == null || value === "") return "—";

  if (typeof value === "number" && Number.isFinite(value)) {
    const euros = Math.abs(value) > 20 ? value / 100 : value;
    return `${euros.toFixed(2).replace(".", ",")} €`;
  }

  const raw = String(value).trim();
  if (!raw) return "—";
  if (raw.includes("€")) return raw;

  const parsed = Number(raw.replace(/\s/g, "").replace(",", "."));
  if (Number.isFinite(parsed)) {
    const euros = Math.abs(parsed) > 20 ? parsed / 100 : parsed;
    return `${euros.toFixed(2).replace(".", ",")} €`;
  }

  return raw;
}

function getItemName(item: unknown) {
  const data = item as ZiiplyCompareSelectionItem;

  // Vertailun Match-rivillä product on juuri kyseiselle kaupalle valittu
  // vastine. Älä anna mahdollisen ylimmän tason lähdenimen peittää sitä.
  // Puuttuvalle/cart-riville käytetään edelleen alkuperäistä nimeä.
  return String(
    (!data?.isMissingComparisonItem && data?.product?.name) ||
      data?.name ||
      data?.title ||
      data?.productName ||
      data?.product?.name ||
      data?.cartItem?.name ||
      data?.originalName ||
      "Tuote",
  );
}

function getItemQuantity(item: unknown) {
  const data = item as ZiiplyCompareSelectionItem;
  const quantity = Number(data?.quantity ?? data?.cartItem?.quantity ?? 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function getItemPriceForStore(item: unknown, storeId: string) {
  const data = item as ZiiplyCompareSelectionItem;
  const storeSpecific = data?.storePrices?.[storeId];

  if (typeof data?.price === "number" && Number.isFinite(data.price)) {
    return data.price * getItemQuantity(data);
  }

  return storeSpecific ?? data?.selectedPrice ?? data?.price ?? data?.cheapestPrice;
}

function getCurrentQualityMode(item: unknown): QualityMode {
  const data = item as ZiiplyCompareSelectionItem;
  const mode = String(data?.qualityMode || "cheapest");

  if (mode === "same_quality" || mode === "own_brands" || mode === "same_brand") return mode;

  return "cheapest";
}

function getProductImage(item: unknown) {
  const data = item as ZiiplyCompareSelectionItem;
  return data?.image || data?.imageUrl || data?.product?.image || data?.product?.imageUrl || "";
}

function getStoreOwnBrandExample(chain?: "S" | "K") {
  if (chain === "K") return "Pirkka / K-Menu";
  if (chain === "S") return "Kotimaista / Coop / Xtra";
  return "Kaupan oma";
}

function getProductBrandExample(item: unknown) {
  const name = getItemName(item);
  const first = name.split(/\s+/).find((part) => /[A-Za-zÅÄÖåäö]/.test(part)) || "sama brändi";
  return first.replace(/[^\wÅÄÖåäö-]/g, "");
}

function getQualityHint(mode: QualityMode, item: unknown, chain?: "S" | "K") {
  switch (mode) {
    case "cheapest":
      return "Halvin sopiva";
    case "same_quality":
      return "Esim. Pepsi / vastaava";
    case "own_brands":
      return `Esim. ${getStoreOwnBrandExample(chain)}`;
    case "same_brand":
      return `Esim. ${getProductBrandExample(item)}`;
    default:
      return "";
  }
}

export default function ZiiplyMobileCompareSelectionCard({
  open = true,
  embedded = false,
  store,
  items = [],
  isBest = false,
  onBack,
  onSelectStore,
  onShareStore,
  onChangeMatchMode,
  onClose,
  className = "",
}: ZiiplyMobileCompareSelectionCardProps) {
  if (!open) return null;

  const rows = ((store.matches && store.matches.length > 0 ? store.matches : items) || []) as ZiiplyCompareSelectionItem[];

  const productRows = (<>
{rows.length === 0 ? (
              <div className="rounded-[1.05rem] border-[2px] border-[#7c663d]/78 bg-[#fff4d8]/72 px-4 py-8 text-center text-[0.82rem] font-extrabold text-[#6b6048] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.30),0_6px_14px_rgba(72,51,22,0.10)]">
                Tälle kaupalle ei löytynyt tuoterivejä vertailusta.
              </div>
            ) : (
              rows.map((item, index) => {
                const missing = Boolean(item.isMissingComparisonItem);
                const price = missing ? null : getItemPriceForStore(item, store.id);
                const currentMode = getCurrentQualityMode(item);
                const image = getProductImage(item);

                return (
                  <article
                    key={String(item.id ?? item.product?.id ?? index)}
                    className="border-b border-[#d4bd86]/72"
                  >
                    <div className="grid min-h-[3.72rem] grid-cols-[minmax(0,1fr)_4.65rem] items-center border-b border-[#d4bd86]/72 px-3 py-1.5">
                      <div className="flex min-w-0 items-center gap-2.5 pr-2">
                        {image ? (
                          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-[0.55rem] border border-[#b99d5c] bg-[#fff8e5]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={image} alt="" className="h-full w-full object-contain" />
                          </div>
                        ) : null}

                        <div className="min-w-0">
                          <div className="truncate text-[0.87rem] font-black leading-tight text-[#233020]">
                            {getItemName(item)}
                          </div>
                          <div className="mt-0.5 text-[0.54rem] font-black uppercase tracking-[0.08em] text-[#6e6d55]">
                            #{index + 1} · {getItemQuantity(item)} kpl{missing ? " · Ei löytynyt tästä kaupasta" : ""}
                          </div>
                          {!missing && item.matchType === "name" ? (
                            <div className="mt-0.5 text-[0.54rem] font-black uppercase tracking-[0.06em] text-[#8a4f20]">
                              Vastaava tuote
                            </div>
                          ) : null}
                          {/huiluntuhti/i.test(String(item.ziiplyDebugSourceName || item.ziiplyDebugSourceProductName || item.name || item.product?.name || "")) ? (
                            <div className="mt-1 break-all rounded border border-[#9b6a2f]/60 bg-[#fff1bf]/80 px-1 py-0.5 text-[0.45rem] font-bold normal-case leading-tight text-[#5b3517]">
                              DBG src={String(item.ziiplyDebugSourceName || "—")} | ean={String(item.ziiplyDebugSourceEan || "—")}<br />
                              prod={String(item.ziiplyDebugSourceProductName || "—")} | pean={String(item.ziiplyDebugSourceProductEan || "—")}<br />
                              match={String(item.product?.name || "MISSING")} | mean={String(item.product?.ean || "—")} | type={String(item.matchType || "—")}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div
                        className="whitespace-nowrap text-right text-[0.98rem] font-black italic text-[#3e301c]"
                        style={{ fontFamily: serifFont }}
                      >
                        {formatComparePrice(price)}
                      </div>
                    </div>

                    {onChangeMatchMode && !missing ? (
                      <div className="grid grid-cols-2 gap-2 px-3 py-2.5">
                        {QUALITY_MODES.map(({ mode, label, hint }) => {
                          const active = currentMode === mode;

                          return (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => onChangeMatchMode(store.id, item, mode)}
                              className={`min-h-[2.52rem] rounded-[0.82rem] border-[2.5px] px-2 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25)] active:translate-y-[1px] ${
                                active
                                  ? "border-[#0b6330] bg-[linear-gradient(180deg,#139143_0%,#087237_100%)] text-[#fff6d7]"
                                  : "border-[#876b37] bg-[#efe1bd] text-[#28402a]"
                              }`}
                              title={label}
                            >
                              <div className="text-[0.62rem] font-black uppercase tracking-[0.04em]">
                                {active ? "✓ " : ""}
                                {label}
                              </div>
                              <div className={active ? "mt-0.5 text-[0.49rem] font-extrabold opacity-90" : "mt-0.5 text-[0.49rem] font-extrabold text-[#6b6048]"}>
                                {active ? "Valittu" : getQualityHint(mode, item, store.chain)}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
  </>);

  if (embedded) return (
    <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-[#d4bd86]/72 bg-transparent [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {onBack ? (
        <button type="button" onClick={onBack} className="ml-2 mt-2 inline-flex items-center gap-1 rounded-[0.42rem] border border-[#876b37] bg-[#efe1bd] px-2 py-1 text-[0.68rem] font-black text-[#28402a]" aria-label={`Palaa ${store.name} korin yhteenvetoon`}>
          <span aria-hidden="true">←</span> Paluu
        </button>
      ) : null}
      {productRows}
    </div>
  );

  return (
    <div
      className={`fixed inset-0 z-[94] flex items-start justify-center bg-[#eef7f2]/98 px-2 pb-[calc(env(safe-area-inset-bottom)+1.05rem)] pt-[calc(env(safe-area-inset-top)+0.45rem)] backdrop-blur-md sm:hidden ${className}`}
    >
      <section className="relative flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2.0rem)] max-h-[46rem] min-h-[31rem] w-full max-w-[28rem] flex-col overflow-hidden rounded-[2.1rem] border-[5px] border-[#3b2414] bg-[linear-gradient(135deg,#2a170e_0%,#5a3720_45%,#2a170e_100%)] shadow-[0_12px_0_rgba(35,23,13,0.28),0_24px_52px_rgba(0,0,0,0.30)]">
        <div
          className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[#f7edcf] bg-center bg-no-repeat opacity-100"
          style={{
            backgroundImage: "url('/ui/cart/vihkonen.webp')",
            backgroundSize: "142% 104%",
            backgroundPosition: "center top",
          }}
        />
        <div className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[linear-gradient(180deg,rgba(255,250,226,0.58),rgba(246,226,172,0.22)_34%,rgba(238,214,156,0.10))]" />
        <div className="pointer-events-none absolute inset-[0.42rem] rounded-[1.55rem] border border-dashed border-[#d6a861]/55 shadow-[inset_0_0_0_2px_rgba(27,17,9,0.20)]" />

        <header className="relative z-10 shrink-0 px-5 pb-1 pt-[7.9rem]">
          <div className="mb-2 px-1 text-center">
            <div
              className="text-[0.52rem] font-black uppercase tracking-[0.24em] text-[#665d45]/86"
              style={{ fontFamily: copperplateFont }}
            >
              Kaupan erittely
            </div>
            <div
              className="mt-0.5 truncate text-[1.52rem] font-black italic leading-none text-[#28402a] drop-shadow-[0_1px_0_rgba(255,247,211,0.62)]"
              style={{ fontFamily: cooperFont }}
            >
              {store.name}
            </div>
            <div className="mt-0.5 text-[0.78rem] font-extrabold text-[#5f5034]">
              Kauppakohtainen kori
            </div>
          </div>
        </header>

        <main className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-4 pt-[0.8rem]">
          <div className="flex min-h-0 flex-1 flex-col gap-2.5">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.05rem] border-[2px] border-[#7c663d]/78 bg-[#fff4d8]/76 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.30),0_6px_14px_rgba(72,51,22,0.10)]">
            <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {productRows}

            </div>
            <div className="grid shrink-0 grid-cols-[2.30rem_minmax(0,1fr)_2.30rem_2.30rem] items-center gap-2 border-t border-[#d4bd86]/72 px-3 py-2.5">
              {onBack ? <button type="button" onClick={onBack}
                className="grid h-[2.22rem] w-[2.30rem] place-items-center rounded-[0.46rem] border-2 border-[#2b1a0e] bg-[linear-gradient(135deg,#7a4c2d,#3b2414)] text-[#f7e7bd] shadow-[0_2px_5px_rgba(45,30,10,0.22)]"
                aria-label="Takaisin vertailuun" title="Takaisin vertailuun">
                <span className="grid h-[1.42rem] w-[1.42rem] place-items-center rounded-full border border-[#6b421f] bg-[radial-gradient(circle_at_35%_35%,#f6c46c,#b0752a_52%,#65401f)] text-[#2b1a0e]">←</span>
              </button> : <span />}
              <div
                className="min-h-[2.40rem] rounded-[0.72rem] border-[2.5px] border-[#496443] bg-[linear-gradient(180deg,#f3e8cc_0%,#dfcfaa_100%)] px-3 py-2 text-center text-[0.72rem] font-black italic tracking-[0.03em] text-[#244525] shadow-[inset_0_0_0_1px_rgba(255,250,224,0.58),0_2px_4px_rgba(62,43,20,0.18)]"
                style={{ fontFamily: cooperFont }}
              >
                Valittu vertailukori
              </div>
              {onShareStore ? <button
                type="button"
                onClick={onShareStore}
                className="grid h-[2.22rem] w-[2.22rem] place-items-center rounded-[0.46rem] border-[1.6px] border-[#8b713d] bg-[linear-gradient(180deg,#f5e5bd_0%,#d6b875_100%)] text-[#51361a] shadow-[0_2px_5px_rgba(45,30,10,0.17),inset_0_0_0_1px_rgba(255,249,220,0.55)] active:translate-y-[1px]"
                aria-label="Jaa vertailukori" title="Jaa kori"
              >
                <svg aria-hidden="true" viewBox="0 0 24 18" className="h-[0.94rem] w-[1.12rem]">
                  <path d="M2.5 3.5h19v11h-19z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M3 4l9 6.5L21 4M3.2 14.2l6.1-5M20.8 14.2l-6.1-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button> : <span aria-hidden="true" />}
              {onSelectStore ? (
                <button
                  type="button"
                  onClick={onSelectStore}
                  className="grid h-[2.22rem] w-[2.22rem] place-items-center rounded-[0.46rem] border-[1.6px] border-[#765628] bg-[linear-gradient(180deg,#f5dfac_0%,#d2a661_100%)] text-[#51361a] shadow-[0_2px_5px_rgba(45,30,10,0.17)] active:translate-y-[1px]"
                  aria-label={`Osta ${store.name} vertailukori`} title="Osta tämä vertailukori"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[1.52rem] w-[1.52rem]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
                    <path d="M3 18h18v4H3zM5 10h14l2 8H3zM7 2h10v8H7z"/>
                    <path d="M9 5h6M8 14h2m4 0h2M11 20h2" strokeLinecap="round"/>
                  </svg>
                </button>
              ) : <span aria-hidden="true" />}
            </div>

            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_5.25rem] items-center rounded-[1.05rem] border-[2px] border-[#7c663d]/78 bg-[#fff7df]/78 px-3 py-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.30),0_6px_14px_rgba(72,51,22,0.10)]">
              <div
                className="text-[0.70rem] font-black uppercase tracking-[0.10em] text-[#3e301c]"
                style={{ fontFamily: copperplateFont }}
              >
                Yhteensä
              </div>
              <div
                className="whitespace-nowrap text-right text-[1.12rem] font-black italic text-[#0b7837]"
                style={{ fontFamily: serifFont }}
              >
                {formatComparePrice(store.totalPrice)}
              </div>
            </div>
          </div>
        </main>



        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="absolute left-[0.78rem] top-[0.88rem] z-[35] grid h-[2.30rem] w-[2.58rem] place-items-center rounded-l-[0.42rem] rounded-r-[0.82rem] border-[2px] border-[#2b1a0e] bg-[linear-gradient(135deg,#7a4c2d_0%,#3b2414_78%)] text-[#f7e7bd] shadow-[0_3px_8px_rgba(0,0,0,0.22),inset_0_0_0_1px_rgba(255,214,139,0.18)] active:translate-y-[1px]"
            aria-label="Takaisin"
            title="Takaisin"
          >
            <span className="grid h-[1.42rem] w-[1.42rem] place-items-center rounded-full border border-[#6b421f] bg-[radial-gradient(circle_at_35%_35%,#f6c46c_0%,#b0752a_52%,#65401f_100%)] text-[1rem] text-[#2b1a0e] shadow-[0_1px_2px_rgba(0,0,0,0.28)]">
              ←
            </span>
          </button>
        ) : null}



        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-[0.78rem] top-[0.88rem] z-[35] grid h-[2.62rem] w-[2.86rem] place-items-center rounded-l-[0.8rem] rounded-r-[0.42rem] border-[2px] border-[#2b1a0e] bg-[linear-gradient(135deg,#7a4c2d_0%,#3b2414_78%)] text-[1.1rem] font-black leading-none text-[#f7e7bd] shadow-[0_3px_8px_rgba(0,0,0,0.25),inset_0_0_0_1px_rgba(255,214,139,0.18)] active:translate-y-[1px]"
            aria-label="Sulje erittely"
            title="Sulje erittely"
          >
            <span className="grid h-[1.50rem] w-[1.50rem] place-items-center rounded-full border border-[#6b421f] bg-[radial-gradient(circle_at_35%_35%,#f6c46c_0%,#b0752a_52%,#65401f_100%)] text-[0.92rem] text-[#2b1a0e] shadow-[0_1px_2px_rgba(0,0,0,0.28)]">
              ×
            </span>
          </button>
        ) : null}
      </section>
    </div>
  );
}

export { ZiiplyMobileCompareSelectionCard };
