"use client";

// ZIIPLY_MOBILE_CART_VIEW_V4_FULL_HEIGHT_OVERLAY: kori-overlay alkaa ylhäältä; topbar ei jää näkyviin taustalle.

// ZIIPLY_MOBILE_CART_VIEW_TOGGLE_SIGNATURE_FIX: accepts P394 toggleShoppingListItem(match, index).

// ZIIPLY_MOBILE_CART_VIEW_GROUPS_RECORD_FIX: bestShoppingListGroups accepts P394 Record<string, Match[]> shape.

import React from "react";
import * as ZiiplyCartCardModule from "../cards/ZiiplyCartCard";

const ZiiplyCartCard = ((ZiiplyCartCardModule as any).default ||
  (ZiiplyCartCardModule as any).ZiiplyCartCard ||
  (ZiiplyCartCardModule as any).CartResponsiveCard ||
  (ZiiplyCartCardModule as any).ZiiplyCartResponsiveCard) as any;

export type ZiiplyMobileCartViewProps = {
  cartModalOpen?: boolean;
  closing?: boolean;
  cartOverlayScrollRef?: React.RefObject<HTMLDivElement | null>;
  onClose?: () => void;
  className?: string;

  cart: any[];
  shoppingListItems?: any[];
  checkedCartItems?: Record<string, boolean>;
  checkedCount?: number;
  shoppingListCount?: number;
  shoppingProgressPercent?: number;

  cheapest?: any;
  secondCheapest?: any;
  savings?: number;
  savingsPercent?: number;
  bestShoppingListGroups?: any[] | Record<string, any[]>;

  getShoppingListItemKey?: (...args: any[]) => string;
  toggleShoppingListItem?: (...args: any[]) => void;
  markAllShoppingListItemsChecked?: () => void;
  clearShoppingListChecks?: () => void;

  formatEuro?: (value: number) => string;
  fixText?: (value: string) => string;
  setCheckedCartItems?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  shoppingItemRefs?: React.MutableRefObject<Record<string, HTMLButtonElement | null>>;

  onIncreaseQuantity?: (itemId: string) => void;
  onDecreaseQuantity?: (itemId: string) => void;
  onRemoveItem?: (itemId: string) => void;
  onAddMore?: () => void;
  onOpenSearch?: () => void;
  onSearchClick?: () => void;
  onAddProduct?: () => void;
  onContinueShopping?: () => void;
  onClearCart?: () => void;
  onCompare?: () => void;

  cartSavePanelOpen?: boolean;
  onToggleSavePanel?: () => void;
  savedListName?: string;
  setSavedListName?: React.Dispatch<React.SetStateAction<string>>;
  onSaveCurrentCartAsList?: () => void;
  savedShoppingLists?: any[];
  onAddSavedListToCart?: (list: any) => void;
  onDeleteSavedShoppingList?: (listId: string) => void;
};

