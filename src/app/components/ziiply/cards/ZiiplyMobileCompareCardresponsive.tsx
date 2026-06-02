"use client";

// ZIIPLY_MOBILE_COMPARE_CARD_RESPONSIVE_V1
// Mobiilille erikseen skaalattu vertailukortti.
// - header / kauppalista / footer erotettu toisistaan
// - kauppalista scrollaa kortin sisällä
// - footer pysyy kortin alareunassa eikä leikkaannu
// - tekstit ja napit mahtuvat 390px iPhone-leveyteen
// - ulkoasu pidetty samassa paperivihko-linjassa kuin mobiilikori

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

export type ZiiplyMobileCompareCardresponsiveProps = {
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
    <article className="h-[5.2rem] animate-pulse rounded-[1.05rem] border-[2px] border-[#b9944d]/70 bg-[#fff4d8]/54 px-3 py-3">
      <div className="h-5 w-40 rounded-full bg-[#d1bb7d]" />
      <div className="mt-3 h-4 w-24 rounded-full bg-[#d1bb7d]" />
    </article>
  );
}

export function ZiiplyMobileCompareCardresponsive({
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
}: ZiiplyMobileCompareCardresponsiveProps) {
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
      <section className="ziiply-mobile-compare-pop relative flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-6.9rem)] max-h-[46rem] min-h-[31rem] w-full max-w-[28rem] flex-col overflow-hidden rounded-[2.1rem] border-[5px] border-[#3b2414] bg-[linear-gradient(135deg,#2a170e_0%,#5a3720_45%,#2a170e_100%)] shadow-[0_12px_0_rgba(35,23,13,0.28),0_24px_52px_rgba(0,0,0,0.30)]">
        <div
          className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[#f7edcf] bg-center bg-no-repeat opacity-100"
          style={{
            backgroundImage: "url('/ui/cart/vihkonen.webp')",
            backgroundSize: "142% 104%",
            backgroundPosition: "center top",
          }}
        />
        <div className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[linear-gradient(180deg,rgba(255,250,226,0.34),rgba(238,214,156,0.10))]" />
        <div className="pointer-events-none absolute inset-[0.42rem] rounded-[1.55rem] border border-dashed border-[#d6a861]/55 shadow-[inset_0_0_0_2px_rgba(27,17,9,0.20)]" />

        <header className="relative z-10 shrink-0 px-5 pb-1 pt-[3.92rem]">
          <div className="relative min-h-[4.35rem] border-b-[2px] border-[#9b7b3d]/60 pb-2">
            <div className="min-w-0 pr-[6.55rem]">
              <div
                className="text-[0.54rem] font-black uppercase tracking-[0.26em] text-[#605943]/78"
                style={{ fontFamily: copperplateFont }}
              >
                Hintavertailu
              </div>

              <h2
                className="mt-1 truncate text-[1.64rem] font-black italic leading-none text-[#28402a] drop-shadow-[0_1px_0_rgba(255,247,211,0.62)]"
                style={{ fontFamily: cooperFont }}
              >
                {title}
              </h2>

              <p className="mt-1 max-w-[13.2rem] truncate text-[0.70rem] font-extrabold text-[#5f5034]">
                {effectiveSubtitle}
              </p>
            </div>

            {cheapest ? (
              <button
                type="button"
                onClick={() => onSelectStore?.(cheapest.id)}
                disabled={!onSelectStore}
                className="absolute right-[0.05rem] top-[0.18rem] w-[5.95rem] rounded-[0.95rem] border-[3px] border-[#0b6330] bg-[linear-gradient(180deg,#139143_0%,#087237_100%)] px-2 py-1.5 text-center text-[#fff0d5] shadow-[0_0_0_2px_rgba(255,255,255,0.18)_inset,0_3px_0_#064a26] active:translate-y-[1px] disabled:opacity-55"
                title="Valitse huokein"
                aria-label="Valitse huokein"
              >
                <div className="text-[0.47rem] font-black uppercase tracking-[0.15em] opacity-90">
                  Huokein
                </div>
                <div className="mt-0.5 whitespace-nowrap text-[0.94rem] font-black leading-none">
                  {formatEuro(cheapest.totalPrice)}
                </div>
              </button>
            ) : null}
          </div>
        </header>

        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {loading ? (
            <div className="grid gap-2.5">
              {Array.from({ length: 4 }).map((_, index) => (
                <StoreSkeleton key={index} />
              ))}
            </div>
          ) : !hasStores ? (
            <div className="mt-4 flex min-h-[19rem] items-center justify-center rounded-[1.3rem] border-[2px] border-dashed border-[#9a7a3d] bg-[#fff4d4]/48 px-4 py-8 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
              <div>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-[1rem] border-[2px] border-[#0b6330] bg-[#0b8f3a] text-[1.75rem] font-black text-[#fff6d7] shadow-[0_0_0_2px_rgba(255,255,255,0.18)_inset]">
                  ≋
                </div>
                <h3
                  className="mt-4 text-[1.45rem] font-black italic leading-none text-[#28402a]"
                  style={{ fontFamily: cooperFont }}
                >
                  Ei vielä vertailua
                </h3>
                <p className="mx-auto mt-3 max-w-[18rem] text-[0.82rem] font-extrabold leading-snug text-[#6b6048]">
                  Lisää tuotteita koriin, niin Gösta ja Justiina voivat vertailla korin eri kaupoissa.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-2.25">
              {stores.map((store, index) => {
                const isBest = Boolean(store.isBest || (cheapest && cheapest.id === store.id));
                const chainBadge = getChainBadge(store.chain);

                return (
                  <article
                    key={store.id}
                    className={cx(
                      "relative min-h-[5.65rem] overflow-hidden rounded-[1.18rem] border-[2.5px] px-3 py-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.34),0_6px_12px_rgba(72,51,22,0.12)]",
                      isBest
                        ? "border-[#0b6330] bg-[#e0f1d5]/82 text-[#20301f]"
                        : "border-[#7c663d] bg-[#fff4d8]/72 text-[#20301f]",
                    )}
                  >
                    {isBest ? (
                      <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-[#11873a]/10" />
                    ) : null}

                    <div className="grid grid-cols-[2.15rem_minmax(0,1fr)_5.2rem] items-start gap-2.5">
                      <span
                        className={`mt-[0.12rem] grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 text-[0.92rem] font-black ${chainBadge.className}`}
                      >
                        {chainBadge.label}
                      </span>

                      <div className="min-w-0">
                        <h3 className="truncate text-[0.98rem] font-black leading-tight text-[#233020]">
                          {store.name}
                        </h3>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.58rem] font-black uppercase tracking-[0.07em] text-[#6e6d55]">
                          <span>#{index + 1}</span>
                          {store.distanceKm != null ? <span>{store.distanceKm.toFixed(1)} km</span> : null}
                          {store.itemCount != null ? <span>{store.itemCount} tuotetta</span> : null}
                        </div>

                        <div className="mt-1.5 flex min-h-[1.28rem] flex-wrap items-center gap-1.5">
                          {isBest ? (
                            <span className="rounded-full border-2 border-[#0b6330] bg-[#0b8f3a] px-2.5 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.08em] text-[#fff6d7]">
                              Paras
                            </span>
                          ) : null}

                          {store.badge && !isBest ? (
                            <span className="max-w-[6.2rem] truncate rounded-full border-2 border-[#b99d5c] bg-[#f4e7c7] px-2.5 py-0.5 text-[0.58rem] font-black uppercase tracking-[0.08em] text-[#6b6048]">
                              {store.badge}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div
                        className={cx(
                          "whitespace-nowrap pt-[0.06rem] text-right text-[1.16rem] font-black italic leading-none",
                          isBest ? "text-[#0b7837]" : "text-[#3e301c]",
                        )}
                        style={{ fontFamily: serifFont }}
                      >
                        {formatEuro(store.totalPrice)}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-[minmax(0,1fr)_4.75rem] gap-2">
                      <button
                        type="button"
                        onClick={() => onSelectStore?.(store.id)}
                        className="min-h-[2.14rem] rounded-[0.78rem] border-[3px] border-[#0b6330] bg-[linear-gradient(180deg,#139143_0%,#087237_100%)] px-3 text-[0.70rem] font-black uppercase tracking-[0.04em] text-[#fff0d5] shadow-[0_0_0_2px_rgba(255,255,255,0.18)_inset,0_3px_0_#064a26] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-45"
                        disabled={!onSelectStore}
                      >
                        Valitse
                      </button>

                      <button
                        type="button"
                        onClick={() => onOpenStore?.(store.id)}
                        className="min-h-[2.14rem] rounded-[0.78rem] border-[3px] border-[#7c663d] bg-[#efe1bd] px-2 text-[0.70rem] font-black uppercase tracking-[0.04em] text-[#28402a] shadow-[0_0_0_2px_#f8edcf_inset] active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-45"
                        disabled={!onOpenStore}
                      >
                        Avaa
                      </button>
                    </div>
                  </article>
                );
              })}

              {items.length > 0 ? (
                <section className="rounded-[1.15rem] border-[2px] border-[#7c663d]/75 bg-[#fff4d8]/65 p-2.5 shadow-[0_0_0_1px_rgba(255,255,255,0.30)_inset]">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[0.58rem] font-black uppercase tracking-[0.17em] text-[#6e6d55]">
                      Tuotteet
                    </h3>
                    <span className="rounded-full border-2 border-[#b99d5c] bg-[#f4e7c7] px-2 py-0.5 text-[0.58rem] font-black text-[#6b6048]">
                      {items.length} riviä
                    </span>
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </main>

        <footer className="relative z-20 grid shrink-0 grid-cols-[1fr_1fr] gap-2 px-5 pb-[0.72rem] pt-2">
          <button
            type="button"
            onClick={onBackToCart}
            className="min-h-[2.78rem] rounded-[1.05rem] border-[3px] border-[#7c663d] bg-[#efe1bd] px-3 text-[0.75rem] font-black uppercase tracking-[0.04em] text-[#28402a] shadow-[0_0_0_2px_#f8edcf_inset] active:translate-y-[1px] disabled:opacity-45"
            disabled={!onBackToCart}
          >
            Takaisin
          </button>

          <button
            type="button"
            onClick={() => cheapest && onSelectStore?.(cheapest.id)}
            className="min-h-[2.78rem] rounded-[1.05rem] border-[3px] border-[#0b6330] bg-[linear-gradient(180deg,#139143_0%,#087237_100%)] px-2 text-[0.72rem] font-black uppercase tracking-[0.03em] text-[#fff0d5] shadow-[0_0_0_2px_rgba(255,255,255,0.18)_inset,0_3px_0_#064a26] active:translate-y-[1px] disabled:opacity-45"
            disabled={!cheapest || !onSelectStore}
          >
            Huokein
          </button>
        </footer>

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-[0.74rem] top-[1.03rem] z-[35] grid h-[2.45rem] w-[2.75rem] place-items-center rounded-l-[0.8rem] rounded-r-[0.42rem] border-[2px] border-[#2b1a0e] bg-[linear-gradient(135deg,#7a4c2d_0%,#3b2414_78%)] text-[1.1rem] font-black leading-none text-[#f7e7bd] shadow-[0_3px_8px_rgba(0,0,0,0.25),inset_0_0_0_1px_rgba(255,214,139,0.18)] active:translate-y-[1px]"
            aria-label="Sulje vertailu"
            title="Sulje vertailu"
          >
            <span className="grid h-[1.45rem] w-[1.45rem] place-items-center rounded-full border border-[#6b421f] bg-[radial-gradient(circle_at_35%_35%,#f6c46c_0%,#b0752a_52%,#65401f_100%)] text-[0.92rem] text-[#2b1a0e] shadow-[0_1px_2px_rgba(0,0,0,0.28)]">
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
              padding-top: 3.45rem;
            }
          }
        `}</style>
      </section>
    </div>
  );
}

// Alias helpottaa, jos page-importissa käytetään vanhaa komponenttinimeä.
export { ZiiplyMobileCompareCardresponsive as ZiiplyMobileCompareCard };

export default ZiiplyMobileCompareCardresponsive;
