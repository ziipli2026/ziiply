"use client";

// ZIIPLY_MOBILE_CART_CARD_V2_TAVARAINKERUU_PAPER
// Mobiilin ostoskori / Tavarainkeruu vanhan paperivihkon hengessä.
// Käyttää kuvaa: public/ui/cart/vihkonen.webp -> /ui/cart/vihkonen.webp
// V2:
// - paperi skaalattu leveämmäksi
// - otsikko: OSTOSKORI / Tavarainkeruu
// - toiminnot: Tallenna + Näytä ostoslistat
// - tuoterivit listamaisiksi, ei moderneiksi korteiksi
// - vertailu pienempänä retro-emalipainikkeena

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

function getNumericPrice(price: unknown) {
  if (typeof price === "number" && Number.isFinite(price)) {
    return Math.abs(price) > 20 ? price / 100 : price;
  }

  const numeric = Number(String(price ?? "").replace(/\s/g, "").replace("€", "").replace(",", "."));
  if (!Number.isFinite(numeric)) return 0;

  return Math.abs(numeric) > 20 ? numeric / 100 : numeric;
}

function shortName(name: string) {
  const clean = name.replace(/\s+/g, " ").trim();
  return clean.length <= 42 ? clean : clean.slice(0, 39).trimEnd() + "…";
}

