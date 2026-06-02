"use client";

// ZIIPLY_MOBILE_COMPARE_CARD_V1
// Mobiilin hintavertailukortti. Pohjana desktop ZiiplyCompareCard,
// mutta ulkoasu ja mitoitus sovitettu Ziiplyn mobiilikortteihin.

import React from "react";

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
};

export type ZiiplyCompareItem = {
  id: string;
  name: string;
  selectedStoreId?: string;
  selectedPrice?: number;
  cheapestStoreId?: string;
  cheapestPrice?: number;
  image?: string;
};

export type ZiiplyMobileCompareCardProps = {
  open?: boolean;
  stores: ZiiplyCompareStore[];
  items?: ZiiplyCompareItem[];
  title?: string;
  subtitle?: string;
  loading?: boolean;
  onSelectStore?: (storeId: string) => void;
  onBackToCart?: () => void;
  onOpenStore?: (storeId: string) => void;
  onClose?: () => void;
  className?: string;
};

const cooperFont = '"Cooper Black", "Cooper Std Black", Georgia, serif';
const serifFont = '"Baskerville", Georgia, serif';
const copperplateFont = '"Copperplate", "Baskerville", Georgia, serif';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatEuro(cents?: number | null) {
  if (cents == null || Number.isNaN(cents)) return "—";
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

function getCheapestStore(stores: ZiiplyCompareStore[]) {
  return [...stores]
    .filter((store) => typeof store.totalPrice === "number")
    .sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0))[0];
}

function getChainBadge(chain?: "S" | "K") {
  if (chain === "S") {
    return {
      label: "S",
      className: "border-[#075a2a] bg-[#0b8f3a] text-[#fff6d7]",
    };
  }

  if (chain === "K") {
    return {
      label: "K",
      className: "border-[#7e1418] bg-[#c71d24] text-[#fff6d7]",
    };
  }

  return {
    label: "?",
    className: "border-[#5a4427] bg-[#6f6045] text-[#fff6d7]",
  };
}

function StoreSkeleton() {
  return (
    <article className="animate-pulse rounded-[1.45rem] border-[2px] border-[#caa965] bg-[#fff4d8]/86 p-3 shadow-[0_0_0_1.5px_rgba(255,255,255,0.42)_inset]">
      <div className="h-5 w-36 rounded-full bg-[#d1bb7d]" />
      <div className="mt-3 h-4 w-24 rounded-full bg-[#d1bb7d]" />
      <div className="mt-5 h-8 w-32 rounded-full bg-[#d1bb7d]" />
    </article>
  );
}

