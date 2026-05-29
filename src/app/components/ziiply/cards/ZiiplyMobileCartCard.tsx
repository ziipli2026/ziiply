"use client";

// ZIIPLY_MOBILE_CART_CARD_V16_COORDINATE_TOTAL_FORMAT_FIX
// Mobiilin Tavarainkeruu-paperivihko.
// V3:
// - "Ostoskori" poistettu kokonaan näkyvästä UI:sta.
// - Tavarainkeruu sovitettu taustapaperiin kevyempänä mustekirjoituksena.
// - Tuoterivit sarakkeisiin: N:o | Nimike | Määrä | Hinta | poisto.
// - Määrä näkyy vain MÄÄRÄ-sarakkeessa, ei tuotteen nimen alla.
// - Määrässä pienet − / + säätimet samassa sarakkeessa.
// - Keräilymerkki on vanhanaikainen numero/✓ ilman modernia nappirinkulaa.
// - Tuotenimi lyhennetään sanasta 2 + seuraava sana.
// - Halpuusvertailu-termi käytössä.
// - Lista scrollaa näkymättömästi.
// - Kortilla pieni sisääntulopomppu.
// V4: yläosan tekstit ja toiminnot sovitettu paremmin paperin omaan painatukseen.
// V5: Tavarainkeruu siirretty Pvm-kohdan vasemmalle puolelle pienempänä; määräsolusta tehty sormiystävällinen; N:o-merkki keskitetty ja suurennettu.
// V6: poisto-X siirretty hinnan vasemmalle puolelle, jotta HINTA-sarake jää puhtaaksi.
// V7: määrä/poisto/hinta kohdistettu paperisarakeisiin; alkoholijuomat näkyvät keräilyssä mutta eivät kuulu yhteissummaan.
// V8: alkoholin yhteissummalaskenta ei enää riipu myöhemmin määritellyistä getCartItemQuantity/readCartItemPrice-funktioista.
// V9: korjaa hasAlcoholItemsV7 → hasAlcoholItemsV8 nimeämisvirheen buildissä.
// V10: varmistaa, että hasAlcoholItemsV8 määritellään komponentin sisällä ennen renderiä.
// V11: korjaa hasAlcoholItemsV8-muuttujan scopen ja vaihtaa pääkomponentin yhteissumman alkoholittomaksi.
// V12: vain koordinaatti/UI-säätö; Tavarainkeruu hieman ylemmäs ja erillinen poisto-ruksi korvattu hinta/kassa-tekstin painalluksella.
// V13: sulje-nappi kohdistettu A. Virtanen -tekstin vaakatasoon ja symboli pehmennetty.

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
  onIncreaseItem?: (item: ZiiplyMobileCartItem) => void;
  onDecreaseItem?: (item: ZiiplyMobileCartItem) => void;
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

function ledgerName(name: string) {
  const words = name
    .replace(/[,.()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

  if (words.length <= 1) return words[0] || "Tuote";

  const picked = words.slice(1, 3);
  return picked.join(" ");
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
        "rounded-[0.54rem] border-[1.5px] border-[#8a6b32] bg-[#fff0c7]/72 px-2.5 py-[0.42rem] text-[0.62rem] font-black leading-none text-[#533819] shadow-[0_1px_0_rgba(91,72,44,0.12),inset_0_0_0_1px_rgba(255,255,255,0.42)] active:translate-y-[1px]",
        wide && "min-w-[7.45rem]",
        disabled && "cursor-not-allowed opacity-45",
      )}
      style={{ fontFamily: cooperFont }}
    >
      {children}
    </button>
  );
}


