import React, { useMemo, useState } from "react";

type AnyItem = Record<string, any>;

type ZiiplyCartCardProps = {
  cart?: AnyItem[];
  items?: AnyItem[];
  shoppingListItems?: AnyItem[];
  checkedCartItems?: Record<string, boolean>;
  checkedCount?: number;
  shoppingListCount?: number;
  shoppingProgressPercent?: number;
  cheapest?: AnyItem | null;
  secondCheapest?: AnyItem | null;
  savings?: number;
  savingsPercent?: number;
  bestShoppingListGroups?: Record<string, AnyItem[]>;
  getShoppingListItemKey?: (match: AnyItem, index?: number) => string;
  toggleShoppingListItem?: (match: AnyItem, index: number) => void;
  onToggleShoppingListItem?: (match: AnyItem, index: number) => void;
  onToggleCollected?: (match: AnyItem, index: number) => void;
  markAllShoppingListItemsChecked?: () => void;
  clearShoppingListChecks?: () => void;
  formatEuro?: (value?: number | null) => string;
  fixText?: (value: string) => string;
  setCheckedCartItems?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  shoppingItemRefs?: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;
  onIncreaseQuantity?: (itemId: string) => void;
  onDecreaseQuantity?: (itemId: string) => void;
  onRemoveItem?: (itemId: string) => void;
  onAddMore?: () => void;
  onClearCart?: () => void | boolean;
  onCompare?: () => void;
  cartSavePanelOpen?: boolean;
  onToggleSavePanel?: () => void;
  savedListName?: string;
  setSavedListName?: (value: string) => void;
  onSaveCurrentCartAsList?: () => void;
  savedShoppingLists?: AnyItem[];
  onAddSavedListToCart?: (listId: string) => void;
  onDeleteSavedShoppingList?: (listId: string) => void;
};

function fallbackFormatEuro(value?: number | null) {
  const numberValue = Number(value || 0);
  return `${numberValue.toFixed(2).replace(".", ",")} €`;
}

