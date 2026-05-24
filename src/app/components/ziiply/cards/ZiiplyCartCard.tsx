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

type AnyMatch = {
  product: {
    id?: number | string;
    name: string;
    ean?: string;
    pictureUrl?: string;
    image?: string;
    category?: string;
  };
  price?: number;
  quantity?: number;
  cartItemId?: string;
};

export type ZiiplyCartCardProps = {
  items?: ZiiplyCartCardItem[];
  cart?: ZiiplyCartCardItem[];
  title?: string;
  subtitle?: string;
  shoppingListItems?: AnyMatch[];
  checkedCartItems?: Record<string, boolean>;
  checkedCount?: number;
  shoppingListCount?: number;
  shoppingProgressPercent?: number;
  cheapest?: { storeName?: string; totalPrice?: number } | null;
  secondCheapest?: { storeName?: string; totalPrice?: number } | null;
  savings?: number;
  savingsPercent?: number;
  bestShoppingListGroups?: Record<string, AnyMatch[]>;
  getShoppingListItemKey?: (match: AnyMatch, index?: number) => string;
  toggleShoppingListItem?: (key: string) => void;
  markAllShoppingListItemsChecked?: () => void;
  clearShoppingListChecks?: () => void;
  setCheckedCartItems?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  formatEuro?: (value?: number | null) => string;
  fixText?: (value: string) => string;
  shoppingItemRefs?: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
  onIncreaseQuantity?: (itemId: string) => void;
  onDecreaseQuantity?: (itemId: string) => void;
  onRemoveItem?: (itemId: string) => void;
  onClearCart?: () => void;
  onCompare?: () => void;
  onAddMore?: () => void;
};