function getCartItemQuantityForTotalV8(item: ZiiplyMobileCartItem) {
  const quantity = Number((item as any).quantity ?? (item as any).amount ?? 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function readCartItemPriceForTotalV8(item: ZiiplyMobileCartItem) {
  const normalizeTotalPrice = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return Math.abs(value) > 20 ? value / 100 : value;
  };

  const candidates = [
    (item as any).price,
    (item as any).unitPrice,
    (item as any).currentPrice,
    (item as any).product?.price,
    (item as any).product?.unitPrice,
    (item as any).product?.currentPrice,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return normalizeTotalPrice(candidate);
    }

    if (typeof candidate === "string") {
      const normalized = candidate.replace(/\s/g, "").replace(",", ".");
      const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
      if (Number.isFinite(parsed)) return normalizeTotalPrice(parsed);
    }
  }

  return 0;
}

function isAlcoholCartItemV8(item: ZiiplyMobileCartItem) {
  const text = [
    item.name,
    (item as any).brand,
    (item as any).category,
    (item as any).categoryName,
    (item as any).productGroup,
    (item as any).department,
    (item as any).product?.name,
    (item as any).product?.category,
    (item as any).product?.categoryName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return /\b(olut|lonkero|siideri|viini|kuohuviini|alkoholijuoma|alkoholi|gin|vodka|rommi|viski|whisky|konjakki|brandy)\b/.test(
    text,
  );
}

function getDisplayCartTotalV8(items: ZiiplyMobileCartItem[]) {
  return items.reduce((sum, item) => {
    if (isAlcoholCartItemV8(item)) return sum;

    const quantity = getCartItemQuantityForTotalV8(item);
    const unitPrice = readCartItemPriceForTotalV8(item);

    return sum + unitPrice * quantity;
  }, 0);
}

function hasAlcoholCartItemsV8(items: ZiiplyMobileCartItem[]) {
  return items.some(isAlcoholCartItemV8);
}

function QuantityCell({
  item,
  quantity,
  onDecrease,
  onIncrease,
}: {
  item: ZiiplyMobileCartItem;
  quantity: number;
  onDecrease?: (item: ZiiplyMobileCartItem) => void;
  onIncrease?: (item: ZiiplyMobileCartItem) => void;
}) {
  const canDecrease = quantity > 1;

  return (
    <div className="relative grid h-[2.05rem] w-full place-items-center">
      <button
        type="button"
        onClick={() => onIncrease?.(item)}
        className="grid h-full w-full place-items-center pl-[1.10rem] rounded-[0.32rem] bg-[#fff1c6]/10 text-[0.98rem] font-black leading-none text-[#3d301a] active:translate-y-[1px] active:bg-[#fff1c6]/34"
        style={{ fontFamily: serifFont }}
        aria-label="Lisää määrää"
        title="Lisää määrää"
      >
        {quantity}
      </button>

      <button
        type="button"
        onClick={() => {
          if (canDecrease) onDecrease?.(item);
        }}
        disabled={!canDecrease}
        className={cx(
          "absolute left-[1.20rem] top-1/2 grid h-[1.55rem] w-[1.05rem] -translate-y-1/2 place-items-center rounded-[0.24rem] text-[0.92rem] font-black leading-none !text-[#e11d12] active:translate-y-[calc(-50%+1px)]",
          canDecrease ? "!text-[#e11d12] active:bg-[#fff1c6]/38" : "!text-[#e11d12]/25",
        )}
        aria-label="Vähennä määrää"
        title="Vähennä määrää"
      >
        −
      </button>
    </div>
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
  onIncreaseItem,
  onDecreaseItem,
  onCompare,
  className = "",
}: ZiiplyMobileCartCardProps) {
  if (!open) return null;

  const hasItems = items.length > 0;
  const totalPrice = getDisplayCartTotalV8(items);
  const hasAlcoholItemsV8 = hasAlcoholCartItemsV8(items);

  return (
    <div
      className={`fixed inset-0 z-[86] flex items-end justify-center bg-slate-950/14 px-2 pb-[calc(env(safe-area-inset-bottom)+5.55rem)] pt-[calc(env(safe-area-inset-top)+5.25rem)] backdrop-blur-[1.5px] sm:hidden ${className}`}
    >
      <section className="ziiply-cart-paper-pop relative flex h-[min(74dvh,39rem)] w-full max-w-[28rem] flex-col overflow-visible rounded-[2.1rem] border-[4px] border-[#6b512a] bg-[#d7b76e] shadow-[0_12px_0_rgba(60,45,20,0.22),0_24px_52px_rgba(0,0,0,0.27)]">
        <div
          className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[#f7edcf] bg-center bg-no-repeat opacity-100"
          style={{
            backgroundImage: "url('/ui/cart/vihkonen.webp')",
            backgroundSize: "148% 106%",
          }}
        />
        <div className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[linear-gradient(180deg,rgba(255,250,226,0.30),rgba(238,214,156,0.10))]" />

        <header className="relative z-10 shrink-0 px-5 pb-2 pt-[3.74rem]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                className="ml-[0.95rem] mt-[-0.04rem] rotate-[-0.45deg] text-[0.92rem] font-black italic leading-none text-[#314226]/76 drop-shadow-[0_1px_0_rgba(255,247,211,0.52)]"
                style={{ fontFamily: serifFont }}
              >
                {title}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mr-[0.08rem] mt-[-1.82rem] grid h-[2.15rem] w-[2.15rem] shrink-0 place-items-center rounded-full border-[2px] border-[#6f5730] bg-[#fff2cb]/82 text-[1.04rem] font-black leading-none text-[#513d1f] shadow-[0_2px_0_rgba(91,72,44,0.15)] active:translate-y-[1px]"
              aria-label="Sulje"
              title="Sulje"
            >
              ✕</button>
          </div>

          <div className="mt-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-2">
            <LedgerButton onClick={onSaveList} disabled={!hasItems}>
              Tallenna
            </LedgerButton>

            <div className="flex justify-start">
              <LedgerButton onClick={onOpenSavedLists} wide>
                Näytä ostoslistat{savedListsCount ? ` ${savedListsCount}` : ""}
              </LedgerButton>
            </div>

            {hasItems ? (
              <button
                type="button"
                onClick={onClearCart}
                className="mt-[0.62rem] rounded-[0.48rem] border-[1.5px] border-[#9a6137] bg-[#ffe0bc]/42 px-2 py-1 text-[0.56rem] font-black lowercase leading-none text-[#7d3414]/82 shadow-[0_1px_0_rgba(91,72,44,0.08)] active:translate-y-[1px]"
                style={{ fontFamily: serifFont }}
              >
                tyhjennä
              </button>
            ) : (
              <span />
            )}
          </div>
        </header>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 pb-2 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {!hasItems ? (
            <div className="mt-5 rounded-[1.1rem] border-[2px] border-dashed border-[#9a7a3d] bg-[#fff4d4]/48 px-4 py-8 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
              <div className="text-[1.02rem] font-black italic text-[#59401e]" style={{ fontFamily: serifFont }}>
                Vihkonen on vielä tyhjä
              </div>
              <div className="mt-2 text-[0.78rem] font-black text-[#8a7650]">
                Lisää löydöksiä koriin.
              </div>
            </div>
          ) : (
            <div className="space-y-[0.18rem] pb-2">
              {items.map((item, index) => {
                const originalName = getName(item);
                const name = ledgerName(originalName);
                const price = normalizePrice(item.price);
                const checked = Boolean(item.checked);
                const quantity = Number(item.quantity ?? item.amount ?? 1);
                const safeQuantity = Number.isFinite(quantity) ? Math.max(1, quantity) : 1;

                return (
                  <article
                    key={String(item.id ?? item.ean ?? index)}
                    className={cx(
                      "grid min-h-[2.22rem] grid-cols-[2.05rem_minmax(0,1fr)_3.35rem_1.35rem_4.2rem] items-center gap-1 border-b-[1.35px] border-[#b9944d]/68 bg-transparent px-1 py-[0.28rem]",
                      checked && "opacity-55",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleItem?.(item)}
                      className="grid h-[1.9rem] w-full place-items-center text-center text-[1.08rem] font-black leading-none text-[#4a3921] active:translate-y-[1px]"
                      style={{ fontFamily: serifFont }}
                      aria-label={checked ? "Poista keräilymerkintä" : "Merkitse kerätyksi"}
                    >
                      {checked ? "✓" : `${index + 1}.`}
                    </button>

                    <div
                      className={cx(
                        "min-w-0 truncate text-[0.96rem] font-black leading-none text-[#2f2a1c]",
                        checked && "line-through",
                      )}
                      style={{ fontFamily: serifFont }}
                      title={originalName}
                    >
                      {name}
                    </div>

                    <QuantityCell
                      item={item}
                      quantity={safeQuantity}
                      onDecrease={onDecreaseItem}
                      onIncrease={onIncreaseItem}
                    />

                    <span
                      aria-hidden="true"
                      className="block h-[1.7rem] w-full"
                    />

                    <button
                      type="button"
                      onClick={() => onRemoveItem?.(item)}
                      className={cx(
                        "min-w-0 rounded-[0.24rem] pr-[0.08rem] text-right font-black leading-none active:translate-y-[1px] active:bg-[#ffe0bc]/36",
                        isAlcoholCartItemV8(item)
                          ? "text-center text-[0.86rem] italic text-[#7b3215]/86"
                          : "text-[0.84rem] text-[#3f321f]",
                      )}
                      style={{ fontFamily: serifFont }}
                      title={isAlcoholCartItemV8(item) ? "Poista kassalla maksettava tuote" : "Poista tuote"}
                      aria-label="Poista tuote"
                    >
                      {isAlcoholCartItemV8(item) ? "kassa" : price}
                    </button>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <footer className="relative z-10 shrink-0 px-5 pb-4 pt-1">
          <div className="relative mb-2 border-t-[2px] border-[#9b7b3d]/62 pt-2 text-[#473719]">
            <span
              className="absolute left-[66.2%] top-[0.58rem] -translate-x-1/2 text-[0.76rem] font-black uppercase tracking-[0.04em]"
              style={{ fontFamily: copperplateFont }}
            >
              Yht.
            </span>

            <div className="flex justify-end">
              <span className="text-[1rem] font-black" style={{ fontFamily: serifFont }}>
                {totalPrice.toLocaleString("fi-FI", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} €
              </span>
            </div>
          </div>

          {hasAlcoholItemsV8 && (
            <div
              className="mx-auto mb-1 max-w-[14rem] rounded-[0.35rem] border border-[#9a6137]/45 bg-[#fff0c7]/44 px-2 py-1 text-center text-[0.52rem] font-black italic leading-tight text-[#7b3215]/82"
              style={{ fontFamily: serifFont }}
            >
              Alkoholijuomat maksetaan kassalla, eivätkä sisälly yhteissummaan.
            </div>
          )}

          <button
            type="button"
            onClick={onCompare}
            disabled={!hasItems}
            className={cx(
              "mx-auto mt-[0.25rem] block rounded-[0.86rem] border-[3px] border-[#0b6330] bg-gradient-to-b from-[#139143] to-[#087237] px-5 py-[0.44rem] text-[0.82rem] font-black italic text-[#fff0d5] shadow-[0_0_0_2px_rgba(255,255,255,0.18)_inset,0_3px_0_#064a26] active:translate-y-[1px]",
              !hasItems && "cursor-not-allowed opacity-45",
            )}
            style={{ fontFamily: cooperFont }}
          >
            Halpuusvertailu
          </button>
        </footer>

        <div className="pointer-events-none absolute -bottom-[0.72rem] left-[1.1rem] right-[1.1rem] h-[1.3rem] rounded-[50%] bg-[#cfaa61] opacity-55 blur-[1px]" />

        <style jsx>{`
          @keyframes ziiplyCartPaperPop {
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

          .ziiply-cart-paper-pop {
            animation: ziiplyCartPaperPop 420ms cubic-bezier(0.2, 0.9, 0.25, 1.2);
          }
        `}</style>
      </section>
    </div>
  );
}

export { ZiiplyMobileCartCard };