function normalizeName(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function getCartItemIdFromMatch(match: AnyItem) {
  return String(
    match?.cartItemId ||
      match?.cartItem?.id ||
      match?.item?.id ||
      match?.id ||
      match?.product?.id ||
      "",
  );
}

function buildFallbackKey(match: AnyItem, index: number) {
  return (
    getCartItemIdFromMatch(match) ||
    String(match?.product?.ean || match?.ean || "") ||
    `${String(match?.product?.id || match?.id || "item")}-${index}`
  );
}

export function ZiiplyCartCard(props: ZiiplyCartCardProps) {
  const {
    cart = props.items || [],
    shoppingListItems,
    checkedCartItems = {},
    checkedCount: checkedCountProp,
    shoppingListCount: shoppingListCountProp,
    shoppingProgressPercent: shoppingProgressPercentProp,
    cheapest,
    savings,
    getShoppingListItemKey,
    toggleShoppingListItem,
    onToggleShoppingListItem,
    onToggleCollected,
    markAllShoppingListItemsChecked,
    clearShoppingListChecks,
    formatEuro = fallbackFormatEuro,
    fixText = normalizeName,
    shoppingItemRefs,
    onIncreaseQuantity,
    onDecreaseQuantity,
    onRemoveItem,
    onAddMore,
    onClearCart,
    onCompare,
    cartSavePanelOpen,
    onToggleSavePanel,
    savedListName = "",
    setSavedListName,
    onSaveCurrentCartAsList,
    savedShoppingLists = [],
    onAddSavedListToCart,
    onDeleteSavedShoppingList,
  } = props;

  const [localSaveOpen, setLocalSaveOpen] = useState(false);
  const isSaveOpen = typeof cartSavePanelOpen === "boolean" ? cartSavePanelOpen : localSaveOpen;

  const hasItems = cart.length > 0;
  const listItems = useMemo(() => {
    if (shoppingListItems && shoppingListItems.length > 0) return shoppingListItems;
    return cart.map((item) => ({
      product: item.product || {
        id: item.id,
        name: item.name,
        ean: item.ean,
        pictureUrl: item.image,
        price: item.price || 0,
      },
      price: item.price || 0,
      quantity: item.quantity || 1,
      cartItemId: item.id,
    }));
  }, [cart, shoppingListItems]);

  const keys = useMemo(
    () => listItems.map((match, index) => getShoppingListItemKey?.(match, index) || buildFallbackKey(match, index)),
    [listItems, getShoppingListItemKey],
  );

  const checkedCount = checkedCountProp ?? keys.filter((key) => checkedCartItems[key]).length;
  const shoppingListCount = shoppingListCountProp ?? keys.length;
  const progress = shoppingProgressPercentProp ?? Math.round((checkedCount / Math.max(1, shoppingListCount)) * 100);
  const total = cart.reduce((sum, item) => sum + Number(item.price || 0) * Math.max(1, Number(item.quantity || 1)), 0);

  const toggleSavePanel = () => {
    if (onToggleSavePanel) onToggleSavePanel();
    else setLocalSaveOpen((value) => !value);
  };

  const closeSavePanel = () => {
    if (typeof cartSavePanelOpen === "boolean") {
      if (cartSavePanelOpen && onToggleSavePanel) onToggleSavePanel();
      return;
    }
    setLocalSaveOpen(false);
  };

  const handleSaveCurrent = () => {
    onSaveCurrentCartAsList?.();
    closeSavePanel();
  };

  const handleChooseSavedList = (listId: string) => {
    onAddSavedListToCart?.(listId);
    closeSavePanel();
  };

  const handleToggleItem = (match: AnyItem, index: number) => {
    if (toggleShoppingListItem) return toggleShoppingListItem(match, index);
    if (onToggleShoppingListItem) return onToggleShoppingListItem(match, index);
    if (onToggleCollected) return onToggleCollected(match, index);

    const key = keys[index];
    props.setCheckedCartItems?.((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[34px] border-[4px] border-[#5b482c] bg-[#f4e7c7] p-4 text-[#20301f] shadow-[0_0_0_2px_#d4b978_inset,0_16px_26px_rgba(60,45,20,0.28)]">
      <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:radial-gradient(#c7aa67_1px,transparent_1px)] [background-size:15px_15px]" />

      <div className="relative z-10 shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[15px] font-black uppercase tracking-[0.32em] text-[#68705a]">
              Kori ja keräily
            </div>
            <h2
              className="mt-1 text-[46px] font-black italic leading-none text-[#28402a]"
              style={{ fontFamily: '"Georgia", "Times New Roman", serif' }}
            >
              Ostoskori
            </h2>
            <p className="mt-2 text-[17px] font-black text-[#68604d]">
              {cart.length} tuotetta · {shoppingListCount} kerättävää
            </p>
          </div>

          <div className="rounded-[22px] border-[3px] border-[#826b3e] bg-[#efe1bd] px-5 py-3 text-center shadow-[0_0_0_2px_#f8edcf_inset]">
            <div className="text-[13px] font-black uppercase tracking-[0.28em] text-[#68705a]">
              Yhteensä
            </div>
            <div className="mt-1 whitespace-nowrap text-[32px] font-black text-[#286033]">
              {formatEuro(total)}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={hasItems ? onClearCart : undefined}
            disabled={!hasItems || !onClearCart}
            className="min-h-[50px] rounded-[18px] border border-[#8f4a23] bg-[#934519] px-4 text-[17px] font-black uppercase tracking-wide text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] disabled:cursor-not-allowed disabled:opacity-35"
          >
            Tyhjennä kori
          </button>
          <button
            type="button"
            onClick={toggleSavePanel}
            className="min-h-[50px] rounded-[18px] border-[2px] border-[#b99d64] bg-[#f1e3be] px-4 text-[16px] font-black uppercase tracking-wide text-[#283926] shadow-[0_0_0_2px_#f8edcf_inset]"
          >
            Näytä/tallenna vihkonen
          </button>
        </div>

        <div className="my-4 h-[3px] bg-[#b99d64]" />

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-[18px] border-[2px] border-[#c2a46d] bg-[#f6ecd2] p-3 text-center">
            <div className="text-[13px] font-black uppercase tracking-wide text-[#68705a]">Kerätty</div>
            <div className="text-[28px] font-black">{checkedCount}/{shoppingListCount}</div>
          </div>
          <div className="rounded-[18px] border-[2px] border-[#c2a46d] bg-[#f6ecd2] p-3 text-center">
            <div className="text-[13px] font-black uppercase tracking-wide text-[#68705a]">Valmis</div>
            <div className="text-[28px] font-black">{progress}%</div>
          </div>
          <div className="rounded-[18px] border-[2px] border-[#c2a46d] bg-[#f6ecd2] p-3 text-center">
            <div className="text-[13px] font-black uppercase tracking-wide text-[#68705a]">Säästö</div>
            <div className="text-[28px] font-black text-[#286033]">{formatEuro(savings || 0)}</div>
          </div>
        </div>

        <div className="mt-4 rounded-[24px] bg-[#182b1a] p-4 text-white shadow-[0_0_0_4px_#2a3d27_inset]">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[13px] font-black uppercase tracking-[0.28em] text-[#b4c89d]">Keräily kaupassa</div>
              <div className="mt-1 truncate text-[24px] font-black">
                {cheapest?.storeName || "Valitse halvin kori"}
              </div>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#12d664] text-[23px] font-black text-[#062311]">
              {progress}%
            </div>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/18">
            <div className="h-full rounded-full bg-[#12d664]" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-4 min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2 [scrollbar-gutter:stable]">
        {!hasItems ? (
          <div className="rounded-[28px] border-[2px] border-dashed border-[#b99d64] bg-[#f8eed2] px-5 py-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[18px] bg-[#e9d9af] text-2xl">🧺</div>
            <div className="mt-4 text-[24px] font-black text-[#28402a]">Kori on vielä tyhjä</div>
            <p className="mx-auto mt-2 max-w-[320px] text-[16px] font-bold leading-snug text-[#6b6656]">
              Lisää tuotteita hausta, tarjouksista tai Justiinalta.
            </p>
          </div>
        ) : (
          <div className="space-y-3 pb-3">
            {listItems.map((match, index) => {
              const key = keys[index];
              const product = match.product || match;
              const cartItemId = getCartItemIdFromMatch(match) || String(cart[index]?.id || key);
              const cartItem = cart.find((item) => String(item.id) === String(cartItemId)) || cart[index] || {};
              const quantity = Math.max(1, Number(match.quantity || cartItem.quantity || 1));
              const price = Number(match.price || cartItem.price || product.price || 0);
              const checked = Boolean(checkedCartItems[key]);
              const name = fixText(normalizeName(product.name || cartItem.name));
              const image = product.pictureUrl || product.image || cartItem.image;

              return (
                <article
                  key={key}
                  className={`grid h-[116px] grid-cols-[58px_64px_minmax(0,1fr)_70px] items-center gap-3 rounded-[24px] border-[2px] bg-[#f8efd7] px-3 shadow-[0_1px_0_#fff8df_inset] ${
                    checked ? "border-[#0b8c3d] opacity-70" : "border-[#d1b77d]"
                  }`}
                >
                  <button
                    ref={(node) => {
                      if (shoppingItemRefs?.current) shoppingItemRefs.current[key] = node;
                    }}
                    type="button"
                    onClick={() => handleToggleItem(match, index)}
                    className={`flex h-14 w-14 items-center justify-center rounded-full border-[3px] text-[21px] font-black transition active:scale-95 ${
                      checked
                        ? "border-[#07883a] bg-[#0b8c3d] text-white"
                        : "border-[#bfa66b] bg-[#fff8e8] text-[#7d6b43]"
                    }`}
                    aria-label={checked ? "Poista keräilymerkintä" : "Merkitse kerätyksi"}
                  >
                    {checked ? "✓" : index + 1}
                  </button>

                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[16px] border border-[#d6be84] bg-white">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <span className="text-2xl">🛒</span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className={`line-clamp-2 text-[18px] font-black leading-tight ${checked ? "line-through" : ""}`}>
                      {name}
                    </div>
                    <div className="mt-1 text-[16px] font-black text-[#6d6757]">{quantity} kpl</div>
                    <div className="mt-1 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onDecreaseQuantity?.(cartItemId)}
                        disabled={!onDecreaseQuantity || quantity <= 1}
                        className="h-8 w-10 rounded-[10px] border border-[#d0b77e] bg-[#efe2bd] text-[22px] font-black disabled:opacity-35"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        onClick={() => onIncreaseQuantity?.(cartItemId)}
                        disabled={!onIncreaseQuantity}
                        className="h-8 w-10 rounded-[10px] bg-[#0b8c3d] text-[22px] font-black text-white disabled:opacity-35"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveItem?.(cartItemId)}
                        disabled={!onRemoveItem}
                        className="h-8 rounded-[10px] bg-[#934519] px-3 text-[15px] font-black text-white disabled:opacity-35"
                      >
                        Pois
                      </button>
                    </div>
                  </div>

                  <div className="text-right text-[18px] font-black text-[#28402a]">
                    {price > 0 ? formatEuro(price * quantity) : "—"}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {hasItems && (
        <div className="relative z-10 mt-3 grid shrink-0 grid-cols-2 gap-3">
          <button
            type="button"
            onClick={markAllShoppingListItemsChecked}
            className="min-h-[48px] rounded-[18px] bg-[#0b8c3d] px-4 text-[16px] font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
          >
            Kaikki kerätty
          </button>
          <button
            type="button"
            onClick={clearShoppingListChecks}
            className="min-h-[48px] rounded-[18px] border-[2px] border-[#d0b77e] bg-[#efe2bd] px-4 text-[16px] font-black text-[#51442b]"
          >
            Nollaa keräily
          </button>
          <button
            type="button"
            onClick={onAddMore}
            className="min-h-[48px] rounded-[18px] border-[2px] border-[#b99d64] bg-[#fff6df] px-4 text-[16px] font-black text-[#28402a]"
          >
            Lisää tuotteita
          </button>
          <button
            type="button"
            onClick={onCompare}
            className="min-h-[48px] rounded-[18px] bg-[#243b23] px-4 text-[16px] font-black text-white"
          >
            Vertaile
          </button>
        </div>
      )}

      {isSaveOpen && (
        <div className="absolute inset-4 z-30 flex flex-col rounded-[28px] border-[3px] border-[#6f5732] bg-[#f3e5c3] p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[13px] font-black uppercase tracking-[0.25em] text-[#68705a]">Vihkonen</div>
              <div className="text-[28px] font-black italic text-[#28402a]" style={{ fontFamily: '"Georgia", serif' }}>
                Tallenna tai avaa ostoslista
              </div>
            </div>
            <button
              type="button"
              onClick={closeSavePanel}
              className="rounded-full border border-[#b99d64] bg-[#fff6df] px-4 py-2 text-sm font-black"
            >
              Sulje
            </button>
          </div>

          <div className="mt-4 flex gap-2">
            <input
              value={savedListName}
              onChange={(event) => setSavedListName?.(event.target.value)}
              placeholder="Nimeä vihkonen"
              className="min-h-[46px] min-w-0 flex-1 rounded-[16px] border-[2px] border-[#c8ad72] bg-[#fff8e8] px-4 text-[16px] font-black outline-none"
            />
            <button
              type="button"
              onClick={handleSaveCurrent}
              disabled={!hasItems}
              className="rounded-[16px] bg-[#0b8c3d] px-5 text-[16px] font-black text-white disabled:opacity-35"
            >
              Tallenna
            </button>
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
            {savedShoppingLists.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-[#b99d64] bg-[#fff6df] p-4 text-center font-bold text-[#6b6656]">
                Ei tallennettuja vihkosia vielä.
              </div>
            ) : (
              <div className="space-y-2">
                {savedShoppingLists.map((list) => (
                  <div
                    key={list.id}
                    className="flex items-center justify-between gap-3 rounded-[18px] border border-[#d0b77e] bg-[#fff6df] p-3"
                  >
                    <button
                      type="button"
                      onClick={() => handleChooseSavedList(String(list.id))}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="truncate text-[17px] font-black text-[#28402a]">{list.name}</div>
                      <div className="text-sm font-bold text-[#6b6656]">{Array.isArray(list.items) ? list.items.length : 0} tuotetta</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSavedShoppingList?.(String(list.id))}
                      className="rounded-[12px] bg-[#934519] px-3 py-2 text-sm font-black text-white"
                    >
                      Poista
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default ZiiplyCartCard;
