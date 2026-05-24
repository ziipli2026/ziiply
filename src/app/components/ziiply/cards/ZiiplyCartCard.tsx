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

type SavedListLike = {
  id: string;
  name: string;
  items: unknown[];
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
  cartSavePanelOpen?: boolean;
  onToggleSavePanel?: () => void;
  savedListName?: string;
  setSavedListName?: (value: string) => void;
  onSaveCurrentCartAsList?: () => void;
  savedShoppingLists?: SavedListLike[];
  onAddSavedListToCart?: (list: any) => void;
  onDeleteSavedShoppingList?: (listId: string) => void;
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

function defaultShoppingKey(match: AnyMatch, index = 0) {
  return (
    match.cartItemId ||
    match.product?.ean ||
    `${match.product?.id || "item"}-${match.product?.name || "ostos"}-${index}`
  );
}

function normalizeText(value?: string) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function getItemMeta(item: ZiiplyCartCardItem) {
  if (item.source === "manual" || !item.price) return "Ostoslistarivi";
  if (item.storeName) return item.storeName;
  if (item.chain === "S") return "S-kauppa";
  if (item.chain === "K") return "K-kauppa";
  return "Tuote";
}

function clampName(name: string, fixText: (value: string) => string) {
  return fixText(name || "Tuote").replace(/\s+/g, " ").trim();
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
    cartSavePanelOpen,
    onToggleSavePanel,
    savedListName,
    setSavedListName,
    onSaveCurrentCartAsList,
    savedShoppingLists = [],
    onAddSavedListToCart,
    onDeleteSavedShoppingList,
  } = props;

  const items = props.items || props.cart || [];
  const shoppingListItems = props.shoppingListItems || [];
  const checkedCartItems = props.checkedCartItems || {};
  const formatEuro = props.formatEuro || fallbackFormatEuro;
  const fixText = props.fixText || ((value: string) => value);
  const getShoppingListItemKey = props.getShoppingListItemKey || defaultShoppingKey;
  const total = props.cheapest?.totalPrice || getCartTotal(items);
  const hasItems = items.length > 0;
  const shoppingListCount = props.shoppingListCount ?? (shoppingListItems.length || items.length);
  const checkedCount =
    props.checkedCount ??
    (shoppingListItems.length
      ? shoppingListItems.filter((match, index) => checkedCartItems[getShoppingListItemKey(match, index)]).length
      : items.filter((item) => checkedCartItems[item.id]).length);
  const progress = props.shoppingProgressPercent ?? Math.round((checkedCount / Math.max(1, shoppingListCount)) * 100);
  const savings = props.savings || 0;

  const findCartItemForMatch = (match: AnyMatch) => {
    const matchName = normalizeText(match.product?.name);
    return (
      items.find((item) => item.id === match.cartItemId) ||
      items.find((item) => item.ean && item.ean === match.product?.ean) ||
      items.find((item) => normalizeText(item.name) === matchName)
    );
  };

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
      if (shoppingListItems.length) {
        shoppingListItems.forEach((match, index) => {
          next[getShoppingListItemKey(match, index)] = true;
        });
      } else {
        items.forEach((item) => {
          next[item.id] = true;
        });
      }
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

  const closeSavePanel = () => {
    if (cartSavePanelOpen) onToggleSavePanel?.();
  };

  const saveCurrentListAndClose = () => {
    onSaveCurrentCartAsList?.();
    closeSavePanel();
  };

  const addSavedListAndClose = (list: SavedListLike) => {
    onAddSavedListToCart?.(list);
    closeSavePanel();
  };

  const stop = (event: React.MouseEvent) => event.stopPropagation();

  return (
    <section className="relative max-h-[calc(100vh-8rem)] overflow-hidden rounded-[2rem] border-4 border-[#5a4630] bg-[#f4e4bf] p-4 text-[#2e2b21] shadow-[0_8px_0_rgba(36,48,30,0.28),inset_0_0_0_3px_rgba(255,255,255,0.38)] ring-2 ring-[#c9ad76]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:radial-gradient(#6f5a31_1px,transparent_1px)] [background-size:13px_13px]" />

      <div className="relative flex min-h-0 flex-col">
        <div className="mb-3 border-b-2 border-[#b99e67] pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5f6848]">Kori ja keräily</p>
              <h2 className="font-serif text-[2.45rem] font-black italic leading-none text-[#31402c]">{title}</h2>
              <p className="mt-1 text-sm font-bold leading-snug text-[#5d5845]">
                {subtitle || `${items.length} tuotetta · ${shoppingListCount} kerättävää`}
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border-2 border-[#7b5f32] bg-[#efe0bf] px-4 py-3 text-right shadow-[inset_0_0_0_2px_rgba(255,255,255,0.35)]">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#5f6848]">Yhteensä</p>
              <p className="whitespace-nowrap text-2xl font-black text-[#315f2f]">{formatEuro(total)}</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-[0.9fr_1.25fr] gap-2">
            <button
              type="button"
              onClick={onClearCart}
              className="min-h-[42px] rounded-xl border border-[#8a3f16]/40 bg-[#8a3f16] px-3 text-xs font-black uppercase tracking-wide text-[#fff4d8] disabled:cursor-not-allowed disabled:opacity-45"
              disabled={!hasItems || !onClearCart}
            >
              Tyhjennä kori
            </button>
            <button
              type="button"
              onClick={onToggleSavePanel}
              className="min-h-[42px] rounded-xl border border-[#b99e67] bg-[#efe0bf] px-3 text-xs font-black uppercase tracking-wide text-[#31402c] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)] disabled:opacity-45"
              disabled={!onToggleSavePanel}
            >
              Näytä/tallenna vihkonen
            </button>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2">
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
            <p className="whitespace-nowrap text-2xl font-black text-[#315f2f]">{formatEuro(savings > 0 ? savings : 0)}</p>
          </div>
        </div>

        <div className="mb-3 rounded-[1.5rem] border-2 border-[#2f3d28] bg-[#1f2b1d] p-3 text-[#f7ead0] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#a9c08a]">Keräily kaupassa</p>
              <h3 className="mt-1 line-clamp-1 text-xl font-black leading-tight text-white">
                {props.cheapest?.storeName || "Valitse halvin kori"}
              </h3>
            </div>
            <div className="shrink-0 rounded-full bg-[#16d269] px-4 py-3 text-xl font-black text-[#06230f]">{progress}%</div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#44553b]">
            <div className="h-full rounded-full bg-[#16d269] transition-all" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-2">
          {shoppingListItems.length > 0 ? (
            <div className="space-y-2">
              {shoppingListItems.map((match, index) => {
                const key = getShoppingListItemKey(match, index);
                const cartItem = findCartItemForMatch(match);
                const checked = Boolean(checkedCartItems[key]);
                const quantity = Math.max(1, cartItem?.quantity || match.quantity || 1);
                const image = match.product?.pictureUrl || match.product?.image || cartItem?.image;
                const price = match.price || cartItem?.price || 0;

                return (
                  <article
                    key={key}
                    ref={(node) => {
                      if (props.shoppingItemRefs?.current && node) {
                        props.shoppingItemRefs.current[key] = node as unknown as HTMLButtonElement;
                      }
                    }}
                    className={`grid h-[104px] grid-cols-[3.25rem_3.75rem_1fr_4.6rem] items-center gap-3 overflow-hidden rounded-2xl border p-3 transition ${checked ? "border-[#7cab6d] bg-[#e7f3dc]" : "border-[#d6bf8f] bg-[#fbf2dc]"}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleItem(key)}
                      className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-black transition active:scale-95 ${checked ? "bg-[#0c7c38] text-white" : "bg-[#fff8e8] text-[#6f5a31] ring-2 ring-[#c9ad76]"}`}
                      aria-label={checked ? "Merkitse keräämättömäksi" : "Merkitse kerätyksi"}
                    >
                      {checked ? "✓" : index + 1}
                    </button>

                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-[#ead7aa]">
                      {image ? <img src={image} alt="" className="h-full w-full object-contain" /> : <span className="text-xl">🛒</span>}
                    </div>

                    <div className="min-w-0 overflow-hidden">
                      <p className="line-clamp-2 text-base font-black leading-tight text-[#2e2b21]">{clampName(match.product?.name || cartItem?.name || "Tuote", fixText)}</p>
                      <p className="mt-0.5 truncate text-sm font-bold text-[#6f6b59]">{quantity} kpl</p>
                      <div className="mt-1.5 flex items-center gap-1.5" onClick={stop}>
                        <button type="button" onClick={() => cartItem && onDecreaseQuantity?.(cartItem.id)} disabled={!cartItem || !onDecreaseQuantity || quantity <= 1} className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#efe0bf] text-base font-black text-[#31402c] ring-1 ring-[#b99e67] disabled:opacity-35">−</button>
                        <button type="button" onClick={() => cartItem && onIncreaseQuantity?.(cartItem.id)} disabled={!cartItem || !onIncreaseQuantity} className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0c7c38] text-base font-black text-white disabled:opacity-35">+</button>
                        <button type="button" onClick={() => cartItem && onRemoveItem?.(cartItem.id)} disabled={!cartItem || !onRemoveItem} className="h-7 rounded-lg bg-[#8a3f16] px-2 text-xs font-black text-[#fff4d8] disabled:opacity-35">Pois</button>
                      </div>
                    </div>

                    <span className="shrink-0 whitespace-nowrap text-right text-base font-black text-[#31402c]">{formatEuro(price * quantity)}</span>
                  </article>
                );
              })}
            </div>
          ) : hasItems ? (
            <div className="space-y-2">
              {items.map((item, index) => {
                const quantity = Math.max(1, item.quantity || 1);
                const rowTotal = item.price ? item.price * quantity : 0;
                const checked = Boolean(checkedCartItems[item.id]);
                return (
                  <article key={item.id} className={`grid h-[104px] grid-cols-[3.25rem_3.75rem_1fr_4.6rem] items-center gap-3 overflow-hidden rounded-2xl border p-3 ${checked ? "border-[#7cab6d] bg-[#e7f3dc]" : "border-[#d6bf8f] bg-[#fbf2dc]"}`}>
                    <button type="button" onClick={() => toggleItem(item.id)} className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-black ${checked ? "bg-[#0c7c38] text-white" : "bg-[#fff8e8] text-[#6f5a31] ring-2 ring-[#c9ad76]"}`} aria-label={checked ? "Merkitse keräämättömäksi" : "Merkitse kerätyksi"}>{checked ? "✓" : index + 1}</button>
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-[#ead7aa]">
                      {item.image ? <img src={item.image} alt="" className="h-full w-full object-contain" /> : <span className="text-xl">🛒</span>}
                    </div>
                    <div className="min-w-0 overflow-hidden">
                      <p className="line-clamp-2 text-base font-black leading-tight">{clampName(item.name, fixText)}</p>
                      <p className="mt-0.5 truncate text-sm font-bold text-[#6f6b59]">{quantity} kpl · {getItemMeta(item)}</p>
                      <div className="mt-1.5 flex items-center gap-1.5" onClick={stop}>
                        <button type="button" onClick={() => onDecreaseQuantity?.(item.id)} disabled={!onDecreaseQuantity || quantity <= 1} className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#efe0bf] text-base font-black text-[#31402c] ring-1 ring-[#b99e67] disabled:opacity-35">−</button>
                        <button type="button" onClick={() => onIncreaseQuantity?.(item.id)} disabled={!onIncreaseQuantity} className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0c7c38] text-base font-black text-white disabled:opacity-35">+</button>
                        <button type="button" onClick={() => onRemoveItem?.(item.id)} disabled={!onRemoveItem} className="h-7 rounded-lg bg-[#8a3f16] px-2 text-xs font-black text-[#fff4d8] disabled:opacity-35">Pois</button>
                      </div>
                    </div>
                    <p className="shrink-0 whitespace-nowrap text-right text-base font-black text-[#31402c]">{formatEuro(rowTotal)}</p>
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
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={markAll} className="min-h-[46px] rounded-2xl bg-[#0c7c38] px-4 text-sm font-black text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)] disabled:opacity-40" disabled={!shoppingListItems.length && !items.length}>Kaikki kerätty</button>
          <button type="button" onClick={clearAll} className="min-h-[46px] rounded-2xl bg-[#efe0bf] px-4 text-sm font-black text-[#3a3325] ring-1 ring-[#b99e67] disabled:opacity-40" disabled={!shoppingListItems.length && !items.length}>Nollaa keräily</button>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" onClick={onAddMore} className="min-h-[44px] rounded-2xl bg-[#fbf2dc] px-4 text-sm font-black text-[#31402c] ring-1 ring-[#b99e67] disabled:opacity-40" disabled={!onAddMore}>Lisää tuotteita</button>
          <button type="button" onClick={onCompare} className="min-h-[44px] rounded-2xl bg-[#2f3d28] px-4 text-sm font-black text-[#f7ead0] shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)] disabled:opacity-40" disabled={!onCompare || !hasItems}>Vertaile</button>
        </div>
      </div>

      {cartSavePanelOpen && (
        <div className="absolute inset-3 z-20 overflow-hidden rounded-[1.5rem] border-2 border-[#7b5f32] bg-[#f4e4bf] p-4 shadow-2xl ring-2 ring-[#c9ad76]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:radial-gradient(#6f5a31_1px,transparent_1px)] [background-size:13px_13px]" />
          <div className="relative flex h-full min-h-0 flex-col">
            <div className="mb-3 flex items-start justify-between gap-3 border-b border-[#b99e67] pb-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5f6848]">Ostosvihkonen</p>
                <h3 className="font-serif text-3xl font-black italic text-[#31402c]">Tallennetut listat</h3>
              </div>
              <button type="button" onClick={onToggleSavePanel} className="rounded-xl bg-[#efe0bf] px-3 py-2 text-xs font-black uppercase text-[#31402c] ring-1 ring-[#b99e67]">Sulje</button>
            </div>

            <div className="mb-3 flex gap-2">
              <input value={savedListName || ""} onChange={(event) => setSavedListName?.(event.target.value)} placeholder="Esim. Viikko-ostos" className="min-w-0 flex-1 rounded-xl border border-[#d6bf8f] bg-white px-3 py-2 text-sm font-black text-[#2e2b21] outline-none focus:border-green-700" />
              <button type="button" onClick={saveCurrentListAndClose} className="rounded-xl bg-[#0c7c38] px-4 py-2 text-xs font-black uppercase text-white disabled:opacity-40" disabled={!onSaveCurrentCartAsList || !hasItems}>Tallenna</button>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
              {savedShoppingLists.length > 0 ? (
                savedShoppingLists.map((list) => (
                  <div key={list.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#fbf2dc] p-3 ring-1 ring-[#d6bf8f]">
                    <button type="button" onClick={() => addSavedListAndClose(list)} className="min-w-0 flex-1 text-left text-sm font-black text-[#31402c] active:scale-[0.99]">
                      <span className="block truncate">{list.name}</span>
                      <span className="block text-xs text-[#6f6b59]">{list.items.length} riviä · avaa/lisää koriin</span>
                    </button>
                    <button type="button" onClick={() => onDeleteSavedShoppingList?.(list.id)} className="rounded-lg bg-[#8a3f16] px-2 py-1 text-xs font-black text-[#fff4d8]">Poista</button>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[#b99e67] bg-[#fbf2dc] p-4 text-center text-sm font-bold text-[#6f6b59]">Ei tallennettuja vihkosia vielä.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ZiiplyCartCard;
