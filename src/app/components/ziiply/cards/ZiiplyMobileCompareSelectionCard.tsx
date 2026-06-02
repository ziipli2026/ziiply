"use client";

// ZIIPLY_MOBILE_COMPARE_SELECTION_CARD_V12_PAPER_BACK_TAG
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
  storePrices?: Record<string, number | string | undefined>;
  product?: {
    id?: string | number;
    name?: string;
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
  store: ZiiplyCompareSelectionStore;
  items?: unknown[];
  isBest?: boolean;
  onBack?: () => void;
  onSelectStore?: () => void;
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

  return String(
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
  store,
  items = [],
  isBest = false,
  onBack,
  onSelectStore,
  onChangeMatchMode,
  onClose,
  className = "",
}: ZiiplyMobileCompareSelectionCardProps) {
  if (!open) return null;

  void onSelectStore;

  const rows = ((store.matches && store.matches.length > 0 ? store.matches : items) || []) as ZiiplyCompareSelectionItem[];

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

        <header className="relative z-10 shrink-0 px-5 pb-1 pt-[11.1rem]">
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
              {isBest ? "Huokein kokonaisuus" : "Kauppakohtainen kori"}
            </div>
          </div>
        </header>

        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-[1.9rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-2.5">
            {rows.length === 0 ? (
              <div className="rounded-[1.05rem] border-[2px] border-[#7c663d]/78 bg-[#fff4d8]/72 px-4 py-8 text-center text-[0.82rem] font-extrabold text-[#6b6048] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.30),0_6px_14px_rgba(72,51,22,0.10)]">
                Tälle kaupalle ei löytynyt tuoterivejä vertailusta.
              </div>
            ) : (
              rows.map((item, index) => {
                const price = getItemPriceForStore(item, store.id);
                const currentMode = getCurrentQualityMode(item);
                const image = getProductImage(item);

                return (
                  <article
                    key={String(item.id ?? item.product?.id ?? index)}
                    className="overflow-hidden rounded-[1.05rem] border-[2px] border-[#7c663d]/78 bg-[#fff4d8]/76 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.30),0_6px_14px_rgba(72,51,22,0.10)]"
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
                            #{index + 1} · {getItemQuantity(item)} kpl
                          </div>
                        </div>
                      </div>

                      <div
                        className="whitespace-nowrap text-right text-[0.98rem] font-black italic text-[#3e301c]"
                        style={{ fontFamily: serifFont }}
                      >
                        {formatComparePrice(price)}
                      </div>
                    </div>

                    {onChangeMatchMode ? (
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
            className="absolute left-[0.78rem] top-[0.88rem] z-[35] grid h-[2.76rem] w-[2.34rem] place-items-center rounded-b-[0.42rem] rounded-t-[0.22rem] border-[1.8px] border-[#7b5c2a] bg-[linear-gradient(180deg,#f5dfac_0%,#d6ad66_100%)] text-[#2b1a0e] shadow-[0_3px_7px_rgba(50,31,13,0.24),inset_0_0_0_1px_rgba(255,250,224,0.46)] active:translate-y-[1px]"
            aria-label="Palaa vertailuun"
            title="Palaa vertailuun"
          >
            <span className="absolute -top-[0.82rem] left-1/2 h-[0.95rem] w-[1px] -translate-x-1/2 bg-[#5a371c]" />
            <span className="absolute top-[0.22rem] h-[0.36rem] w-[0.36rem] rounded-full border border-[#7b5c2a] bg-[#fff2c7]" />
            <span className="mt-[0.34rem] text-[1.32rem] font-black leading-none">←</span>
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