function fallbackFormatEuro(value?: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${Number(value).toFixed(2).replace(".", ",")} €`;
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

function defaultShoppingKey(match: AnyMatch, index = 0) {
  return (
    match.cartItemId ||
    match.product?.ean ||
    `${match.product?.id || "item"}-${match.product?.name || "ostos"}-${index}`
  );
}

export function ZiiplyCartCard(props: ZiiplyCartCardProps) {
  const {
    title = "Ostoskori",
    subtitle,
    onIncreaseQuantity,
    onDecreaseQuantity,
    onRemoveItem,
    onClearCart,
    onCompare,
    onAddMore,
  } = props;

  const items = props.items || props.cart || [];
  const shoppingListItems = props.shoppingListItems || [];
  const checkedCartItems = props.checkedCartItems || {};
  const formatEuro = props.formatEuro || fallbackFormatEuro;
  const fixText = props.fixText || ((value: string) => value);
  const getShoppingListItemKey = props.getShoppingListItemKey || defaultShoppingKey;
  const total = props.cheapest?.totalPrice || getCartTotal(items);
  const hasItems = items.length > 0;
  const shoppingListCount = props.shoppingListCount ?? shoppingListItems.length;
  const checkedCount = props.checkedCount ?? shoppingListItems.filter((match, index) => checkedCartItems[getShoppingListItemKey(match, index)]).length;
  const progress = props.shoppingProgressPercent ?? Math.round((checkedCount / Math.max(1, shoppingListCount)) * 100);
  const savings = props.savings || 0;

  const toggleItem = (key: string) => {
    if (props.toggleShoppingListItem) {
      props.toggleShoppingListItem(key);
      return;
    }
    props.setCheckedCartItems?.((current) => ({ ...current, [key]: !current[key] }));
  };

  const markAll = () => {
    if (props.markAllShoppingListItemsChecked) {
      props.markAllShoppingListItemsChecked();
      return;
    }
    props.setCheckedCartItems?.((current) => {
      const next = { ...current };
      shoppingListItems.forEach((match, index) => {
        next[getShoppingListItemKey(match, index)] = true;
      });
      return next;
    });
  };

  const clearAll = () => {
    if (props.clearShoppingListChecks) {
      props.clearShoppingListChecks();
      return;
    }
    props.setCheckedCartItems?.({});
  };

  return (
    <section className="relative overflow-hidden rounded-[2rem] border-4 border-[#5a4630] bg-[#f4e4bf] p-4 text-[#2e2b21] shadow-[0_8px_0_rgba(36,48,30,0.28),inset_0_0_0_3px_rgba(255,255,255,0.38)] ring-2 ring-[#c9ad76]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:radial-gradient(#6f5a31_1px,transparent_1px)] [background-size:13px_13px]" />

      <div className="relative">
        <div className="mb-4 flex items-start justify-between gap-3 border-b-2 border-[#b99e67] pb-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5f6848]">
              Kori ja keräily
            </p>
            <h2 className="font-serif text-[2.35rem] font-black italic leading-none text-[#31402c]">
              {title}
            </h2>
            <p className="mt-1 text-sm font-bold leading-snug text-[#5d5845]">
              {subtitle || `${items.length} tuotetta · ${shoppingListCount} kerättävää`}
            </p>
          </div>

          <div className="shrink-0 rounded-2xl border-2 border-[#7b5f32] bg-[#efe0bf] px-4 py-3 text-right shadow-[inset_0_0_0_2px_rgba(255,255,255,0.35)]">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5f6848]">
              Yhteensä
            </p>
            <p className="text-2xl font-black text-[#315f2f]">{formatEuro(total)}</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-[#b99e67] bg-[#fbf2dc] p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#5f6848]">Kerätty</p>
            <p className="text-2xl font-black text-[#31402c]">{checkedCount}/{shoppingListCount}</p>
          </div>
          <div className="rounded-2xl border border-[#b99e67] bg-[#fbf2dc] p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#5f6848]">Valmis</p>
            <p className="text-2xl font-black text-[#31402c]">{progress}%</p>
          </div>
          <div className="rounded-2xl border border-[#b99e67] bg-[#fbf2dc] p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wide text-[#5f6848]">Säästö</p>
            <p className="text-2xl font-black text-[#315f2f]">{formatEuro(savings > 0 ? savings : 0)}</p>
          </div>
        </div>

        <div className="mb-4 rounded-[1.5rem] border-2 border-[#2f3d28] bg-[#1f2b1d] p-3 text-[#f7ead0] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#a9c08a]">Keräily kaupassa</p>
              <h3 className="mt-1 text-xl font-black leading-tight text-white">{props.cheapest?.storeName || "Valitse halvin kori"}</h3>
            </div>
            <div className="rounded-full bg-[#10c95f] px-4 py-2 text-lg font-black text-[#06210f]">{progress}%</div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#40503a]">
            <div className="h-full rounded-full bg-[#10c95f]" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        </div>

        {shoppingListItems.length > 0 ? (
          <div className="max-h-[420px] space-y-2 overflow-auto pr-1">
            {shoppingListItems.map((match, index) => {
              const key = getShoppingListItemKey(match, index);
              const checked = Boolean(checkedCartItems[key]);
              const image = match.product?.pictureUrl || match.product?.image;

              return (
                <button
                  key={`retro-shopping-${key}`}
                  ref={(element) => {
                    if (props.shoppingItemRefs?.current) props.shoppingItemRefs.current[key] = element;
                  }}
                  type="button"
                  onClick={() => toggleItem(key)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition active:scale-[0.99] ${checked ? "border-[#7cab6d] bg-[#e7f3dc]" : "border-[#d6bf8f] bg-[#fbf2dc]"}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-black ${checked ? "bg-[#0c7c38] text-white" : "bg-[#fff8e8] text-[#6f5a31] ring-2 ring-[#c9ad76]"}`}>
                    {checked ? "✓" : index + 1}
                  </span>

                  {image ? (
                    <img src={image} alt="" className="h-11 w-11 shrink-0 rounded-xl bg-white object-contain ring-1 ring-[#ead7aa]" />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#efe0bf] text-xl ring-1 ring-[#d6bf8f]">🧾</span>
                  )}

                  <span className="min-w-0 flex-1">
                    <span className="block line-clamp-2 text-sm font-black leading-tight text-[#1f2619]">{fixText(match.product?.name || "Tuote")}</span>
                    <span className="mt-0.5 block text-xs font-bold text-[#6f6b59]">{Math.max(1, match.quantity || 1)} kpl</span>
                  </span>

                  <span className="shrink-0 text-sm font-black text-[#31402c]">{formatEuro(match.price || 0)}</span>
                </button>
              );
            })}
          </div>
        ) : hasItems ? (
          <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
            {items.map((item) => {
              const quantity = Math.max(1, item.quantity || 1);
              const rowTotal = item.price ? item.price * quantity : undefined;
              return (
                <article key={item.id} className="rounded-2xl border border-[#d6bf8f] bg-[#fbf2dc] p-3">
                  <div className="flex gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-[#ead7aa]">
                      {item.image ? <img src={item.image} alt="" className="h-full w-full object-contain" /> : <span className="text-xl">🛒</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-black leading-tight">{fixText(item.name)}</p>
                      <p className="mt-1 text-xs font-bold text-[#6f6b59]">{quantity} kpl · {getItemMeta(item)}</p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-[#31402c]">{formatEuro(rowTotal || 0)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-[#b99e67] bg-[#fbf2dc] p-5 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#efe0bf] text-2xl">🧺</div>
            <h3 className="text-lg font-black text-[#31402c]">Kori on vielä tyhjä</h3>
            <p className="mx-auto mt-2 max-w-[260px] text-sm font-bold leading-snug text-[#6f6b59]">Lisää tuotteita hausta, tarjouksista tai Justiinalta.</p>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" onClick={markAll} className="min-h-[46px] rounded-2xl bg-[#0c7c38] px-4 text-sm font-black text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)] disabled:opacity-40" disabled={!shoppingListItems.length}>
            Kaikki kerätty
          </button>
          <button type="button" onClick={clearAll} className="min-h-[46px] rounded-2xl bg-[#efe0bf] px-4 text-sm font-black text-[#3a3325] ring-1 ring-[#b99e67] disabled:opacity-40" disabled={!shoppingListItems.length}>
            Nollaa keräily
          </button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={onAddMore} className="min-h-[44px] rounded-2xl bg-[#fbf2dc] px-4 text-sm font-black text-[#31402c] ring-1 ring-[#b99e67] disabled:opacity-40" disabled={!onAddMore}>
            Lisää tuotteita
          </button>
          <button type="button" onClick={onCompare} className="min-h-[44px] rounded-2xl bg-[#2f3d28] px-4 text-sm font-black text-[#f7ead0] shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)] disabled:opacity-40" disabled={!onCompare || !hasItems}>
            Vertaile
          </button>
        </div>

        {hasItems && onClearCart && (
          <button type="button" onClick={onClearCart} className="mt-2 min-h-[40px] w-full rounded-2xl bg-[#8a3f16] px-4 text-sm font-black text-[#fff4d8] active:scale-[0.98]">
            Tyhjennä kori
          </button>
        )}
      </div>
    </section>
  );
}

export default ZiiplyCartCard;