export default function ZiiplyMobileCartView({
  cartModalOpen = true,
  closing = false,
  cartOverlayScrollRef,
  onClose,
  className = "",

  cart,
  shoppingListItems = [],
  checkedCartItems = {},
  checkedCount = 0,
  shoppingListCount = 0,
  shoppingProgressPercent = 0,

  cheapest = null,
  secondCheapest = null,
  savings = 0,
  savingsPercent = 0,
  bestShoppingListGroups = [],

  getShoppingListItemKey = (item: any) => String(item?.id ?? item?.name ?? ""),
  toggleShoppingListItem = () => undefined,
  markAllShoppingListItemsChecked = () => undefined,
  clearShoppingListChecks = () => undefined,

  formatEuro = (value: number) =>
    Number(value || 0).toLocaleString("fi-FI", {
      style: "currency",
      currency: "EUR",
    }),
  fixText = (value: string) => String(value || ""),
  setCheckedCartItems,
  shoppingItemRefs,

  onIncreaseQuantity = () => undefined,
  onDecreaseQuantity = () => undefined,
  onRemoveItem = () => undefined,
  onAddMore = () => undefined,
  onOpenSearch,
  onSearchClick,
  onAddProduct,
  onContinueShopping,
  onClearCart = () => undefined,
  onCompare = () => undefined,

  cartSavePanelOpen = false,
  onToggleSavePanel = () => undefined,
  savedListName = "",
  setSavedListName,
  onSaveCurrentCartAsList = () => undefined,
  savedShoppingLists = [],
  onAddSavedListToCart = () => undefined,
  onDeleteSavedShoppingList = () => undefined,
}: ZiiplyMobileCartViewProps) {
  if (!cartModalOpen) return null;

  const safeSetCheckedCartItems =
    setCheckedCartItems ||
    (((_value: any) => undefined) as React.Dispatch<
      React.SetStateAction<Record<string, boolean>>
    >);

  const safeShoppingItemRefs =
    shoppingItemRefs ||
    ({ current: {} } as React.MutableRefObject<Record<string, HTMLButtonElement | null>>);

  const safeSetSavedListName =
    setSavedListName ||
    (((_value: any) => undefined) as React.Dispatch<React.SetStateAction<string>>);

  function handleAddMoreFromCartView() {
    const handler =
      onAddMore ||
      onOpenSearch ||
      onSearchClick ||
      onAddProduct ||
      onContinueShopping;

    if (typeof handler === "function") {
      handler();
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[92] block bg-[#eef7f2]/98 px-2 pb-[calc(env(safe-area-inset-bottom)+5.95rem)] pt-[calc(env(safe-area-inset-top)+0.45rem)] backdrop-blur-md sm:hidden ${
        closing ? "ziiply-soft-close" : "ziiply-soft-open"
      }`}
    >
      <div
        ref={cartOverlayScrollRef}
        className="mx-auto h-full max-w-[34rem] overflow-y-auto rounded-[2rem] bg-white/0 p-0 shadow-none ring-0"
      >
        {onClose && (
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 shadow-sm active:scale-95"
            >
              Sulje
            </button>
          </div>
        )}

        <div className={`ziiply-cart-retro-fix ${className}`}>
          {/* ZIIPLY_CART_ADD_MORE_SAFE_BUTTON:
              Vanhan P394:n Lisää tuote -toiminto kutsui openSearchPanel-funktiota.
              Tämä varmistaa, että toiminto ei jää riippumaan ZiiplyCartCardin sisäisestä prop-nimestä. */}
          <div className="hidden">
            <button
              type="button"
              onClick={handleAddMoreFromCartView}
              className="rounded-full bg-green-700 px-5 py-2.5 text-sm font-black text-white shadow-md shadow-green-700/20 active:scale-95"
            >
              Lisää tuote
            </button>
          </div>

          <ZiiplyCartCard
            cart={cart}
            shoppingListItems={shoppingListItems}
            checkedCartItems={checkedCartItems}
            checkedCount={checkedCount}
            shoppingListCount={shoppingListCount}
            shoppingProgressPercent={shoppingProgressPercent}
            cheapest={cheapest}
            secondCheapest={secondCheapest}
            savings={savings}
            savingsPercent={savingsPercent}
            bestShoppingListGroups={bestShoppingListGroups}
            getShoppingListItemKey={getShoppingListItemKey}
            toggleShoppingListItem={toggleShoppingListItem}
            onToggleShoppingListItem={toggleShoppingListItem}
            onToggleCollected={toggleShoppingListItem}
            markAllShoppingListItemsChecked={markAllShoppingListItemsChecked}
            clearShoppingListChecks={clearShoppingListChecks}
            formatEuro={formatEuro}
            fixText={fixText}
            setCheckedCartItems={safeSetCheckedCartItems}
            shoppingItemRefs={safeShoppingItemRefs}
            onIncreaseQuantity={onIncreaseQuantity}
            onDecreaseQuantity={onDecreaseQuantity}
            onRemoveItem={onRemoveItem}
            onAddMore={handleAddMoreFromCartView}
            onOpenSearch={handleAddMoreFromCartView}
            onSearchClick={handleAddMoreFromCartView}
            onAddProduct={handleAddMoreFromCartView}
            onContinueShopping={handleAddMoreFromCartView}
            onClearCart={onClearCart}
            onCompare={onCompare}
            cartSavePanelOpen={cartSavePanelOpen}
            onToggleSavePanel={onToggleSavePanel}
            savedListName={savedListName}
            setSavedListName={safeSetSavedListName}
            onSaveCurrentCartAsList={onSaveCurrentCartAsList}
            savedShoppingLists={savedShoppingLists}
            onAddSavedListToCart={onAddSavedListToCart}
            onDeleteSavedShoppingList={onDeleteSavedShoppingList}
          />
        </div>
      </div>
    </div>
  );
}

export { ZiiplyMobileCartView };
