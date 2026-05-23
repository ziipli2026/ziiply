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
    <section className="rounded-[28px] border border-emerald-950/10 bg-gradient-to-br from-emerald-950 via-zinc-950 to-black p-4 text-white shadow-2xl shadow-emerald-950/25">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
            <span>📊</span>
            <span>Vertailu</span>
          </div>

          <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
            {title}
          </h2>

          <p className="mt-1 text-sm font-semibold text-emerald-100/80">
            {subtitle ||
              (stores.length
                ? `${stores.length} kauppaa vertailtu`
                : "Vertaa ostoskorin tuotteita lähikaupoissa")}
          </p>
        </div>

        {cheapest && (
          <div className="rounded-2xl bg-emerald-400 px-3 py-2 text-right shadow-lg shadow-emerald-500/25">
            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-950/70">
              Halvin
            </div>
            <div className="text-lg font-black text-emerald-950">
              {formatEuro(cheapest.totalPrice)}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse rounded-3xl bg-white/[0.07] p-4 ring-1 ring-white/10"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-2">
                  <div className="h-4 w-28 rounded-full bg-white/10" />
                  <div className="h-3 w-20 rounded-full bg-white/10" />
                </div>

                <div className="space-y-2 text-right">
                  <div className="h-5 w-20 rounded-full bg-white/10" />
                  <div className="h-3 w-14 rounded-full bg-white/10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : stores.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-emerald-300/25 bg-white/[0.06] p-5 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-2xl">
            📉
          </div>

          <h3 className="text-lg font-black text-white">
            Ei vielä vertailua
          </h3>

          <p className="mx-auto mt-2 max-w-[260px] text-sm font-semibold leading-snug text-emerald-100/75">
            Lisää tuotteita koriin ja vertaile lähikauppojen hintoja.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {stores.map((store) => {
            const isBest =
              store.isBest ||
              (cheapest && cheapest.id === store.id);

            return (
              <article
                key={store.id}
                className={`rounded-3xl p-4 ring-1 backdrop-blur transition-all ${
                  isBest
                    ? "bg-emerald-400 text-emerald-950 ring-emerald-300 shadow-xl shadow-emerald-500/25"
                    : "bg-white/[0.075] text-white ring-white/10"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`truncate text-lg font-black ${
                          isBest ? "text-emerald-950" : "text-white"
                        }`}
                      >
                        {store.name}
                      </h3>

                      {isBest && (
                        <span className="rounded-full bg-emerald-950/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]">
                          Paras
                        </span>
                      )}

                      {!isBest && store.badge && (
                        <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]">
                          {store.badge}
                        </span>
                      )}
                    </div>

                    <div
                      className={`mt-1 flex flex-wrap items-center gap-2 text-xs font-bold ${
                        isBest ? "text-emerald-950/75" : "text-emerald-100/70"
                      }`}
                    >
                      {store.chain && <span>{store.chain}-kauppa</span>}
                      {store.distanceKm != null && (
                        <span>• {store.distanceKm.toFixed(1)} km</span>
                      )}
                      {store.itemCount != null && (
                        <span>• {store.itemCount} tuotetta</span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div
                      className={`text-2xl font-black ${
                        isBest ? "text-emerald-950" : "text-white"
                      }`}
                    >
                      {formatEuro(store.totalPrice)}
                    </div>

                    {store.savingsVsHighest != null &&
                      store.savingsVsHighest > 0 && (
                        <div
                          className={`mt-1 text-xs font-black ${
                            isBest
                              ? "text-emerald-950/75"
                              : "text-emerald-200"
                          }`}
                        >
                          Säästö {formatEuro(store.savingsVsHighest)}
                        </div>
                      )}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectStore?.(store.id)}
                    className={`min-h-[44px] flex-1 rounded-2xl px-4 text-sm font-black active:scale-[0.98] ${
                      isBest
                        ? "bg-emerald-950 text-emerald-50"
                        : "bg-emerald-400 text-emerald-950"
                    }`}
                  >
                    Valitse
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenStore?.(store.id)}
                    className={`min-h-[44px] rounded-2xl px-4 text-sm font-black ring-1 active:scale-[0.98] ${
                      isBest
                        ? "bg-white/20 text-emerald-950 ring-emerald-950/10"
                        : "bg-white/10 text-white ring-white/10"
                    }`}
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
        <div className="mt-4 rounded-3xl bg-white/[0.06] p-3 ring-1 ring-white/10">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-[0.14em] text-emerald-200">
              Tuotteet
            </h3>

            <span className="text-xs font-bold text-emerald-100/65">
              {items.length} riviä
            </span>
          </div>

          <div className="space-y-2">
            {items.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-black text-white">
                    {item.name}
                  </div>

                  <div className="mt-0.5 text-[11px] font-bold text-emerald-100/60">
                    Halvin {formatEuro(item.cheapestPrice)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black text-white">
                    {formatEuro(item.selectedPrice)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onBackToCart}
          className="min-h-[48px] rounded-2xl bg-white/10 px-4 text-sm font-black text-white ring-1 ring-white/10 active:scale-[0.98] disabled:opacity-40"
          disabled={!onBackToCart}
        >
          Takaisin
        </button>

        <button
          type="button"
          onClick={() => cheapest && onSelectStore?.(cheapest.id)}
          className="min-h-[48px] rounded-2xl bg-emerald-400 px-4 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-40"
          disabled={!cheapest || !onSelectStore}
        >
          Valitse halvin
        </button>
      </div>
    </section>
  );
}
