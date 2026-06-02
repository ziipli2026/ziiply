"use client";

// ZIIPLY_MOBILE_COMPARE_CARD_RESPONSIVE_V21_RETRO_MOPED_LOADER
// Päävertailu muutettu mobiilille: isot kauppakortit, isot AVAA KORI / VALITSE -napit,
// loading-rakenne näkyy heti oikean näköisenä. Visuaalinen linja pysyy Ziiplyn paperi/retro-maailmassa.

import React, { useState } from "react";
import ZiiplyMobileCompareSelectionCard from "./ZiiplyMobileCompareSelectionCard";

export type ZiiplyCompareStore = {
  id: string;
  name: string;
  chain?: "S" | "K";
  totalPrice?: number;
  itemCount?: number;
  savingsVsHighest?: number;
  distanceKm?: number;
  badge?: string;
  isBest?: boolean;
  matches?: unknown[];
  missingItems?: number;
};

export type ZiiplyMobileCompareCardresponsiveProps = {
  open?: boolean;
  stores: ZiiplyCompareStore[];
  items?: unknown[];
  title?: string;
  subtitle?: string;
  loading?: boolean;
  onSelectStore?: (storeId: string) => void;
  onBack?: () => void;
  onBackToCart?: () => void;
  onOpenStore?: (storeId: string) => void; // säilytetty yhteensopivuuden vuoksi, mobiili käyttää sisäistä erittelykorttia
  onChangeItemQuantity?: (match: unknown, delta: number) => void;
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

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatEuro(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  // chainResults.totalPrice tulee yleensä sentteinä. Jos joskus tulee suoraan euroina, alle 20 käsitellään euroina.
  const euros = Math.abs(value) > 20 ? value / 100 : value;
  return `${euros.toFixed(2).replace(".", ",")} €`;
}

function getCheapestStore(stores: ZiiplyCompareStore[]) {
  return [...stores]
    .filter((store) => typeof store.totalPrice === "number")
    .sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0))[0];
}

