"use client";

// ZIIPLY_MOBILE_CART_CARD_V57_SHARE_SYMBOL_MATCH_COMPARE
// Mobiilin Tavarainkeruu-paperivihko.
// V42: korjaa ostoslistan visuaalisen kohdistuksen: rivit relative, korkeampi rivikorkeus, määrä keskelle, hinnat ja footer vasemmalle samaan linjaan.
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
// V18B: nimikekentälle lisää vaakasuuntaista tilaa; määrä-/välikenttiä kavennettu maltillisesti.

// V27: tuoterivi nostettu ensimmäiseen kirjoituskohtaan; YHT. ja summa palautettu oikealle pohjakuvan ala-alueen sarakkeisiin.
// V47: tasaa tuoterivien pystykorko, rajaa nimike ennen MÄÄRÄ-viivaa ja keskittää alkoholihuomautuksen.
// V48: simulointi: ensimmäisen tuoterivin näkyvä korko tasattu muiden rivien mukaan; nimitekstin leveys rajattu ennen MÄÄRÄ-viivaa; alkoholihuomautus keskitetty.
// V19: layout-korjaus:
// - kortti nostettu ylös safe-alueelle, ettei topbar jää näkyviin
// - korkeus käyttää koko käytettävissä olevan tilan alapalkkia väistäen
// - header / toolbar / taulukko / footer erotettu flex-rakenteeksi
// - tuoterivit gridillä: N:o | Nimike | Määrä | Hinta
// - määräsolun sisäinen koordinaattihässäkkä poistettu kevyesti
// V45: nimike lähemmäs punaista pystyviivaa, miinus hinta-sarakkeen vasempaan alanurkkaan, footerin YHT. ja alkoholihuomio korostettu.
// V43: korjaa kuvan perusteella määrä-/hinta-/footer-linjat: määrä keskelle MÄÄRÄ-saraketta, YHT. samaan sarakekeskelle ja summa hinta-sarakkeen keskelle.
// V44: irrottaa tuoterivin kentät omiksi absoluuttisiksi paperikoordinaateiksi ja siirtää nimikkeet, määrän, miinuksen, hinnat sekä footerin linjaan taustakuvan kanssa.

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
  onShareCart?: () => void;
  onBack?: () => void;
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
  // V35: näytetään tuotteen nimi aidosti. Ei poimita vain tiettyjä sanoja,
  // koska se tekee esimerkiksi "400g Kunnon ..." -nimistä väärän näköisiä.
  return name
    .replace(/\s+/g, " ")
    .trim();
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
        "rounded-[0.54rem] border-[1.5px] border-[#8a6b32] bg-[#fff0c7]/72 px-2.5 py-[0.42rem] text-[0.62rem] font-extrabold leading-none text-[#533819] shadow-[0_1px_0_rgba(91,72,44,0.12),inset_0_0_0_1px_rgba(255,255,255,0.42)] active:translate-y-[1px]",
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
    <>
      <button
        type="button"
        onClick={() => {
          if (canDecrease) onDecrease?.(item);
        }}
        disabled={!canDecrease}
        className={cx(
          "absolute left-[17.52rem] top-[2.10rem] grid h-[0.90rem] w-[1.10rem] place-items-center rounded-[0.24rem] text-[1.05rem] font-extrabold leading-none !text-[#b51a12] drop-shadow-[0_0_0.4px_rgba(120,0,0,0.45)] active:translate-y-[1px] active:bg-[#fff1c6]/38",
          !canDecrease && "!text-[#b51a12]/72 drop-shadow-[0_0_0.4px_rgba(120,0,0,0.30)]",
        )}
        aria-label="Vähennä määrää"
        title="Vähennä määrää"
      >
        −
      </button>

      <button
        type="button"
        onClick={() => onIncrease?.(item)}
        className="absolute left-[13.20rem] top-[0.78rem] grid h-[1.62rem] w-[2.00rem] place-items-center rounded-[0.32rem] bg-[#fff1c6]/10 text-center text-[0.98rem] font-extrabold leading-none text-[#3d301a] active:translate-y-[1px] active:bg-[#fff1c6]/34"
        style={{ fontFamily: serifFont }}
        aria-label="Lisää määrää"
        title="Lisää määrää"
      >
        {quantity}
      </button>
    </>
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
  onShareCart,
  onBack,
  className = "",
}: ZiiplyMobileCartCardProps) {
  if (!open) return null;

  const hasItems = items.length > 0;
  const totalPrice = getDisplayCartTotalV8(items);
  const hasAlcoholItemsV8 = hasAlcoholCartItemsV8(items);

  return (
    <div
      className={`fixed inset-0 z-[92] flex items-start justify-center bg-[#eef7f2]/98 px-2 pb-[calc(env(safe-area-inset-bottom)+5.95rem)] pt-[calc(env(safe-area-inset-top)+0.45rem)] backdrop-blur-md sm:hidden ${className}`}
    >
      <section className="ziiply-cart-paper-pop relative flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-6.9rem)] max-h-[46rem] min-h-[31rem] w-full max-w-[28rem] flex-col overflow-hidden rounded-[2.1rem] border-[5px] border-[#3b2414] bg-[linear-gradient(135deg,#2a170e_0%,#5a3720_45%,#2a170e_100%)] shadow-[0_12px_0_rgba(35,23,13,0.28),0_24px_52px_rgba(0,0,0,0.30)]">
        <div
          className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[#f7edcf] bg-center bg-no-repeat opacity-100"
          style={{
            backgroundImage: "url('/ui/cart/vihkonen.webp')",
            backgroundSize: "142% 104%",
            backgroundPosition: "center top",
          }}
        />
        <div className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[linear-gradient(180deg,rgba(255,250,226,0.30),rgba(238,214,156,0.10))]" />
        <div className="pointer-events-none absolute inset-[0.42rem] rounded-[1.55rem] border border-dashed border-[#d6a861]/55 shadow-[inset_0_0_0_2px_rgba(27,17,9,0.20)]" />
        <div className="pointer-events-none absolute right-[0.42rem] top-[0.42rem] z-[8] h-[4.0rem] w-[4.35rem] rounded-bl-[2.0rem] rounded-tr-[1.46rem] border-l-[2px] border-b-[2px] border-[#2c1a0f] bg-[linear-gradient(135deg,#6b4328_0%,#3b2414_70%)] shadow-[inset_0_0_0_1px_rgba(255,214,139,0.18),0_3px_9px_rgba(0,0,0,0.22)]">
          <span className="absolute right-[1.0rem] top-[0.82rem] h-[0.72rem] w-[0.72rem] rounded-full border border-[#6b421f] bg-[radial-gradient(circle_at_35%_35%,#f6c46c_0%,#b0752a_52%,#65401f_100%)] shadow-[0_1px_2px_rgba(0,0,0,0.28)]" />
        </div>

        <header className="relative z-10 shrink-0 px-5 pb-1 pt-[4.18rem]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                className="ml-[0.98rem] mt-[0.46rem] rotate-[-0.45deg] text-[1.08rem] font-extrabold italic leading-none text-[#314226]/78 drop-shadow-[0_1px_0_rgba(255,247,211,0.52)]"
                style={{ fontFamily: serifFont }}
              >
                {title}
              </h2>
            </div>

            <span aria-hidden="true" className="block h-[2rem] w-[2rem] shrink-0" />
          </div>

          <div className="absolute left-[2.05rem] top-[1.64rem] z-[22]">
            <button
              type="button"
              onClick={onOpenSavedLists}
              title="Ostoslistat"
              aria-label="Ostoslistat"
              className="relative grid h-[2.55rem] w-[2.1rem] place-items-center rounded-b-[0.38rem] rounded-t-[0.22rem] border-[1.5px] border-[#7b5c2a] bg-[linear-gradient(180deg,#f5dfac_0%,#d6ad66_100%)] text-[#604017] shadow-[0_2px_3px_rgba(50,31,13,0.22),inset_0_0_0_1px_rgba(255,250,224,0.42)] active:translate-y-[1px]"
            >
              <span className="absolute -top-[0.78rem] left-1/2 h-[0.9rem] w-[1px] -translate-x-1/2 bg-[#5a371c]" />
              <span className="absolute top-[0.22rem] h-[0.36rem] w-[0.36rem] rounded-full border border-[#7b5c2a] bg-[#fff2c7]" />
              <span className="text-[1.12rem] leading-none">☷</span>
              {savedListsCount ? (
                <span className="absolute -right-[0.3rem] -top-[0.3rem] grid h-[0.84rem] min-w-[0.84rem] place-items-center rounded-full bg-[#0b7f3a] px-[0.16rem] text-[0.46rem] font-black text-white">
                  {savedListsCount}
                </span>
              ) : null}
            </button>
          </div>

          {hasItems ? (
            <div className="absolute right-[2.05rem] top-[1.64rem] z-[22]">
              <button
                type="button"
                onClick={onClearCart}
                title="Tyhjennä ostoskori"
                aria-label="Tyhjennä ostoskori"
                className="relative grid h-[2.55rem] w-[2.1rem] place-items-center rounded-b-[0.38rem] rounded-t-[0.22rem] border-[1.5px] border-[#8b3c27] bg-[linear-gradient(180deg,#f3d4a1_0%,#d49a58_100%)] text-[#8d2718] shadow-[0_2px_3px_rgba(50,31,13,0.22),inset_0_0_0_1px_rgba(255,250,224,0.35)] active:translate-y-[1px]"
              >
                <span className="absolute -top-[0.78rem] left-1/2 h-[0.9rem] w-[1px] -translate-x-1/2 bg-[#5a371c]" />
                <span className="absolute top-[0.22rem] h-[0.36rem] w-[0.36rem] rounded-full border border-[#8b3c27] bg-[#fff2c7]" />
                <span className="text-[1.12rem] leading-none">⌫</span>
              </button>
            </div>
          ) : null}
        </header>

        <div className="relative z-10 grid shrink-0 grid-cols-[2.35rem_minmax(0,1fr)_3.95rem_4.55rem] px-6 pt-[0.30rem] text-[0.54rem] font-black uppercase tracking-[0.18em] text-transparent opacity-0" style={{ fontFamily: copperplateFont }}>
          <span>N:o</span>
          <span>Nimike</span>
          <span className="text-center">Määrä</span>
          <span className="text-right">Hinta</span>
        </div>

        <div className="relative z-10 -mt-[0.36rem] min-h-0 flex-1 overflow-y-auto px-5 pb-[6.0rem] pt-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {!hasItems ? (
            <div className="mt-5 rounded-[1.1rem] border-[2px] border-dashed border-[#9a7a3d] bg-[#fff4d4]/48 px-4 py-8 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
              <div className="text-[1.02rem] font-extrabold italic text-[#59401e]" style={{ fontFamily: serifFont }}>
                Vihkonen on vielä tyhjä
              </div>
              <div className="mt-2 text-[0.78rem] font-extrabold text-[#8a7650]">
                Lisää löydöksiä koriin.
              </div>
            </div>
          ) : (
            <div className="space-y-0 pb-2">
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
                      "relative block h-[3.18rem] border-b-[1.35px] border-[#b9944d]/68 bg-transparent px-1 py-[0.22rem]",
                      checked && "opacity-55",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onToggleItem?.(item)}
                      className="absolute left-[0.36rem] top-[0.64rem] grid h-[1.9rem] w-[1.95rem] place-items-center text-center text-[1.08rem] font-extrabold leading-none text-[#4a3921] active:translate-y-[1px]"
                      style={{ fontFamily: serifFont }}
                      aria-label={checked ? "Poista keräilymerkintä" : "Merkitse kerätyksi"}
                    >
                      {checked ? "✓" : `${index + 1}.`}
                    </button>

                    <div
                      className={cx(
                        "absolute left-[3.62rem] top-[0.70rem] max-h-[1.92rem] w-[8.25rem] overflow-hidden text-[0.80rem] font-extrabold leading-[1.02] text-[#2f2a1c] [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]",
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

                    <button
                      type="button"
                      onClick={() => onRemoveItem?.(item)}
                      className={cx(
                        "absolute left-[16.35rem] top-[0.78rem] grid h-[1.62rem] w-[3.45rem] place-items-center rounded-[0.24rem] text-center font-extrabold leading-none active:translate-y-[1px] active:bg-[#ffe0bc]/36",
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

        <footer className="sticky bottom-0 z-20 shrink-0 px-5 pb-3 pt-2">
          <div className="relative mb-2 min-h-[1.82rem] border-t-[2px] border-transparent pt-2 text-[#473719]">
            <span
              aria-hidden="true"
              className="pointer-events-none absolute left-[0.12rem] right-[0.12rem] top-0 block h-[2px] bg-[#9b7b3d]/62"
            />
            <span
              className="absolute left-[12.20rem] top-[0.12rem] grid h-[1.4rem] w-[3.95rem] place-items-center whitespace-nowrap text-center text-[0.76rem] font-extrabold uppercase tracking-[0.04em]"
              style={{ fontFamily: copperplateFont }}
            >
              Yht.
            </span>

            <span
              className="absolute left-[16.35rem] top-[0.10rem] grid h-[1.45rem] w-[3.45rem] place-items-center whitespace-nowrap text-center text-[1.02rem] font-black italic"
              style={{ fontFamily: serifFont }}
            >
              {totalPrice.toLocaleString("fi-FI", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })} €
            </span>
          </div>

          {hasAlcoholItemsV8 && (
            <div
              className="mx-auto mb-1 w-[18.2rem] max-w-[calc(100%-1.2rem)] rounded-[0.42rem] border border-[#9a6137]/50 bg-[#fff0c7]/52 px-3 py-[0.42rem] text-center text-[0.68rem] font-extrabold italic leading-tight text-[#7b3215]/88"
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
              "ml-[5.15rem] mt-[0.68rem] block rounded-[0.50rem] border-[2.5px] border-[#496443] bg-[linear-gradient(180deg,#f3e8cc_0%,#dfcfaa_100%)] px-5 py-[0.36rem] text-[0.82rem] font-extrabold italic text-[#244525] shadow-[inset_0_0_0_1px_rgba(255,250,224,0.58),0_2px_4px_rgba(62,43,20,0.18)] active:translate-y-[1px]",
              !hasItems && "cursor-not-allowed opacity-45",
            )}
            style={{ fontFamily: cooperFont }}
          >
            Halpuusvertailu
          </button>
        </footer>

        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="absolute bottom-[1.05rem] left-[0.88rem] z-[35] grid h-[2.45rem] w-[2.75rem] place-items-center rounded-l-[0.42rem] rounded-r-[0.8rem] border-[2px] border-[#2b1a0e] bg-[linear-gradient(135deg,#7a4c2d_0%,#3b2414_78%)] text-[1.1rem] font-black leading-none text-[#f7e7bd] shadow-[0_3px_8px_rgba(0,0,0,0.25),inset_0_0_0_1px_rgba(255,214,139,0.18)] active:translate-y-[1px]"
            aria-label="Takaisin"
            title="Takaisin"
          >
            <span className="grid h-[1.45rem] w-[1.45rem] place-items-center rounded-full border border-[#6b421f] bg-[radial-gradient(circle_at_35%_35%,#f6c46c_0%,#b0752a_52%,#65401f_100%)] text-[1.02rem] text-[#2b1a0e] shadow-[0_1px_2px_rgba(0,0,0,0.28)]">
              ←
            </span>
          </button>
        ) : null}

        {onShareCart && hasItems ? (
          <button
            type="button"
            onClick={onShareCart}
            className="absolute bottom-[2.02rem] left-[4.34rem] z-[35] grid h-[2.22rem] w-[2.22rem] place-items-center rounded-[0.46rem] border-[1.6px] border-[#8b713d] bg-[linear-gradient(180deg,#f5e5bd_0%,#d6b875_100%)] text-[#51361a] shadow-[0_2px_5px_rgba(45,30,10,0.17),inset_0_0_0_1px_rgba(255,249,220,0.55)] active:translate-y-[1px]"
            aria-label="Jaa ostoskori"
            title="Jaa ostoskori"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 18"
              className="h-[0.94rem] w-[1.12rem]"
            >
              <path
                d="M2.5 3.5h19v11h-19z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path
                d="M3 4l9 6.5L21 4M3.2 14.2l6.1-5M20.8 14.2l-6.1-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="absolute bottom-[1.05rem] right-[0.88rem] z-[35] grid h-[2.45rem] w-[2.75rem] place-items-center rounded-l-[0.8rem] rounded-r-[0.42rem] border-[2px] border-[#2b1a0e] bg-[linear-gradient(135deg,#7a4c2d_0%,#3b2414_78%)] text-[1.1rem] font-black leading-none text-[#f7e7bd] shadow-[0_3px_8px_rgba(0,0,0,0.25),inset_0_0_0_1px_rgba(255,214,139,0.18)] active:translate-y-[1px]"
          aria-label="Sulje"
          title="Sulje vihko"
        >
          <span className="grid h-[1.45rem] w-[1.45rem] place-items-center rounded-full border border-[#6b421f] bg-[radial-gradient(circle_at_35%_35%,#f6c46c_0%,#b0752a_52%,#65401f_100%)] text-[0.92rem] text-[#2b1a0e] shadow-[0_1px_2px_rgba(0,0,0,0.28)]">
            ×
          </span>
        </button>

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
