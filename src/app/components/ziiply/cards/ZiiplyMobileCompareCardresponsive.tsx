"use client";

// ZIIPLY_MOBILE_COMPARE_CARDRESPONSIVE_V45_BUILD_FIX_FINAL_LAYOUT
// Päävertailu muutettu mobiilille: isot kauppakortit, isot AVAA KORI / VALITSE -napit,
// loading-rakenne näkyy heti oikean näköisenä. Visuaalinen linja pysyy Ziiplyn paperi/retro-maailmassa.

import React, { useEffect, useState } from "react";
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
  onShareStore?: (storeId: string) => void;
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
  const chain = index === 0 ? "K" : "S";
  const best = index === 0;

  return (
    <article
      className={cx(
        "relative overflow-hidden rounded-[1.18rem] border-[2.5px] px-3.5 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.30),0_6px_14px_rgba(72,51,22,0.10)]",
        best ? "border-[#0b6330] bg-[#ecf3d5]/70" : "border-[#7c663d]/76 bg-[#fff8e5]/70",
      )}
      aria-label="Haetaan vertailua"
    >
      <div className="grid grid-cols-[2.35rem_minmax(0,1fr)_3.45rem] gap-3">
        <div
          className={cx(
            "mt-1 grid h-9 w-9 place-items-center rounded-full border-[2px] text-[1.00rem] font-black shadow-[0_2px_3px_rgba(40,28,12,0.14)]",
            chain === "K"
              ? "border-[#7e1418] bg-[#c71d24] text-[#fff6d7]"
              : "border-[#0b6330] bg-[#0b8f3a] text-[#fff6d7]",
          )}
        >
          {chain}
        </div>

        {index === 0 ? (
          <div
            className="absolute left-[12.75rem] top-[0.95rem] z-10 text-[0.72rem] font-black italic tracking-[0.02em] text-[#28402a]/86"
            style={{ fontFamily: cooperFont }}
          >
            Haetaan...
          </div>
        ) : null}

        <div className="min-w-0">
          <span className="block truncate text-[0.92rem] font-black leading-tight text-transparent">
            Kaupan nimi
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.64rem] font-black uppercase tracking-[0.07em] text-transparent">
            <span>#1</span>
            <span>·</span>
            <span>2 tuotetta</span>
          </span>

          <div className="mt-2 min-h-[1.26rem]">
            <span
              className={cx(
                "inline-flex rounded-[0.44rem] border-[1.5px] px-2 py-[0.12rem] text-[0.55rem] font-black uppercase tracking-[0.055em]",
                best
                  ? "border-[#0b6330] bg-[#0b8f3a] text-transparent"
                  : "border-[#b99d5c] bg-[#f4e7c7] text-transparent",
              )}
            >
              Paras hinta
            </span>
          </div>
        </div>

        <div
          className={cx(
            "block whitespace-nowrap pt-1 text-right text-[1.00rem] font-black italic leading-none text-transparent",
            best ? "text-transparent" : "text-transparent",
          )}
          style={{ fontFamily: serifFont }}
        >
          0,00 €
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div className="min-h-[2.46rem] rounded-[0.82rem] border-[3px] border-[#0b6330] bg-[linear-gradient(180deg,#139143_0%,#087237_100%)] px-3 shadow-[0_0_0_2px_rgba(255,255,255,0.18)_inset,0_3px_0_#064a26]" />
        <div className="min-h-[2.46rem] rounded-[0.82rem] border-[3px] border-[#7c663d] bg-[#efe1bd] px-3 shadow-[0_0_0_2px_#f8edcf_inset]" />
      </div>
    </article>
  );
}


