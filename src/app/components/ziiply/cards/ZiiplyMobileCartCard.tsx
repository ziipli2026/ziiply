"use client";

// ZIIPLY_MOBILE_CART_CARD_V1_PAPER_LIST
// Mobiilin ostoskori / keräilylista vanhan paperivihkon hengessä.
// Taustakuva: public/ui/cart/vihkonen.webp -> /ui/cart/vihkonen.webp

import React from "react";

export type ZiiplyMobileCartItem = {
  id?: string | number;
  ean?: string | number;
  name?: string;
  title?: string;
  productName?: string;
  brandName?: string;
  quantity?: number;
  amount?: number;
  price?: number | string;
  image?: string;
  imageUrl?: string;
  pictureUrl?: string;
  checked?: boolean;
  [key: string]: any;
};

export type ZiiplyMobileCartCardProps = {
  open?: boolean;
  title?: string;
  items?: ZiiplyMobileCartItem[];
  savedListsCount?: number;
  onClose?: () => void;
  onSaveList?: () => void;
  onOpenSavedLists?: () => void;
  onClearCart?: () => void;
  onRemoveItem?: (item: ZiiplyMobileCartItem) => void;
  onToggleItem?: (item: ZiiplyMobileCartItem) => void;
  onCompare?: () => void;
  className?: string;
};

const cooperFont = '"Cooper Black", "Cooper Std Black", Georgia, serif';
const copperplateFont = '"Copperplate", "Baskerville", Georgia, serif';
const serifFont = '"Baskerville", Georgia, serif';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getName(item: ZiiplyMobileCartItem) {
  return String(item.name || item.title || item.productName || item.brandName || "Tuote");
}

function getImage(item: ZiiplyMobileCartItem) {
  return String(item.image || item.imageUrl || item.pictureUrl || "");
}

function normalizePrice(price: unknown) {
  if (typeof price === "number" && Number.isFinite(price)) {
    const euros = Math.abs(price) > 20 ? price / 100 : price;
    return euros.toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  }

  const text = String(price ?? "").trim();
  if (!text) return "";

  const numeric = Number(text.replace(/\s/g, "").replace("€", "").replace(",", "."));
  if (Number.isFinite(numeric)) {
    const euros = Math.abs(numeric) > 20 ? numeric / 100 : numeric;
    return euros.toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
  }

  return text.includes("€") ? text : `${text} €`;
}

function shortName(name: string) {
  const clean = name.replace(/\s+/g, " ").trim();
  return clean.length <= 38 ? clean : clean.slice(0, 35).trimEnd() + "…";
}

function PaperButton({
  children,
  onClick,
  disabled,
  compact = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "rounded-[1rem] border-[2px] border-[#8a6b32] bg-[#fff1c6] font-black text-[#4e3614] shadow-[0_3px_0_rgba(91,72,44,0.22),inset_0_0_0_1px_rgba(255,255,255,0.5)] active:translate-y-[1px]",
        compact ? "px-2.5 py-1.5 text-[0.72rem]" : "px-3.5 py-2 text-[0.82rem]",
        disabled && "cursor-not-allowed opacity-45",
      )}
      style={{ fontFamily: cooperFont }}
    >
      {children}
    </button>
  );
}

