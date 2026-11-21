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

export type ZiiplyCompareCardProps = {
  stores: ZiiplyCompareStore[];
  items?: ZiiplyCompareItem[];
  title?: string;
  subtitle?: string;
  loading?: boolean;
  onSelectStore?: (storeId: string) => void;
  onBackToCart?: () => void;
  onOpenStore?: (storeId: string) => void;
};

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
  if (chain === "S") return { label: "S", className: "bg-[#0b8f3a] text-[#fff6d7]" };
  if (chain === "K") return { label: "K", className: "bg-[#c71d24] text-[#fff6d7]" };
  return { label: "?", className: "bg-[#6f6045] text-[#fff6d7]" };
}

export function ZiiplyCompareCard({
  stores,
  items = [],
  title = "Vertailu",
  subtitle,
  loading,
  onSelectStore,
  onBackToCart,
  onOpenStore,
}: ZiiplyCompareCardProps) {
  const cheapest = getCheapestStore(stores);

  return (
    <section className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[44px] border-[4px] border-[#5b482c] bg-[#f4e7c7] p-4 text-[#233020] shadow-[0_0_0_2px_#d7bd78_inset,0_22px_34px_rgba(72,51,22,0.28)] lg:p-5">
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:radial-gradient(#c7aa67_1px,transparent_1px)] [background-size:15px_15px]" />

      <header className="relative z-10 shrink-0 rounded-[34px] border-[3px] border-[#7c663d] bg-[#fff4d8] px-4 py-3 shadow-[0_0_0_2px_#f8e8bd_inset] lg:px-5 lg:py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[12px] font-black uppercase tracking-[0.28em] text-[#6e6d55] lg:text-[13px]">
              Hintavertailu
            </div>
            <h2
              className="mt-1 truncate text-[34px] font-black italic leading-none text-[#28402a] lg:text-[46px]"
              style={{ fontFamily: '"Cooper Black", "Cooper Std Black", Georgia, serif' }}
            >
              {title}
            </h2>
            <p className="mt-2 max-w-[680px] truncate text-[14px] font-black text-[#6b6048] lg:text-[16px]">
              {subtitle ||
                (stores.length
                  ? `${stores.length} kauppaa vertailtu`
                  : "Lisää tuotteita koriin ja vertaile lähikauppojen hintoja.")}
            </p>
          </div>

          {cheapest && (
            <div className="shrink-0 rounded-[24px] border-[3px] border-[#0f7d37] bg-[#11873a] px-4 py-2 text-right text-[#fff6d7] shadow-[0_0_0_2px_#41ad62_inset] lg:px-5 lg:py-3">
              <div className="text-[11px] font-black uppercase tracking-[0.2em] opacity-80">
                Huokein
              </div>
              <div className="mt-0.5 whitespace-nowrap text-[24px] font-black leading-none lg:text-[32px]">
                {formatEuro(cheapest.totalPrice)}
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 mt-4 min-h-0 flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {loading ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-[30px] border-[3px] border-[#d4b978] bg-[#fff4d8] p-4 shadow-[0_0_0_2px_#f7e8c3_inset]"
              >
                <div className="h-5 w-32 rounded-full bg-[#d1bb7d]" />
                <div className="mt-3 h-4 w-24 rounded-full bg-[#d1bb7d]" />
                <div className="mt-6 h-8 w-28 rounded-full bg-[#d1bb7d]" />
              </div>
            ))}
          </div>
        ) : stores.length === 0 ? (
          <div className="flex h-full min-h-[260px] items-center justify-center rounded-[34px] border-[3px] border-dashed border-[#aa8c4d] bg-[#fff4d8]/85 p-8 text-center shadow-[0_0_0_2px_#f8e8bd_inset]">
            <div>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] border-[3px] border-[#7c663d] bg-[#11873a] text-4xl text-[#fff6d7] shadow-[0_0_0_2px_#41ad62_inset]">
                ≋
              </div>
              <h3
                className="mt-5 text-[32px] font-black italic leading-none text-[#28402a]"
                style={{ fontFamily: '"Cooper Black", "Cooper Std Black", Georgia, serif' }}
              >
                Ei vielä vertailua
              </h3>
              <p className="mx-auto mt-3 max-w-[420px] text-[16px] font-black leading-snug text-[#6b6048]">
                Lisää tuotteita koriin, niin Gösta ja Justiina voivat vertailla
                korin eri kaupoissa.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-2">
            {stores.map((store) => {
              const isBest = store.isBest || (cheapest && cheapest.id === store.id);
              const chainBadge = getChainBadge(store.chain);

              return (
                <article
                  key={store.id}
                  className={`rounded-[32px] border-[3px] p-4 shadow-[0_0_0_2px_rgba(255,255,255,0.35)_inset,0_10px_18px_rgba(72,51,22,0.16)] transition-transform active:scale-[0.99] ${
                    isBest
                      ? "border-[#0f7d37] bg-[#dff3d8] text-[#20301f]"
                      : "border-[#7c663d] bg-[#fff4d8] text-[#20301f]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[17px] font-black ${chainBadge.className}`}>
                          {chainBadge.label}
                        </span>
                        <h3 className="truncate text-[22px] font-black leading-tight text-[#233020] lg:text-[24px]">
                          {store.name}
                        </h3>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] font-black uppercase tracking-[0.08em] text-[#6e6d55]">
                        {isBest && (
                          <span className="rounded-full border-2 border-[#0f7d37] bg-[#11873a] px-2.5 py-1 text-[#fff6d7]">
                            Paras
                          </span>
                        )}
                        {store.badge && !isBest && (
                          <span className="rounded-full border-2 border-[#b99d5c] bg-[#f4e7c7] px-2.5 py-1 text-[#6b6048]">
                            {store.badge}
                          </span>
                        )}
                        {store.distanceKm != null && <span>{store.distanceKm.toFixed(1)} km</span>}
                        {store.itemCount != null && <span>{store.itemCount} tuotetta</span>}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="whitespace-nowrap text-[30px] font-black leading-none text-[#11873a] lg:text-[34px]">
                        {formatEuro(store.totalPrice)}
                      </div>
                      {store.savingsVsHighest != null && store.savingsVsHighest > 0 && (
                        <div className="mt-1 whitespace-nowrap text-[12px] font-black uppercase tracking-[0.08em] text-[#8a5a1e]">
                          Säästö {formatEuro(store.savingsVsHighest)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectStore?.(store.id)}
                      className="min-h-[46px] rounded-[20px] border-[3px] border-[#0f7d37] bg-[#11873a] px-4 text-[15px] font-black uppercase tracking-[0.04em] text-[#fff6d7] shadow-[0_0_0_2px_#41ad62_inset] active:scale-[0.98] disabled:opacity-45"
                      disabled={!onSelectStore}
                    >
                      Valitse
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenStore?.(store.id)}
                      className="min-h-[46px] rounded-[20px] border-[3px] border-[#7c663d] bg-[#efe1bd] px-4 text-[15px] font-black uppercase tracking-[0.04em] text-[#28402a] shadow-[0_0_0_2px_#f8edcf_inset] active:scale-[0.98] disabled:opacity-45"
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

        {items.length > 0 && (
          <div className="mt-4 rounded-[34px] border-[3px] border-[#7c663d] bg-[#fff4d8] p-4 shadow-[0_0_0_2px_#f8e8bd_inset]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-[13px] font-black uppercase tracking-[0.18em] text-[#6e6d55]">
                Tuotteet
              </h3>
              <span className="rounded-full border-2 border-[#b99d5c] bg-[#f4e7c7] px-3 py-1 text-[12px] font-black text-[#6b6048]">
                {items.length} riviä
              </span>
            </div>

            <div className="grid gap-2 lg:grid-cols-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[24px] border-2 border-[#d4b978] bg-[#f8edcf] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[15px] font-black text-[#233020]">
                      {item.name}
                    </div>
                    <div className="mt-0.5 text-[12px] font-black text-[#6b6048]">
                      Halvin {formatEuro(item.cheapestPrice)}
                    </div>
                  </div>
                  <div className="whitespace-nowrap text-right text-[16px] font-black text-[#11873a]">
                    {formatEuro(item.selectedPrice)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="relative z-10 mt-4 grid shrink-0 grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onBackToCart}
          className="min-h-[54px] rounded-[22px] border-[3px] border-[#7c663d] bg-[#efe1bd] px-4 text-[15px] font-black uppercase tracking-[0.04em] text-[#28402a] shadow-[0_0_0_2px_#f8edcf_inset] active:scale-[0.98] disabled:opacity-45"
          disabled={!onBackToCart}
        >
          Takaisin
        </button>

        <button
          type="button"
          onClick={() => cheapest && onSelectStore?.(cheapest.id)}
          className="min-h-[54px] rounded-[22px] border-[3px] border-[#0f7d37] bg-[#11873a] px-4 text-[15px] font-black uppercase tracking-[0.04em] text-[#fff6d7] shadow-[0_0_0_2px_#41ad62_inset] active:scale-[0.98] disabled:opacity-45"
          disabled={!cheapest || !onSelectStore}
        >
          Valitse huokein
        </button>
      </footer>
    </section>
  );
}

export default ZiiplyCompareCard;