export function ZiiplyMobileCompareCard({
  open = true,
  stores,
  items = [],
  title = "Vertailu",
  subtitle,
  loading,
  onSelectStore,
  onBackToCart,
  onOpenStore,
  onClose,
  className = "",
}: ZiiplyMobileCompareCardProps) {
  if (!open) return null;

  const cheapest = getCheapestStore(stores);
  const hasStores = stores.length > 0;
  const effectiveSubtitle =
    subtitle ||
    (hasStores
      ? `${stores.length} kauppaa vertailtu`
      : "Lisää tuotteita koriin ja vertaile lähikauppojen hintoja.");

  return (
    <div
      className={`fixed inset-0 z-[92] flex items-start justify-center bg-[#eef7f2]/98 px-2 pb-[calc(env(safe-area-inset-bottom)+5.95rem)] pt-[calc(env(safe-area-inset-top)+0.45rem)] backdrop-blur-md sm:hidden ${className}`}
    >
      <section className="ziiply-mobile-compare-pop relative flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-6.9rem)] max-h-[46rem] min-h-[31rem] w-full max-w-[28rem] flex-col overflow-hidden rounded-[2.1rem] border-[5px] border-[#3b2414] bg-[linear-gradient(135deg,#2a170e_0%,#5a3720_45%,#2a170e_100%)] p-[0.34rem] shadow-[0_12px_0_rgba(35,23,13,0.28),0_24px_52px_rgba(0,0,0,0.30)]">
        <div className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[#f7edcf]" />
        <div className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] opacity-65 [background-image:radial-gradient(#c7aa67_1px,transparent_1px)] [background-size:15px_15px]" />
        <div className="pointer-events-none absolute inset-[0.42rem] rounded-[1.55rem] border border-dashed border-[#d6a861]/55 shadow-[inset_0_0_0_2px_rgba(27,17,9,0.20)]" />

        <header className="relative z-10 shrink-0 px-4 pb-2 pt-4">
          <div className="rounded-[1.55rem] border-[3px] border-[#7c663d] bg-[#fff4d8]/94 px-4 py-3 shadow-[0_0_0_2px_#f8e8bd_inset,0_5px_12px_rgba(72,51,22,0.15)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div
                  className="text-[0.62rem] font-black uppercase tracking-[0.24em] text-[#6e6d55]"
                  style={{ fontFamily: copperplateFont }}
                >
                  Hintavertailu
                </div>
                <h2
                  className="mt-1 truncate text-[1.78rem] font-black italic leading-none text-[#28402a] drop-shadow-[0_1px_0_rgba(255,247,211,0.65)]"
                  style={{ fontFamily: cooperFont }}
                >
                  {title}
                </h2>
                <p className="mt-2 line-clamp-2 text-[0.76rem] font-extrabold leading-snug text-[#6b6048]">
                  {effectiveSubtitle}
                </p>
              </div>

              {cheapest ? (
                <button
                  type="button"
                  onClick={() => onSelectStore?.(cheapest.id)}
                  disabled={!onSelectStore}
                  className="shrink-0 rounded-[1.1rem] border-[3px] border-[#0f7d37] bg-[#11873a] px-3 py-2 text-right text-[#fff6d7] shadow-[0_0_0_2px_#41ad62_inset] active:scale-[0.98] disabled:opacity-55"
                  title="Valitse huokein"
                  aria-label="Valitse huokein"
                >
                  <div className="text-[0.55rem] font-black uppercase tracking-[0.15em] opacity-85">
                    Huokein
                  </div>
                  <div className="mt-0.5 whitespace-nowrap text-[1.05rem] font-black leading-none">
                    {formatEuro(cheapest.totalPrice)}
                  </div>
                </button>
              ) : null}
            </div>
          </div>
        </header>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loading ? (
            <div className="grid gap-3 pt-1">
              {Array.from({ length: 4 }).map((_, index) => (
                <StoreSkeleton key={index} />
              ))}
            </div>
          ) : !hasStores ? (
            <div className="flex min-h-[19rem] items-center justify-center rounded-[1.7rem] border-[3px] border-dashed border-[#aa8c4d] bg-[#fff4d8]/86 p-6 text-center shadow-[0_0_0_2px_#f8e8bd_inset]">
              <div>
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-[1.35rem] border-[3px] border-[#7c663d] bg-[#11873a] text-[2rem] font-black text-[#fff6d7] shadow-[0_0_0_2px_#41ad62_inset]">
                  ≋
                </div>
                <h3
                  className="mt-5 text-[1.7rem] font-black italic leading-none text-[#28402a]"
                  style={{ fontFamily: cooperFont }}
                >
                  Ei vielä vertailua
                </h3>
                <p className="mx-auto mt-3 max-w-[18rem] text-[0.86rem] font-extrabold leading-snug text-[#6b6048]">
                  Lisää tuotteita koriin, niin Gösta ja Justiina voivat vertailla korin eri kaupoissa.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 pt-1">
              {stores.map((store, index) => {
                const isBest = store.isBest || (cheapest && cheapest.id === store.id);
                const chainBadge = getChainBadge(store.chain);

                return (
                  <article
                    key={store.id}
                    className={cx(
                      "relative overflow-hidden rounded-[1.55rem] border-[3px] p-3 shadow-[0_0_0_2px_rgba(255,255,255,0.35)_inset,0_8px_15px_rgba(72,51,22,0.16)]",
                      isBest
                        ? "border-[#0f7d37] bg-[#dff3d8] text-[#20301f]"
                        : "border-[#7c663d] bg-[#fff4d8] text-[#20301f]",
                    )}
                  >
                    {isBest ? (
                      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#11873a]/12" />
                    ) : null}

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-[0.92rem] font-black ${chainBadge.className}`}
                          >
                            {chainBadge.label}
                          </span>
                          <div className="min-w-0">
                            <h3 className="truncate text-[1.08rem] font-black leading-tight text-[#233020]">
                              {store.name}
                            </h3>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.62rem] font-black uppercase tracking-[0.07em] text-[#6e6d55]">
                              <span>#{index + 1}</span>
                              {store.distanceKm != null ? <span>{store.distanceKm.toFixed(1)} km</span> : null}
                              {store.itemCount != null ? <span>{store.itemCount} tuotetta</span> : null}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          {isBest ? (
                            <span className="rounded-full border-2 border-[#0f7d37] bg-[#11873a] px-2.5 py-0.5 text-[0.62rem] font-black uppercase tracking-[0.08em] text-[#fff6d7]">
                              Paras
                            </span>
                          ) : null}
                          {store.badge && !isBest ? (
                            <span className="rounded-full border-2 border-[#b99d5c] bg-[#f4e7c7] px-2.5 py-0.5 text-[0.62rem] font-black uppercase tracking-[0.08em] text-[#6b6048]">
                              {store.badge}
                            </span>
                          ) : null}
                          {store.savingsVsHighest != null && store.savingsVsHighest > 0 ? (
                            <span className="rounded-full border-2 border-[#c99844] bg-[#fff0c7] px-2.5 py-0.5 text-[0.62rem] font-black uppercase tracking-[0.08em] text-[#8a5a1e]">
                              Säästö {formatEuro(store.savingsVsHighest)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <div
                          className={cx(
                            "whitespace-nowrap text-[1.48rem] font-black italic leading-none",
                            isBest ? "text-[#0f7d37]" : "text-[#3e301c]",
                          )}
                          style={{ fontFamily: serifFont }}
                        >
                          {formatEuro(store.totalPrice)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectStore?.(store.id)}
                        className="min-h-[2.45rem] rounded-[1rem] border-[3px] border-[#0f7d37] bg-[#11873a] px-3 text-[0.74rem] font-black uppercase tracking-[0.04em] text-[#fff6d7] shadow-[0_0_0_2px_#41ad62_inset] active:scale-[0.98] disabled:opacity-45"
                        disabled={!onSelectStore}
                      >
                        Valitse
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenStore?.(store.id)}
                        className="min-h-[2.45rem] rounded-[1rem] border-[3px] border-[#7c663d] bg-[#efe1bd] px-3 text-[0.74rem] font-black uppercase tracking-[0.04em] text-[#28402a] shadow-[0_0_0_2px_#f8edcf_inset] active:scale-[0.98] disabled:opacity-45"
                        disabled={!onOpenStore}
                      >
                        Avaa
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {items.length > 0 ? (
            <section className="mt-3 rounded-[1.55rem] border-[3px] border-[#7c663d] bg-[#fff4d8]/92 p-3 shadow-[0_0_0_2px_#f8e8bd_inset]">
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-[#6e6d55]">
                  Tuotteet
                </h3>
                <span className="rounded-full border-2 border-[#b99d5c] bg-[#f4e7c7] px-2.5 py-0.5 text-[0.62rem] font-black text-[#6b6048]">
                  {items.length} riviä
                </span>
              </div>

              <div className="grid gap-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[1.1rem] border-2 border-[#d4b978] bg-[#f8edcf] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-[0.8rem] font-black text-[#233020]">
                        {item.name}
                      </div>
                      <div className="mt-0.5 text-[0.66rem] font-black text-[#6b6048]">
                        Halvin {formatEuro(item.cheapestPrice)}
                      </div>
                    </div>
                    <div className="whitespace-nowrap text-right text-[0.86rem] font-black text-[#11873a]">
                      {formatEuro(item.selectedPrice)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <footer className="relative z-10 grid shrink-0 grid-cols-2 gap-2 px-4 pb-4 pt-2">
          <button
            type="button"
            onClick={onBackToCart}
            className="min-h-[3rem] rounded-[1.15rem] border-[3px] border-[#7c663d] bg-[#efe1bd] px-3 text-[0.78rem] font-black uppercase tracking-[0.04em] text-[#28402a] shadow-[0_0_0_2px_#f8edcf_inset] active:scale-[0.98] disabled:opacity-45"
            disabled={!onBackToCart}
          >
            Takaisin
          </button>

          <button
            type="button"
            onClick={() => cheapest && onSelectStore?.(cheapest.id)}
            className="min-h-[3rem] rounded-[1.15rem] border-[3px] border-[#0f7d37] bg-[#11873a] px-3 text-[0.78rem] font-black uppercase tracking-[0.04em] text-[#fff6d7] shadow-[0_0_0_2px_#41ad62_inset] active:scale-[0.98] disabled:opacity-45"
            disabled={!cheapest || !onSelectStore}
          >
            Valitse huokein
          </button>
        </footer>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-[0.86rem] top-[0.86rem] z-30 grid h-[2.3rem] w-[2.3rem] place-items-center rounded-full border-[2px] border-[#2b1a0e] bg-[linear-gradient(135deg,#7a4c2d_0%,#3b2414_78%)] text-[1rem] font-black leading-none text-[#f7e7bd] shadow-[0_3px_8px_rgba(0,0,0,0.25),inset_0_0_0_1px_rgba(255,214,139,0.18)] active:translate-y-[1px]"
            aria-label="Sulje vertailu"
            title="Sulje vertailu"
          >
            ×
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
        `}</style>
      </section>
    </div>
  );
}

export default ZiiplyMobileCompareCard;