function formatEuroCents(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value / 100).toFixed(2).replace(".", ",")} €`;
}

function getStorePriceDiff(store: ZiiplyCompareStore, cheapest?: ZiiplyCompareStore) {
  if (!cheapest || store.totalPrice == null || cheapest.totalPrice == null) return null;
  const diff = store.totalPrice - cheapest.totalPrice;
  if (Math.abs(diff) < 0.001) return "Huokein";
  // chainResults.totalPrice ja diff ovat senttejä. Käytä tässä aina senttimuotoilua,
  // jotta +6 senttiä näkyy +0,06 € eikä +6,00 €.
  return `+${formatEuroCents(diff)} kalliimpi`;
}

function getChainLabel(chain?: "S" | "K") {
  if (chain === "S") return "S";
  if (chain === "K") return "K";
  return "–";
}

function StoreLoadingCard({ index }: { index: number }) {
  const chain = index === 0 ? "S" : "K";
  const best = index === 0;

  return (
    <article
      className={[
        "relative overflow-hidden rounded-[1.18rem] border-[2.5px] px-3.5 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.30),0_6px_14px_rgba(72,51,22,0.10)]",
        best
          ? "border-[#0b6330] bg-[#ecf3d5]/70"
          : "border-[#7c663d]/76 bg-[#fff8e5]/70",
      ].join(" ")}
      aria-label="Haetaan vertailua"
    >
      <div className="grid grid-cols-[2.58rem_minmax(0,1fr)_5.20rem] gap-3">
        <div
          className={[
            "mt-1 grid h-9 w-9 place-items-center rounded-full border-[2px] text-[1.00rem] font-black shadow-[0_2px_3px_rgba(40,28,12,0.18)]",
            chain === "K"
              ? "border-[#7e1418]/55 bg-[#c71d24]/38 text-[#fff6d7]/82"
              : "border-[#0b6330]/55 bg-[#0b8f3a]/38 text-[#fff6d7]/82",
          ].join(" ")}
        >
          {chain}
        </div>

        <div className="min-w-0">
          <div className="h-[1.38rem] w-[86%] rounded-full bg-[#d1bb7d]/48" />
          <div className="mt-2 h-[0.72rem] w-[58%] rounded-full bg-[#d1bb7d]/42" />
          <div className="mt-2.5 h-[1.45rem] w-[5.35rem] rounded-[0.45rem] bg-[#d1bb7d]/40" />
        </div>

        <div className="ml-auto mt-2 h-[1.55rem] w-[4.95rem] rounded-full bg-[#d1bb7d]/46" />
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div className="min-h-[2.46rem] rounded-[0.82rem] border-[3px] border-[#0b6330]/45 bg-[#0b8f3a]/30 shadow-[0_0_0_2px_rgba(255,255,255,0.12)_inset]" />
        <div className="min-h-[2.46rem] rounded-[0.82rem] border-[3px] border-[#7c663d]/55 bg-[#efe1bd]/56 shadow-[0_0_0_2px_rgba(248,237,207,0.55)_inset]" />
      </div>

      {index === 0 ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden bg-[#fff6d8]/10">
          <div className="ziiply-moped-loader absolute left-0 top-[43%] flex -translate-y-1/2 items-end gap-2">
            <div className="ziiply-moped-dust mb-2 h-[0.18rem] w-12 rounded-full bg-[#7c663d]/38" />

            <div className="relative h-11 w-[6.4rem] text-[#28402a] drop-shadow-[0_1px_1px_rgba(44,28,8,0.22)]">
              <div className="absolute bottom-[0.10rem] left-[0.45rem] h-5 w-5 rounded-full border-[3px] border-current bg-[#fff4d8]/40" />
              <div className="absolute bottom-[0.10rem] right-[0.56rem] h-5 w-5 rounded-full border-[3px] border-current bg-[#fff4d8]/40" />
              <div className="absolute bottom-[0.88rem] left-[1.18rem] h-[0.22rem] w-[3.55rem] rotate-[-8deg] rounded-full bg-current" />
              <div className="absolute bottom-[1.18rem] left-[2.02rem] h-[0.22rem] w-[2.6rem] rotate-[18deg] rounded-full bg-current" />
              <div className="absolute bottom-[1.70rem] left-[2.45rem] h-[0.34rem] w-[1.62rem] rounded-full bg-current" />
              <div className="absolute bottom-[2.05rem] right-[1.18rem] h-[0.22rem] w-[1.12rem] rotate-[-22deg] rounded-full bg-current" />
              <div className="absolute bottom-[2.24rem] right-[0.90rem] h-[0.22rem] w-[0.58rem] rotate-[8deg] rounded-full bg-current" />
              <div className="absolute bottom-[2.42rem] left-[3.10rem] h-3.5 w-3 rounded-full bg-current" />
              <div className="absolute bottom-[1.42rem] left-[3.00rem] h-5 w-[0.48rem] rotate-[14deg] rounded-full bg-current" />
              <div className="absolute bottom-[2.98rem] left-[2.78rem] h-[0.30rem] w-4 rotate-[-8deg] rounded-full bg-current" />
              <div className="absolute bottom-[1.84rem] left-[0.35rem] h-6 w-7 rounded-[0.25rem] border-[2px] border-current bg-[#fff4d8]/52" />
              <div className="absolute bottom-[2.36rem] left-[0.58rem] h-[0.20rem] w-4 bg-current" />
            </div>

            <div
              className="mb-[-0.10rem] text-[0.86rem] font-black italic text-[#28402a]"
              style={{ fontFamily: cooperFont }}
            >
              Selvitetään...
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function ZiiplyMobileCompareCardresponsive({
  open = true,
  stores,
  items = [],
  title = "Vertailu",
  subtitle,
  loading = false,
  onSelectStore,
  onBack,
  onBackToCart,
  onChangeItemQuantity: _onChangeItemQuantity,
  onChangeMatchMode,
  onResetMatchMode: _onResetMatchMode,
  onClose,
  className = "",
}: ZiiplyMobileCompareCardresponsiveProps) {
  const [detailsStoreId, setDetailsStoreId] = useState<string | null>(null);

  if (!open) return null;

  const visibleStores = stores;
  const showSkeleton = loading || visibleStores.length === 0;
  const cheapest = getCheapestStore(visibleStores);
  const detailsStore = detailsStoreId ? visibleStores.find((store) => store.id === detailsStoreId) || null : null;
  const handleBack = onBack || onBackToCart;
  void handleBack;
  const comparedCount = items.length || visibleStores[0]?.itemCount || 0;

  if (detailsStore) {
    return (
      <ZiiplyMobileCompareSelectionCard
        open
        store={detailsStore}
        items={items}
        isBest={Boolean(detailsStore.isBest || cheapest?.id === detailsStore.id)}
        onBack={() => setDetailsStoreId(null)}
        onSelectStore={() => onSelectStore?.(detailsStore.id)}
        onChangeMatchMode={onChangeMatchMode}
        onClose={onClose}
      />
    );
  }

  return (
    <div
      className={`fixed inset-0 z-[92] flex items-start justify-center bg-[#eef7f2]/98 px-2 pb-[calc(env(safe-area-inset-bottom)+1.05rem)] pt-[calc(env(safe-area-inset-top)+0.45rem)] backdrop-blur-md sm:hidden ${className}`}
    >
      <section className="ziiply-mobile-compare-pop relative flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2.0rem)] max-h-[46rem] min-h-[31rem] w-full max-w-[28rem] flex-col overflow-hidden rounded-[2.1rem] border-[5px] border-[#3b2414] bg-[linear-gradient(135deg,#2a170e_0%,#5a3720_45%,#2a170e_100%)] shadow-[0_12px_0_rgba(35,23,13,0.28),0_24px_52px_rgba(0,0,0,0.30)]">
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

        <header className="relative z-10 shrink-0 px-5 pb-1 pt-[7.62rem]">
          <div className="mb-2 px-1">
            <div
              className="text-[0.52rem] font-black uppercase tracking-[0.24em] text-[#665d45]/86"
              style={{ fontFamily: copperplateFont }}
            >
              Hintavertailu
            </div>
            <div
              className="mt-0.5 text-[1.46rem] font-black italic leading-none text-[#28402a] drop-shadow-[0_1px_0_rgba(255,247,211,0.62)]"
              style={{ fontFamily: cooperFont }}
            >
              {title}
            </div>
            <div className="mt-0.5 text-[0.72rem] font-extrabold text-[#5f5034]">
              {subtitle || `${comparedCount || visibleStores.length} tuotetta / ${visibleStores.length} kauppaa`}
            </div>
          </div>
        </header>

        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-2.5">

            {showSkeleton ? (
              <>
                <StoreLoadingCard index={0} />
                <StoreLoadingCard index={1} />
              </>
            ) : visibleStores.length === 0 ? (
              <div className="flex min-h-[18rem] items-center justify-center rounded-[1.18rem] border-[2.5px] border-[#7c663d]/70 bg-[#fff4d8]/74 px-4 py-8 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28)]">
                <div>
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-[0.85rem] border-[2px] border-[#0b6330] bg-[#0b8f3a] text-[1.75rem] font-black text-[#fff6d7] shadow-[0_0_0_2px_rgba(255,255,255,0.18)_inset]">
                    ≋
                  </div>
                  <h3
                    className="mt-4 text-[1.38rem] font-black italic leading-none text-[#28402a]"
                    style={{ fontFamily: cooperFont }}
                  >
                    Ei vertailua
                  </h3>
                  <p className="mx-auto mt-3 max-w-[18rem] text-[0.82rem] font-extrabold leading-snug text-[#6b6048]">
                    Lisää tuotteita koriin, niin vertailu voidaan laskea.
                  </p>
                </div>
              </div>
            ) : (
              visibleStores.map((store, index) => {
                const isBest = Boolean(store.isBest || cheapest?.id === store.id);
                const diffLabel = getStorePriceDiff(store, cheapest);

                return (
                  <article
                    key={store.id}
                    className={cx(
                      "relative overflow-hidden rounded-[1.18rem] border-[2.5px] px-3.5 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.30),0_6px_14px_rgba(72,51,22,0.10)]",
                      isBest ? "border-[#0b6330] bg-[#ecf3d5]/82" : "border-[#7c663d]/76 bg-[#fff8e5]/72",
                    )}
                  >
                    <div className="grid grid-cols-[2.58rem_minmax(0,1fr)_5.20rem] gap-3">
                      <button
                        type="button"
                        onClick={() => setDetailsStoreId(store.id)}
                        className={cx(
                          "mt-1 grid h-9 w-9 place-items-center rounded-full border-[2px] text-[1.00rem] font-black shadow-[0_2px_3px_rgba(40,28,12,0.22)] active:scale-[0.96]",
                          store.chain === "K"
                            ? "border-[#7e1418] bg-[#c71d24] text-[#fff6d7]"
                            : store.chain === "S"
                              ? "border-[#0b6330] bg-[#0b8f3a] text-[#fff6d7]"
                              : "border-[#5a4427] bg-[#6f6045] text-[#fff6d7]",
                        )}
                        aria-label={`Avaa ${store.name}`}
                      >
                        {getChainLabel(store.chain)}
                      </button>

                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setDetailsStoreId(store.id)}
                          className="block max-w-full text-left"
                        >
                          <span className="block truncate text-[1.02rem] font-black leading-tight text-[#233020]">
                            {store.name}
                          </span>
                          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.64rem] font-black uppercase tracking-[0.07em] text-[#6e6d55]">
                            <span>#{index + 1}</span>
                            <span>·</span>
                            <span>{store.itemCount ?? comparedCount ?? 0} tuotetta</span>
                            {store.distanceKm != null ? (
                              <>
                                <span>·</span>
                                <span>{store.distanceKm.toFixed(1)} km</span>
                              </>
                            ) : null}
                          </span>
                        </button>

                        <div className="mt-2 min-h-[1.26rem]">
                          {diffLabel ? (
                            <span
                              className={cx(
                                "inline-flex rounded-[0.44rem] border-[1.5px] px-2 py-[0.12rem] text-[0.55rem] font-black uppercase tracking-[0.055em]",
                                isBest
                                  ? "border-[#0b6330] bg-[#0b8f3a] text-[#fff6d7]"
                                  : "border-[#b99d5c] bg-[#f4e7c7] text-[#6b6048]",
                              )}
                            >
                              {isBest ? "Paras hinta" : diffLabel}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setDetailsStoreId(store.id)}
                        className="min-w-0 pt-1 text-right"
                        aria-label={`Avaa ${store.name}`}
                      >
                        <span
                          className={cx(
                            "block whitespace-nowrap text-right text-[1.18rem] font-black italic leading-none",
                            isBest ? "text-[#0b7837]" : "text-[#3e301c]",
                          )}
                          style={{ fontFamily: serifFont }}
                        >
                          {formatEuro(store.totalPrice)}
                        </span>
                      </button>
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailsStoreId(store.id)}
                        className="min-h-[2.46rem] rounded-[0.82rem] border-[3px] border-[#0b6330] bg-[linear-gradient(180deg,#139143_0%,#087237_100%)] px-3 text-[0.72rem] font-black uppercase tracking-[0.04em] text-[#fff0d5] shadow-[0_0_0_2px_rgba(255,255,255,0.18)_inset,0_3px_0_#064a26] active:translate-y-[1px]"
                      >
                        Avaa kori
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectStore?.(store.id)}
                        className="min-h-[2.46rem] rounded-[0.82rem] border-[3px] border-[#7c663d] bg-[#efe1bd] px-3 text-[0.72rem] font-black uppercase tracking-[0.04em] text-[#28402a] shadow-[0_0_0_2px_#f8edcf_inset] active:translate-y-[1px] disabled:opacity-45"
                        disabled={!onSelectStore}
                      >
                        Valitse
                      </button>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </main>


        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-[0.78rem] top-[0.88rem] z-[35] grid h-[2.62rem] w-[2.86rem] place-items-center rounded-l-[0.8rem] rounded-r-[0.42rem] border-[2px] border-[#2b1a0e] bg-[linear-gradient(135deg,#7a4c2d_0%,#3b2414_78%)] text-[1.1rem] font-black leading-none text-[#f7e7bd] shadow-[0_3px_8px_rgba(0,0,0,0.25),inset_0_0_0_1px_rgba(255,214,139,0.18)] active:translate-y-[1px]"
            aria-label="Sulje vertailu"
            title="Sulje vertailu"
          >
            <span className="grid h-[1.50rem] w-[1.50rem] place-items-center rounded-full border border-[#6b421f] bg-[radial-gradient(circle_at_35%_35%,#f6c46c_0%,#b0752a_52%,#65401f_100%)] text-[0.92rem] text-[#2b1a0e] shadow-[0_1px_2px_rgba(0,0,0,0.28)]">
              ×
            </span>
          </button>
        ) : null}

        <style jsx>{`
          @keyframes ziiplyMobileComparePop {
            0% {
              opacity: 0;
              transform: translateY(18px) scale(0.965) rotate(-0.4deg);
            }
            58% {
              opacity: 1;
              transform: translateY(-3px) scale(1.01) rotate(0.2deg);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1) rotate(0deg);
            }
          }

          .ziiply-mobile-compare-pop {
            animation: ziiplyMobileComparePop 420ms cubic-bezier(0.2, 0.9, 0.25, 1.2);
          }


          @keyframes ziiplyMopedDrive {
            0% {
              opacity: 0;
              transform: translate(-7.5rem, -50%) scale(0.96);
            }
            12% {
              opacity: 1;
            }
            82% {
              opacity: 1;
            }
            100% {
              opacity: 0;
              transform: translate(18.5rem, -50%) scale(0.96);
            }
          }

          @keyframes ziiplyMopedDust {
            0%, 100% {
              opacity: 0.18;
              transform: translateX(0) scaleX(0.78);
            }
            50% {
              opacity: 0.50;
              transform: translateX(-0.25rem) scaleX(1.08);
            }
          }

          .ziiply-moped-loader {
            animation: ziiplyMopedDrive 3.15s cubic-bezier(0.18, 0.72, 0.24, 1) 1 both;
          }

          .ziiply-moped-dust {
            animation: ziiplyMopedDust 0.72s ease-in-out infinite;
          }

          @media (max-height: 720px) {
            .ziiply-mobile-compare-pop header {
              padding-top: 7.15rem;
            }
          }
        `}</style>
      </section>
    </div>
  );
}

export { ZiiplyMobileCompareCardresponsive as ZiiplyMobileCompareCard };