export default function ZiiplyMobileCartCard({
  open = true,
  title = "Keräilylista",
  items = [],
  savedListsCount = 0,
  onClose,
  onSaveList,
  onOpenSavedLists,
  onClearCart,
  onRemoveItem,
  onToggleItem,
  onCompare,
  className = "",
}: ZiiplyMobileCartCardProps) {
  if (!open) return null;

  const hasItems = items.length > 0;
  const totalPrice = items.reduce((sum, item) => {
    const value = item.price;
    const numeric =
      typeof value === "number"
        ? value
        : Number(String(value ?? "").replace(/\s/g, "").replace("€", "").replace(",", "."));
    if (!Number.isFinite(numeric)) return sum;
    return sum + (Math.abs(numeric) > 20 ? numeric / 100 : numeric);
  }, 0);

  return (
    <div
      className={`fixed inset-0 z-[86] flex items-end justify-center bg-slate-950/18 px-2 pb-[calc(env(safe-area-inset-bottom)+5.65rem)] pt-[calc(env(safe-area-inset-top)+5.4rem)] backdrop-blur-[2px] sm:hidden ${className}`}
    >
      <section className="relative flex h-[min(74dvh,39rem)] w-full max-w-[28rem] flex-col overflow-visible rounded-[2.1rem] border-[4px] border-[#6b512a] bg-[#e4c889] shadow-[0_12px_0_rgba(60,45,20,0.22),0_24px_52px_rgba(0,0,0,0.28)]">
        <div
          className="pointer-events-none absolute inset-[0.35rem] rounded-[1.75rem] bg-[#f7edcf] bg-cover bg-center opacity-95"
          style={{ backgroundImage: "url('/ui/cart/vihkonen.webp')" }}
        />
        <div className="pointer-events-none absolute inset-[0.35rem] rounded-[1.75rem] bg-[linear-gradient(180deg,rgba(255,250,226,0.52),rgba(238,214,156,0.2))]" />
        <div className="pointer-events-none absolute inset-[0.35rem] rounded-[1.75rem] opacity-25 [background-image:repeating-linear-gradient(0deg,transparent_0px,transparent_31px,rgba(123,91,38,0.28)_32px)]" />

        <header className="relative z-10 shrink-0 px-5 pb-3 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div
                className="text-[0.72rem] font-black uppercase tracking-[0.42em] text-[#7a6842]"
                style={{ fontFamily: copperplateFont }}
              >
                Ostoskori
              </div>

              <h2
                className="mt-1 text-[1.95rem] font-black italic leading-none text-[#213b25] drop-shadow-[0_1px_0_#fff3cf]"
                style={{ fontFamily: cooperFont }}
              >
                {title}
              </h2>

              <div className="mt-1 text-[0.78rem] font-black text-[#806b43]" style={{ fontFamily: serifFont }}>
                {items.length} merkintää
                {hasItems
                  ? ` · yhteensä ${totalPrice.toLocaleString("fi-FI", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} €`
                  : ""}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="grid h-[2.7rem] w-[2.7rem] shrink-0 place-items-center rounded-full border-[3px] border-[#6f5730] bg-[#fff2cb] text-[1.35rem] font-black leading-none text-[#513d1f] shadow-[0_3px_0_rgba(91,72,44,0.24)] active:translate-y-[1px]"
              aria-label="Sulje kori"
              title="Sulje"
            >
              ×
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <PaperButton onClick={onSaveList} disabled={!hasItems}>Tallenna</PaperButton>
            <PaperButton onClick={onOpenSavedLists}>Vihkoset{savedListsCount ? ` ${savedListsCount}` : ""}</PaperButton>
            <PaperButton onClick={onClearCart} disabled={!hasItems}>Tyhjennä</PaperButton>
          </div>
        </header>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {!hasItems ? (
            <div className="mt-5 rounded-[1.35rem] border-[2px] border-dashed border-[#9a7a3d] bg-[#fff4d4]/75 px-4 py-8 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.55)]">
              <div className="text-[1.1rem] font-black italic text-[#59401e]" style={{ fontFamily: cooperFont }}>
                Vihkonen on vielä tyhjä
              </div>
              <div className="mt-2 text-[0.82rem] font-black text-[#8a7650]">
                Lisää löydöksiä koriin, niin keräilylista täyttyy.
              </div>
            </div>
          ) : (
            <div className="space-y-2.5 pb-2">
              {items.map((item, index) => {
                const name = getName(item);
                const image = getImage(item);
                const price = normalizePrice(item.price);
                const checked = Boolean(item.checked);
                const quantity = Number(item.quantity ?? item.amount ?? 1);

                return (
                  <article
                    key={String(item.id ?? item.ean ?? index)}
                    className={cx(
                      "grid grid-cols-[2.55rem_minmax(0,1fr)_auto] items-center gap-2.5 rounded-[1.05rem] border-b-[2px] border-[#c9a85c]/80 bg-[#fff7dc]/50 px-2.5 py-2 shadow-[0_1px_0_rgba(255,255,255,0.45)_inset]",
                      checked && "opacity-55",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleItem?.(item)}
                      className={cx(
                        "grid h-[2.25rem] w-[2.25rem] place-items-center rounded-full border-[2px] text-[1rem] font-black shadow-[0_2px_0_rgba(91,72,44,0.18)]",
                        checked ? "border-[#3b6c31] bg-[#d9edc8] text-[#23591f]" : "border-[#96733c] bg-[#fff1c6] text-[#7b5f32]",
                      )}
                      aria-label={checked ? "Poista merkintä" : "Merkitse kerätyksi"}
                    >
                      {checked ? "✓" : index + 1}
                    </button>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {image ? (
                          <span className="grid h-[2.4rem] w-[2.4rem] shrink-0 place-items-center overflow-hidden rounded-[0.55rem] bg-white/80 shadow-inner">
                            <img src={image} alt="" className="h-full w-full object-contain p-1" loading="lazy" />
                          </span>
                        ) : null}

                        <div className="min-w-0">
                          <div
                            className={cx("truncate text-[1rem] font-black leading-[1.05] text-[#2b291c]", checked && "line-through")}
                            style={{ fontFamily: serifFont }}
                          >
                            {shortName(name)}
                          </div>
                          <div className="mt-0.5 text-[0.72rem] font-black text-[#8a7650]">
                            {quantity > 1 ? `${quantity} kpl` : "1 kpl"}
                            {price ? ` · ${price}` : ""}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem?.(item)}
                      className="rounded-[0.8rem] border-[2px] border-[#9a6137] bg-[#ffe3bf] px-2 py-1 text-[0.72rem] font-black text-[#7d3414] shadow-[0_2px_0_rgba(91,72,44,0.14)] active:translate-y-[1px]"
                      aria-label="Poista korista"
                    >
                      Pois
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <footer className="relative z-10 shrink-0 px-5 pb-5 pt-2">
          <button
            type="button"
            onClick={onCompare}
            disabled={!hasItems}
            className={cx(
              "w-full rounded-[1.35rem] border-[3px] border-[#0b6330] bg-gradient-to-b from-[#139143] to-[#087237] px-4 py-3 text-[1rem] font-black italic text-[#fff0d5] shadow-[0_0_0_2px_rgba(255,255,255,0.18)_inset,0_4px_0_#064a26] active:translate-y-[1px]",
              !hasItems && "cursor-not-allowed opacity-45",
            )}
            style={{ fontFamily: cooperFont }}
          >
            Vertaa keräilylista
          </button>
        </footer>

        <div className="pointer-events-none absolute -bottom-[0.72rem] left-[1.1rem] right-[1.1rem] h-[1.3rem] rounded-[50%] bg-[#cfaa61] opacity-55 blur-[1px]" />
      </section>
    </div>
  );
}

export { ZiiplyMobileCartCard };
