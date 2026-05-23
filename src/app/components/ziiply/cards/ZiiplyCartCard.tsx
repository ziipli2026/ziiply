import React from "react";

export type ZiiplyCartCardItem = {
  id: string;
  name: string;
  quantity: number;
  price?: number;
  image?: string;
  storeName?: string;
  chain?: "S" | "K";
  source?: "manual" | "offer" | "search" | "recipe" | "justiina";
  ean?: string;
};

export type ZiiplyCartCardProps = {
  items: ZiiplyCartCardItem[];
  title?: string;
  subtitle?: string;
  onIncreaseQuantity?: (itemId: string) => void;
  onDecreaseQuantity?: (itemId: string) => void;
  onRemoveItem?: (itemId: string) => void;
  onClearCart?: () => void;
  onCompare?: () => void;
  onAddMore?: () => void;
};

function formatEuro(cents?: number | null) {
  if (cents == null || Number.isNaN(cents)) return "—";
  return `${(cents / 100).toFixed(2).replace(".", ",")} €`;
}

function getCartTotal(items: ZiiplyCartCardItem[]) {
  return items.reduce((sum, item) => {
    if (!item.price || item.price <= 0) return sum;
    return sum + item.price * Math.max(1, item.quantity || 1);
  }, 0);
}

function getItemMeta(item: ZiiplyCartCardItem) {
  if (item.source === "manual" || !item.price) return "Ostoslistarivi";
  if (item.storeName) return item.storeName;
  if (item.chain === "S") return "S-kauppa";
  if (item.chain === "K") return "K-kauppa";
  return "Tuote";
}

export function ZiiplyCartCard({
  items,
  title = "Ostoskori",
  subtitle,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onRemoveItem,
  onClearCart,
  onCompare,
  onAddMore,
}: ZiiplyCartCardProps) {
  const total = getCartTotal(items);
  const hasItems = items.length > 0;
  const pricedItems = items.filter((item) => item.price && item.price > 0).length;
  const manualItems = items.length - pricedItems;
  const primaryStoreName =
    items.find((item) => item.storeName)?.storeName ||
    items.find((item) => item.chain === "S")?.storeName ||
    items.find((item) => item.chain === "K")?.storeName ||
    "";

  return (
    <section className="rounded-[28px] border border-emerald-950/10 bg-gradient-to-br from-emerald-950 via-zinc-950 to-black p-4 text-white shadow-2xl shadow-emerald-950/25">
      <div className="mb-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
          <span>🛒</span>
          <span>{hasItems ? "Keräily kaupassa" : "Kori"}</span>
        </div>

        <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
          {hasItems && primaryStoreName ? primaryStoreName : title}
        </h2>

        <p className="mt-1 text-sm font-semibold leading-snug text-emerald-100/80">
          {subtitle ||
            (hasItems
              ? `${items.length} tuotetta · ${formatEuro(total)}${manualItems ? ` · ${manualItems} listalla` : ""}`
              : "Lisää tuotteita hausta tai Justiinalta")}
        </p>
      </div>

      {!hasItems ? (
        <div className="rounded-3xl border border-dashed border-emerald-300/25 bg-white/[0.06] p-5 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-2xl">
            🧺
          </div>
          <h3 className="text-lg font-black text-white">
            Kori on vielä tyhjä
          </h3>
          <p className="mx-auto mt-2 max-w-[260px] text-sm font-semibold leading-snug text-emerald-100/75">
            Lisää tuotteita hausta, tarjouksista tai anna Justiinan ehdottaa ostettavaa.
          </p>

          {onAddMore && (
            <button
              type="button"
              onClick={onAddMore}
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-emerald-400 px-5 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              Lisää tuotteita
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => {
            const quantity = Math.max(1, item.quantity || 1);
            const rowTotal = item.price ? item.price * quantity : undefined;

            return (
              <article
                key={item.id}
                className="rounded-3xl bg-white/[0.075] p-3 ring-1 ring-white/10 backdrop-blur"
              >
                <div className="flex gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/10">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl">{item.source === "manual" ? "📝" : "🛒"}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="line-clamp-2 text-sm font-black leading-tight text-white">
                          {item.name}
                        </h3>
                        <p className="mt-1 truncate text-xs font-bold text-emerald-100/65">
                          {getItemMeta(item)}
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <div className="text-sm font-black text-white">
                          {formatEuro(rowTotal)}
                        </div>
                        {item.price ? (
                          <div className="text-[11px] font-bold text-emerald-100/55">
                            {formatEuro(item.price)} / kpl
                          </div>
                        ) : (
                          <div className="text-[11px] font-bold text-emerald-100/55">
                            ei hintaa
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        className="flex h-9 shrink-0 items-center justify-center rounded-xl bg-amber-100/90 px-3 text-xs font-black text-amber-800 ring-1 ring-amber-200/70 active:scale-[0.98]"
                        aria-label="Tarjoukset tulossa"
                      >
                        🔥 Tarjoukset
                      </button>

                      <div className="inline-flex shrink-0 items-center rounded-2xl bg-black/25 p-1 ring-1 ring-white/10">
                        <button
                          type="button"
                          onClick={() => onDecreaseQuantity?.(item.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl text-lg font-black text-white active:scale-95 disabled:opacity-40"
                          disabled={!onDecreaseQuantity || quantity <= 1}
                          aria-label="Vähennä määrää"
                        >
                          −
                        </button>

                        <div className="flex min-w-[36px] items-center justify-center px-1 text-sm font-black text-white">
                          {quantity}
                        </div>

                        <button
                          type="button"
                          onClick={() => onIncreaseQuantity?.(item.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-400 text-lg font-black text-emerald-950 active:scale-95 disabled:opacity-40"
                          disabled={!onIncreaseQuantity}
                          aria-label="Lisää määrää"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRemoveItem?.(item.id)}
                        className="flex h-9 min-w-0 flex-1 items-center justify-center rounded-xl bg-rose-400/15 px-3 text-xs font-black text-rose-100 ring-1 ring-rose-300/20 active:scale-[0.98] disabled:opacity-40"
                        disabled={!onRemoveItem}
                      >
                        🗑 Poista
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onAddMore}
          className="min-h-[48px] rounded-2xl bg-white/10 px-4 text-sm font-black text-white ring-1 ring-white/10 active:scale-[0.98] disabled:opacity-40"
          disabled={!onAddMore}
        >
          Lisää
        </button>

        <button
          type="button"
          onClick={onCompare}
          className="min-h-[48px] rounded-2xl bg-emerald-400 px-4 text-sm font-black text-emerald-950 shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-40"
          disabled={!onCompare || !hasItems}
        >
          Vertaa
        </button>
      </div>

      {hasItems && onClearCart && (
        <button
          type="button"
          onClick={onClearCart}
          className="mt-2 min-h-[42px] w-full rounded-2xl bg-zinc-800/90 px-4 text-sm font-black text-zinc-100 ring-1 ring-white/10 active:scale-[0.98]"
        >
          Tyhjennä kori
        </button>
      )}
    </section>
  );
}
