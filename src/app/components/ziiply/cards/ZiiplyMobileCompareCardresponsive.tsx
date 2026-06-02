"use client";

// ZIIPLY_MOBILE_COMPARE_CARD_RESPONSIVE_V4_LEDGER_TABLE
// Vertailu muutettu samaan maailmaan kuin mobiilikorin tavarainkeruuvihko:
// - ei moderneja isoja kauppakortteja
// - kaupat paperille riveinä kuin vanha hintavertailuluettelo
// - PARAS näkyy leimamaisena merkintänä
// - hinta oikeassa laidassa, kaupan tiedot vasemmalla
// - footer pysyy selkeänä ja peukalokäyttöisenä

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
  onOpenStore?: (storeId: string) => void;
  onClose?: () => void;
  className?: string;
};

const cooperFont = '"Cooper Black", "Cooper Std Black", Georgia, serif';
const copperplateFont = '"Copperplate", "Baskerville", Georgia, serif';
const serifFont = '"Baskerville", Georgia, serif';

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

function chainStamp(chain?: "S" | "K") {
  if (chain === "S") return "S";
  if (chain === "K") return "K";
  return "–";
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
  onClose,
  className = "",
}: ZiiplyMobileCompareCardresponsiveProps) {
  if (!open) return null;

  const cheapest = getCheapestStore(stores);
  const handleBack = onBack || onBackToCart;
  const comparedCount = items.length || stores[0]?.itemCount || 0;

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
        <div className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[linear-gradient(180deg,rgba(255,250,226,0.48),rgba(246,226,172,0.20)_34%,rgba(238,214,156,0.08))]" />
        <div className="pointer-events-none absolute inset-[0.42rem] rounded-[1.55rem] border border-dashed border-[#d6a861]/55 shadow-[inset_0_0_0_2px_rgba(27,17,9,0.20)]" />

        <header className="relative z-10 shrink-0 px-5 pb-1 pt-[3.72rem]">
          <div className="relative min-h-[4.55rem] border-b-[2px] border-[#9b7b3d]/62 pb-2">
            <div className="pointer-events-none absolute inset-x-[-0.2rem] top-[-0.35rem] h-[4.6rem] rounded-[1.05rem] bg-[#fff6d8]/42" />

            <div className="relative min-w-0 pr-[6.2rem]">
              <div
                className="text-[0.54rem] font-black uppercase tracking-[0.27em] text-[#665d45]/86"
                style={{ fontFamily: copperplateFont }}
              >
                Hintavertailu
              </div>

              <h2
                className="mt-1 text-[1.92rem] font-black italic leading-none text-[#28402a] drop-shadow-[0_1px_0_rgba(255,247,211,0.68)]"
                style={{ fontFamily: cooperFont }}
              >
                {title}
              </h2>

              <p className="mt-1 text-[0.76rem] font-extrabold text-[#5f5034]">
                {subtitle || `${comparedCount || stores.length} tuotetta / ${stores.length} kauppaa`}
              </p>
            </div>

            {cheapest ? (
              <button
                type="button"
                onClick={() => onSelectStore?.(cheapest.id)}
                disabled={!onSelectStore}
                className="absolute right-[0.02rem] top-[0.54rem] z-10 w-[5.55rem] rotate-[0.2deg] rounded-[0.78rem] border-[2.5px] border-[#0b6330] bg-[linear-gradient(180deg,#139143_0%,#087237_100%)] px-2 py-1.5 text-center text-[#fff0d5] shadow-[0_0_0_2px_rgba(255,255,255,0.18)_inset,0_3px_0_#064a26] active:translate-y-[1px] disabled:opacity-55"
                title="Valitse huokein"
                aria-label="Valitse huokein"
              >
                <div className="text-[0.45rem] font-black uppercase tracking-[0.15em] opacity-90">
                  Huokein
                </div>
                <div className="mt-0.5 whitespace-nowrap text-[0.90rem] font-black leading-none">
                  {formatEuro(cheapest.totalPrice)}
                </div>
              </button>
            ) : null}
          </div>
        </header>

        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="relative overflow-hidden rounded-[1.05rem] border-[2px] border-[#7c663d]/78 bg-[#fff4d8]/66 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.28),0_6px_14px_rgba(72,51,22,0.10)]">
            <div
              className="grid grid-cols-[2.15rem_minmax(0,1fr)_5.55rem] border-b-[1.5px] border-[#9b7b3d]/62 bg-[#efe0b8]/58 px-3 py-1.5 text-[0.52rem] font-black uppercase tracking-[0.14em] text-[#665d45]"
              style={{ fontFamily: copperplateFont }}
            >
              <span>K</span>
              <span>Kauppa</span>
              <span className="text-right">Yht.</span>
            </div>

            {loading ? (
              <div className="space-y-0">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="grid h-[3.9rem] animate-pulse grid-cols-[2.15rem_minmax(0,1fr)_5.55rem] items-center border-b border-[#d4bd86]/72 px-3"
                  >
                    <div className="h-8 w-8 rounded-full bg-[#d1bb7d]" />
                    <div>
                      <div className="h-4 w-36 rounded-full bg-[#d1bb7d]" />
                      <div className="mt-2 h-3 w-24 rounded-full bg-[#d1bb7d]" />
                    </div>
                    <div className="ml-auto h-5 w-20 rounded-full bg-[#d1bb7d]" />
                  </div>
                ))}
              </div>
            ) : stores.length === 0 ? (
              <div className="flex min-h-[18rem] items-center justify-center px-4 py-8 text-center">
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
              stores.map((store, index) => {
                const isBest = Boolean(store.isBest || cheapest?.id === store.id);

                return (
                  <button
                    key={store.id}
                    type="button"
                    onClick={() => onSelectStore?.(store.id)}
                    disabled={!onSelectStore}
                    className={cx(
                      "relative grid min-h-[3.85rem] w-full grid-cols-[2.15rem_minmax(0,1fr)_5.55rem] items-center border-b border-[#d4bd86]/72 px-3 text-left active:bg-[#fff1c6]/52 disabled:cursor-default",
                      isBest ? "bg-[#ecf3d5]/72" : "bg-[#fff7df]/48",
                    )}
                  >
                    <span
                      className={cx(
                        "grid h-8 w-8 place-items-center rounded-full border-[2px] text-[0.92rem] font-black shadow-[0_1px_2px_rgba(40,28,12,0.18)]",
                        store.chain === "K"
                          ? "border-[#7e1418] bg-[#c71d24] text-[#fff6d7]"
                          : store.chain === "S"
                            ? "border-[#0b6330] bg-[#0b8f3a] text-[#fff6d7]"
                            : "border-[#5a4427] bg-[#6f6045] text-[#fff6d7]",
                      )}
                    >
                      {chainStamp(store.chain)}
                    </span>

                    <span className="min-w-0 pr-2">
                      <span className="block truncate text-[0.94rem] font-black leading-tight text-[#233020]">
                        {store.name}
                      </span>

                      <span className="mt-0.5 flex items-center gap-1.5 text-[0.58rem] font-black uppercase tracking-[0.07em] text-[#6e6d55]">
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
                    </span>

                    <span className="relative flex min-w-0 items-center justify-end">
                      {isBest ? (
                        <span className="absolute -left-[0.40rem] top-[1.38rem] rotate-[-2deg] rounded-full border-[2px] border-[#0b6330] bg-[#0b8f3a] px-2 py-[0.12rem] text-[0.52rem] font-black uppercase tracking-[0.07em] text-[#fff6d7] shadow-[0_1px_2px_rgba(20,60,26,0.20)]">
                          Paras
                        </span>
                      ) : null}

                      <span
                        className={cx(
                          "block whitespace-nowrap text-right text-[1.14rem] font-black italic leading-none",
                          isBest ? "text-[#0b7837]" : "text-[#3e301c]",
                        )}
                        style={{ fontFamily: serifFont }}
                      >
                        {formatEuro(store.totalPrice)}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </main>

        <footer className="relative z-20 grid shrink-0 grid-cols-[1fr_1fr] gap-2 px-5 pb-[0.78rem] pt-2">
          <button
            type="button"
            onClick={handleBack}
            className="min-h-[2.72rem] rounded-[1.0rem] border-[3px] border-[#7c663d] bg-[#efe1bd] px-3 text-[0.75rem] font-black uppercase tracking-[0.04em] text-[#28402a] shadow-[0_0_0_2px_#f8edcf_inset] active:translate-y-[1px] disabled:opacity-45"
            disabled={!handleBack}
          >
            Takaisin
          </button>

          <button
            type="button"
            onClick={() => cheapest && onSelectStore?.(cheapest.id)}
            className="min-h-[2.72rem] rounded-[1.0rem] border-[3px] border-[#0b6330] bg-[linear-gradient(180deg,#139143_0%,#087237_100%)] px-2 text-[0.75rem] font-black uppercase tracking-[0.03em] text-[#fff0d5] shadow-[0_0_0_2px_rgba(255,255,255,0.18)_inset,0_3px_0_#064a26] active:translate-y-[1px] disabled:opacity-45"
            disabled={!cheapest || !onSelectStore}
          >
            Huokein
          </button>
        </footer>

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
              padding-top: 3.35rem;
            }
          }
        `}</style>
      </section>
    </div>
  );
}

export { ZiiplyMobileCompareCardresponsive as ZiiplyMobileCompareCard };