function LedgerButton({
  children,
  onClick,
  disabled,
  wide = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "rounded-[0.72rem] border-[2px] border-[#8a6b32] bg-[#fff0c7]/90 px-2.5 py-1.5 text-[0.72rem] font-black leading-none text-[#533819] shadow-[0_2px_0_rgba(91,72,44,0.18),inset_0_0_0_1px_rgba(255,255,255,0.55)] active:translate-y-[1px]",
        wide && "min-w-[7.8rem]",
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
  title = "Tavarainkeruu",
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
  const totalPrice = items.reduce((sum, item) => sum + getNumericPrice(item.price), 0);

  return (
    <div
      className={`fixed inset-0 z-[86] flex items-end justify-center bg-slate-950/14 px-2 pb-[calc(env(safe-area-inset-bottom)+5.55rem)] pt-[calc(env(safe-area-inset-top)+5.25rem)] backdrop-blur-[1.5px] sm:hidden ${className}`}
    >
      <section className="relative flex h-[min(74dvh,39rem)] w-full max-w-[28rem] flex-col overflow-visible rounded-[2.1rem] border-[4px] border-[#6b512a] bg-[#d7b76e] shadow-[0_12px_0_rgba(60,45,20,0.22),0_24px_52px_rgba(0,0,0,0.27)]">
        <div
          className="pointer-events-none absolute inset-[0.24rem] rounded-[1.78rem] bg-[#f7edcf] bg-center bg-no-repeat opacity-100"
          style={{
            backgroundImage: "url('/ui/cart/vihkonen.webp')",
            backgroundSize: "144% 104%",
          }}
        />
        <div className="pointer-events-none absolute inset-[0.24rem] rounded-[1.78rem] bg-[linear-gradient(180deg,rgba(255,250,226,0.38),rgba(238,214,156,0.13))]" />
        <div className="pointer-events-none absolute inset-[0.24rem] rounded-[1.78rem] opacity-18 [background-image:repeating-linear-gradient(0deg,transparent_0px,transparent_31px,rgba(123,91,38,0.32)_32px)]" />

        <header className="relative z-10 shrink-0 px-5 pb-2 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div
                className="text-[0.7rem] font-black uppercase tracking-[0.42em] text-[#7a6842]"
                style={{ fontFamily: copperplateFont }}
              >
                Ostoskori
              </div>

              <h2
                className="mt-1 text-[2.02rem] font-black italic leading-none text-[#213b25] drop-shadow-[0_1px_0_#fff3cf]"
                style={{ fontFamily: cooperFont }}
              >
                {title}
              </h2>

              <div
                className="mt-1 text-[0.76rem] font-black text-[#806b43]"
                style={{ fontFamily: serifFont }}
              >
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
              className="grid h-[2.45rem] w-[2.45rem] shrink-0 place-items-center rounded-full border-[3px] border-[#6f5730] bg-[#fff2cb] text-[1.28rem] font-black leading-none text-[#513d1f] shadow-[0_3px_0_rgba(91,72,44,0.22)] active:translate-y-[1px]"
              aria-label="Sulje kori"
              title="Sulje"
            >
              ×
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <LedgerButton onClick={onSaveList} disabled={!hasItems}>
              Tallenna
            </LedgerButton>

            <LedgerButton onClick={onOpenSavedLists} wide>
              Näytä ostoslistat{savedListsCount ? ` ${savedListsCount}` : ""}
            </LedgerButton>

            {hasItems && (
              <button
                type="button"
                onClick={onClearCart}
                className="ml-auto rounded-[0.65rem] border-[2px] border-[#9a6137] bg-[#ffe0bc]/80 px-2.5 py-1.5 text-[0.68rem] font-black leading-none text-[#7d3414] shadow-[0_2px_0_rgba(91,72,44,0.12)] active:translate-y-[1px]"
              >
                Tyhjennä
              </button>
            )}
          </div>
        </header>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {!hasItems ? (
            <div className="mt-5 rounded-[1.1rem] border-[2px] border-dashed border-[#9a7a3d] bg-[#fff4d4]/54 px-4 py-8 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)]">
              <div className="text-[1.08rem] font-black italic text-[#59401e]" style={{ fontFamily: cooperFont }}>
                Vihkonen on vielä tyhjä
              </div>
              <div className="mt-2 text-[0.8rem] font-black text-[#8a7650]">
                Lisää löydöksiä koriin, niin tavarainkeruu täyttyy.
              </div>
            </div>
          ) : (
            <div className="space-y-[0.36rem] pb-2">
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
                      "grid grid-cols-[2rem_minmax(0,1fr)_auto_auto] items-center gap-2 border-b-[1.5px] border-[#b9944d]/70 bg-[#fff7dc]/18 px-1.5 py-[0.42rem]",
                      checked && "opacity-55",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleItem?.(item)}
                      className={cx(
                        "grid h-[1.75rem] w-[1.75rem] place-items-center rounded-full border-[2px] text-[0.78rem] font-black shadow-[0_1px_0_rgba(91,72,44,0.16)]",
                        checked
                          ? "border-[#3b6c31] bg-[#d9edc8] text-[#23591f]"
                          : "border-[#96733c] bg-[#fff1c6] text-[#7b5f32]",
                      )}
                      aria-label={checked ? "Poista merkintä" : "Merkitse kerätyksi"}
                    >
                      {checked ? "✓" : index + 1}
                    </button>

                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        {image ? (
                          <span className="grid h-[2.05rem] w-[2.05rem] shrink-0 place-items-center overflow-hidden rounded-[0.42rem] bg-white/65 shadow-inner">
                            <img src={image} alt="" className="h-full w-full object-contain p-0.5" loading="lazy" />
                          </span>
                        ) : null}

                        <div className="min-w-0">
                          <div
                            className={cx(
                              "truncate text-[0.96rem] font-black leading-[1.04] text-[#2b291c]",
                              checked && "line-through",
                            )}
                            style={{ fontFamily: serifFont }}
                          >
                            {shortName(name)}
                          </div>

                          <div className="mt-[1px] text-[0.64rem] font-black leading-none text-[#8a7650]">
                            {quantity > 1 ? `${quantity} kpl` : "1 kpl"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="min-w-[4.05rem] text-right text-[0.86rem] font-black text-[#3f321f]" style={{ fontFamily: serifFont }}>
                      {price}
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveItem?.(item)}
                      className="grid h-[1.72rem] w-[1.72rem] place-items-center rounded-full border-[2px] border-[#9a6137] bg-[#ffe3bf]/82 text-[0.72rem] font-black leading-none text-[#7d3414] shadow-[0_1px_0_rgba(91,72,44,0.12)] active:translate-y-[1px]"
                      aria-label="Poista korista"
                      title="Poista"
                    >
                      ×
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <footer className="relative z-10 shrink-0 px-5 pb-5 pt-2">
          <div className="mb-2 flex items-center justify-between border-t-[2px] border-[#9b7b3d]/70 pt-2 text-[#473719]">
            <span className="text-[0.8rem] font-black uppercase tracking-[0.16em]" style={{ fontFamily: copperplateFont }}>
              Yhteissumma
            </span>
            <span className="text-[1.05rem] font-black" style={{ fontFamily: serifFont }}>
              {totalPrice.toLocaleString("fi-FI", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} €
            </span>
          </div>

          <button
            type="button"
            onClick={onCompare}
            disabled={!hasItems}
            className={cx(
              "mx-auto block rounded-[1rem] border-[3px] border-[#0b6330] bg-gradient-to-b from-[#139143] to-[#087237] px-5 py-2 text-[0.88rem] font-black italic text-[#fff0d5] shadow-[0_0_0_2px_rgba(255,255,255,0.18)_inset,0_3px_0_#064a26] active:translate-y-[1px]",
              !hasItems && "cursor-not-allowed opacity-45",
            )}
            style={{ fontFamily: cooperFont }}
          >
            Tee hintavertailu
          </button>
        </footer>

        <div className="pointer-events-none absolute -bottom-[0.72rem] left-[1.1rem] right-[1.1rem] h-[1.3rem] rounded-[50%] bg-[#cfaa61] opacity-55 blur-[1px]" />
      </section>
    </div>
  );
}

export { ZiiplyMobileCartCard };