function RetroMopedOverlay() {
  const [frame, setFrame] = useState({ x: -126, opacity: 0 });

  useEffect(() => {
    let raf = 0;
    const durationMs = 4300;
    const startedAt = window.performance.now();

    const tick = (now: number) => {
      const progress = ((now - startedAt) % durationMs) / durationMs;
      const x = -126 + progress * 252;

      const opacity =
        progress < 0.20
          ? progress / 0.20
          : progress > 0.86
            ? Math.max(0, (1 - progress) / 0.14)
            : 1;

      setFrame({ x, opacity: opacity * 0.98 });
      raf = window.requestAnimationFrame(tick);
    };

    raf = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pointer-events-none absolute left-[12.65rem] top-[11.28rem] z-[21] h-[5.25rem] w-[14.3rem] overflow-hidden">
      <img
        src="/icons/ziiply-retro-moped-loader.png?v=3"
        alt="Haetaan..."
        className="absolute top-0 h-[4.65rem] w-auto drop-shadow-[0_2px_2px_rgba(44,28,8,0.24)]"
        style={{
          transform: `translate3d(${frame.x}px, 0, 0)`,
          opacity: frame.opacity,
          willChange: "transform, opacity",
        }}
      />
    </div>
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
  onShareStore,
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

{showSkeleton ? <RetroMopedOverlay /> : null}

                <header className="pointer-events-none absolute left-[6.15rem] top-[11.95rem] z-20 w-[13.75rem]">
          <div
            className="text-[1.46rem] font-black italic leading-none text-[#28402a] drop-shadow-[0_1px_0_rgba(255,247,211,0.62)]"
            style={{ fontFamily: cooperFont }}
          >
            {title}
          </div>
          <div className="mt-[0.16rem] text-[0.72rem] font-extrabold text-[#5f5034]">
            {subtitle || `${comparedCount || visibleStores.length} tuotetta / ${visibleStores.length} kauppaa`}
          </div>
        </header>

        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-[14.85rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                    <div className="grid grid-cols-[2.35rem_minmax(0,1fr)_3.45rem] gap-3">
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
                          <span className="block truncate text-[0.92rem] font-black leading-tight text-[#233020]">
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
                            "block whitespace-nowrap text-right text-[1.00rem] font-black italic leading-none",
                            isBest ? "text-[#0b7837]" : "text-[#3e301c]",
                          )}
                          style={{ fontFamily: serifFont }}
                        >
                          {formatEuro(store.totalPrice)}
                        </span>
                      </button>
                    </div>

                    <div className="mt-2.5 grid grid-cols-[2.58rem_minmax(0,1fr)_2.30rem] items-center gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onBackToCart?.();
                        }}
                        className="grid h-[2.34rem] w-[2.58rem] place-items-center rounded-l-[0.42rem] rounded-r-[0.82rem] border-[2px] border-[#2b1a0e] bg-[linear-gradient(135deg,#7a4c2d_0%,#3b2414_78%)] text-[#f7e7bd] shadow-[0_3px_8px_rgba(0,0,0,0.22),inset_0_0_0_1px_rgba(255,214,139,0.18)] active:translate-y-[1px]"
                        aria-label="Takaisin"
                        title="Takaisin"
                      >
                        <span className="grid h-[1.42rem] w-[1.42rem] place-items-center rounded-full border border-[#6b421f] bg-[radial-gradient(circle_at_35%_35%,#f6c46c_0%,#b0752a_52%,#65401f_100%)] text-[1rem] text-[#2b1a0e] shadow-[0_1px_2px_rgba(0,0,0,0.28)]">
                          ←
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDetailsStoreId(store.id)}
                        className="min-h-[2.40rem] rounded-[0.72rem] border-[2.5px] border-[#496443] bg-[linear-gradient(180deg,#f3e8cc_0%,#dfcfaa_100%)] px-3 text-[0.72rem] font-black italic tracking-[0.03em] text-[#244525] shadow-[inset_0_0_0_1px_rgba(255,250,224,0.58),0_2px_4px_rgba(62,43,20,0.18)] active:translate-y-[1px]"
                        style={{ fontFamily: cooperFont }}
                      >
                        Muuta valintoja
                      </button>

                      {onShareStore ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            onShareStore(store.id);
                          }}
                          className="grid h-[2.22rem] w-[2.22rem] place-items-center rounded-[0.46rem] border-[1.6px] border-[#8b713d] bg-[linear-gradient(180deg,#f5e5bd_0%,#d6b875_100%)] text-[#51361a] shadow-[0_2px_5px_rgba(45,30,10,0.17),inset_0_0_0_1px_rgba(255,249,220,0.55)] active:translate-y-[1px]"
                          aria-label={`Jaa ${store.name} kori`}
                          title="Jaa kori"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 18"
                            className="h-[0.94rem] w-[1.12rem]"
                          >
                            <path
                              d="M2.5 3.5h19v11h-19z"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M3 4l9 6.5L21 4M3.2 14.2l6.1-5M20.8 14.2l-6.1-5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      ) : (
                        <span aria-hidden="true" className="block h-[2.22rem] w-[2.22rem]" />
                      )}
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

          @media (max-height: 720px) {
            .ziiply-mobile-compare-pop header {
              top: 11.55rem;
            }
          }
        `}</style>
      </section>
    </div>
  );
}

export { ZiiplyMobileCompareCardresponsive as ZiiplyMobileCompareCard };
