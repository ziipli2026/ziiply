"use client";

// ZIIPLY_MOBILE_COMPARE_SELECTION_CARD_V3_MATCH_DETAILS_FIX
// Kauppakohtainen erittelykortti mobiilin vertailun Avaa-napille.
// Tärkeää: tämä tiedosto on oikea TSX-moduuli ja exporttaa default-komponentin.

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
  storePrices?: Record<string, number | string | undefined>;
  [key: string]: any;
};

export type ZiiplyMobileCompareSelectionCardProps = {
  open?: boolean;
  store: ZiiplyCompareSelectionStore;
  items?: unknown[];
  isBest?: boolean;
  onBack?: () => void;
  onSelectStore?: () => void;
  onClose?: () => void;
  className?: string;
};

const cooperFont = '"Cooper Black", "Cooper Std Black", Georgia, serif';
const copperplateFont = '"Copperplate", "Baskerville", Georgia, serif';
const serifFont = '"Baskerville", Georgia, serif';

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

  // Match-rakenteessa price on yksikköhinta ja quantity rivin määrä.
  // Näytetään rivin yhteishinta, jotta summa vastaa kaupan kokonaishintaa.
  if (typeof data?.price === "number" && Number.isFinite(data.price)) {
    return data.price * getItemQuantity(data);
  }

  return storeSpecific ?? data?.selectedPrice ?? data?.price ?? data?.cheapestPrice;
}

export default function ZiiplyMobileCompareSelectionCard({
  open = true,
  store,
  items = [],
  isBest = false,
  onBack,
  onSelectStore,
  onClose,
  className = "",
}: ZiiplyMobileCompareSelectionCardProps) {
  if (!open) return null;

  const rows = ((store.matches && store.matches.length > 0 ? store.matches : items) || []) as ZiiplyCompareSelectionItem[];

  return (
    <div
      className={`fixed inset-0 z-[94] flex items-start justify-center bg-[#eef7f2]/98 px-2 pb-[calc(env(safe-area-inset-bottom)+5.95rem)] pt-[calc(env(safe-area-inset-top)+0.45rem)] backdrop-blur-md sm:hidden ${className}`}
    >
      <section className="relative flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-6.9rem)] max-h-[46rem] min-h-[31rem] w-full max-w-[28rem] flex-col overflow-hidden rounded-[2.1rem] border-[5px] border-[#3b2414] bg-[linear-gradient(135deg,#2a170e_0%,#5a3720_45%,#2a170e_100%)] shadow-[0_12px_0_rgba(35,23,13,0.28),0_24px_52px_rgba(0,0,0,0.30)]">
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

        <header className="relative z-10 shrink-0 px-5 pb-1 pt-[7.65rem]">
          <div className="mb-2 px-1">
            <div
              className="text-[0.52rem] font-black uppercase tracking-[0.24em] text-[#665d45]/86"
              style={{ fontFamily: copperplateFont }}
            >
              Kaupan erittely
            </div>
            <div
              className="mt-0.5 truncate text-[1.20rem] font-black italic leading-none text-[#28402a] drop-shadow-[0_1px_0_rgba(255,247,211,0.62)]"
              style={{ fontFamily: cooperFont }}
            >
              {store.name}
            </div>
            <div className="mt-0.5 text-[0.70rem] font-extrabold text-[#5f5034]">
              {isBest ? "Huokein kokonaisuus" : "Kauppakohtainen kori"}
            </div>
          </div>
        </header>

        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="overflow-hidden rounded-[1.05rem] border-[2px] border-[#7c663d]/78 bg-[#fff4d8]/72 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.30),0_6px_14px_rgba(72,51,22,0.10)]">
            <div
              className="grid grid-cols-[minmax(0,1fr)_4.75rem] border-b-[1.5px] border-[#9b7b3d]/62 bg-[#efe0b8]/62 px-3 py-1.5 text-[0.52rem] font-black uppercase tracking-[0.14em] text-[#665d45]"
              style={{ fontFamily: copperplateFont }}
            >
              <span>Tuote</span>
              <span className="text-right">Hinta</span>
            </div>

            {rows.length === 0 ? (
              <div className="px-4 py-8 text-center text-[0.82rem] font-extrabold text-[#6b6048]">
                Tälle kaupalle ei löytynyt tuoterivejä vertailusta.
              </div>
            ) : (
              rows.map((item, index) => {
                const price = getItemPriceForStore(item, store.id);

                return (
                  <div
                    key={String(item.id ?? index)}
                    className="grid min-h-[2.72rem] grid-cols-[minmax(0,1fr)_4.75rem] items-center border-b border-[#d4bd86]/72 px-3 py-1.5"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate text-[0.82rem] font-black leading-tight text-[#233020]">
                        {getItemName(item)}
                      </div>
                      <div className="mt-0.5 text-[0.52rem] font-black uppercase tracking-[0.08em] text-[#6e6d55]">
                        #{index + 1} · {getItemQuantity(item)} kpl
                      </div>
                    </div>

                    <div
                      className="whitespace-nowrap text-right text-[0.92rem] font-black italic text-[#3e301c]"
                      style={{ fontFamily: serifFont }}
                    >
                      {formatComparePrice(price)}
                    </div>
                  </div>
                );
              })
            )}

            <div className="grid grid-cols-[minmax(0,1fr)_5.25rem] items-center border-t-[2px] border-[#9b7b3d]/62 bg-[#fff7df]/72 px-3 py-2">
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

        <footer className="relative z-20 grid shrink-0 grid-cols-[1fr_1fr] gap-2 px-5 pb-[0.78rem] pt-2">
          <button
            type="button"
            onClick={onBack}
            className="min-h-[2.46rem] rounded-[1.0rem] border-[3px] border-[#7c663d] bg-[#efe1bd] px-3 text-[0.70rem] font-black uppercase tracking-[0.04em] text-[#28402a] shadow-[0_0_0_2px_#f8edcf_inset] active:translate-y-[1px]"
          >
            Takaisin
          </button>

          <button
            type="button"
            onClick={onSelectStore}
            className="min-h-[2.46rem] rounded-[1.0rem] border-[3px] border-[#0b6330] bg-[linear-gradient(180deg,#139143_0%,#087237_100%)] px-2 text-[0.70rem] font-black uppercase tracking-[0.03em] text-[#fff0d5] shadow-[0_0_0_2px_rgba(255,255,255,0.18)_inset,0_3px_0_#064a26] active:translate-y-[1px]"
          >
            Valitse
          </button>
        </footer>

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
