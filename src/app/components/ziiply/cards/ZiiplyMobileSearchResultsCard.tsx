"use client";

// ZIIPLY_MOBILE_SEARCH_RESULTS_CARD_V2_LOYDOKSET_TERMS
// Mobiilin erillinen hakutuloskortti.
// Tarkoitus:
// - EI sotke varsinaista hakukorttia
// - avautuu overlay-paneelina kuten desktopin SearchResponsiveCard
// - scrollattava tuotelista mobiilille

import React from "react";

export type ZiiplyMobileSearchResultProduct = {
  id?: string | number;
  ean?: string | number;
  name?: string;
  title?: string;
  brandName?: string;
  price?: number | string;
  image?: string;
  imageUrl?: string;
  pictureUrl?: string;
  [key: string]: any;
};

export type ZiiplyMobileSearchResultsCardProps = {
  open?: boolean;
  loading?: boolean;
  title?: string;
  products?: ZiiplyMobileSearchResultProduct[];
  onClose?: () => void;
  onAddProduct?: (product: ZiiplyMobileSearchResultProduct) => void;
};

const cooper =
  '"Cooper Black","Cooper Std Black",Georgia,serif';

const copper =
  '"Copperplate","Baskerville",Georgia,serif';

function getName(product: ZiiplyMobileSearchResultProduct) {
  return (
    product.name ||
    product.title ||
    product.brandName ||
    "Tuote"
  );
}

function getImage(product: ZiiplyMobileSearchResultProduct) {
  return (
    product.image ||
    product.imageUrl ||
    product.pictureUrl ||
    ""
  );
}

function formatPrice(price: unknown) {
  if (typeof price === "number") {
    return price.toLocaleString("fi-FI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €";
  }

  const text = String(price ?? "").trim();

  if (!text) return "";

  return text.includes("€")
    ? text
    : `${text} €`;
}

export default function ZiiplyMobileSearchResultsCard({
  open = false,
  loading = false,
  title = "Löydökset",
  products = [],
  onClose,
  onAddProduct,
}: ZiiplyMobileSearchResultsCardProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-end justify-center bg-black/18 px-2 pb-[calc(env(safe-area-inset-bottom)+5.8rem)] pt-[6rem] backdrop-blur-[2px]">
      <section className="relative flex h-[72dvh] w-full max-w-[28rem] flex-col overflow-hidden rounded-[2rem] border-[4px] border-[#7a6334] bg-[#e8d39c] shadow-[0_12px_40px_rgba(0,0,0,0.22)]">

        <div className="absolute inset-0 opacity-35 [background-image:radial-gradient(#c6aa63_1.15px,transparent_1.15px)] [background-size:16px_16px]" />

        <div className="relative z-10 flex items-center justify-between border-b-[3px] border-[#b99858] px-5 py-4">
          <div>
            <div
              className="text-[0.78rem] font-black uppercase tracking-[0.48em] text-[#7d6b45]"
              style={{ fontFamily: copper }}
            >
              LÖYDÖKSET
            </div>

            <div
              className="mt-1 text-[1.05rem] font-black italic text-[#28422a]"
              style={{ fontFamily: cooper }}
            >
              {title}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-[2.7rem] w-[2.7rem] place-items-center rounded-full border-[3px] border-[#6f5730] bg-[#fff2cb] text-[1.3rem] font-black text-[#513d1f] shadow-[0_3px_0_rgba(91,72,44,0.22)] active:translate-y-[1px]"
          >
            ×
          </button>
        </div>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-3">

            {loading && (
              <div className="rounded-[1.3rem] border-[3px] border-[#d4ba73] bg-[#fff4d6] px-5 py-8 text-center text-[1rem] font-black text-[#78633a]">
                Haetaan tuotteita…
              </div>
            )}

            {!loading && products.length === 0 && (
              <div className="rounded-[1.3rem] border-[3px] border-[#d4ba73] bg-[#fff4d6] px-5 py-8 text-center text-[1rem] font-black text-[#78633a]">
                Ei löydöksiä vielä.
              </div>
            )}

            {!loading &&
              products.map((product, index) => {
                const name = getName(product);
                const image = getImage(product);
                const price = formatPrice(product.price);

                return (
                  <div
                    key={String(product.id ?? product.ean ?? index)}
                    className="grid grid-cols-[5.2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[1.55rem] border-[3px] border-[#d4ba73] bg-[#fff5d9] p-3 shadow-[0_5px_0_rgba(91,72,44,0.14)]"
                  >
                    <div className="grid h-[5.2rem] w-[5.2rem] place-items-center overflow-hidden rounded-[1rem] bg-white shadow-inner">
                      {image ? (
                        <img
                          src={image}
                          alt=""
                          className="h-full w-full object-contain p-2"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-3xl">
                          🛒
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div
                        className="line-clamp-2 text-[1.05rem] font-black leading-[1.05] text-[#1f251c]"
                        style={{ fontFamily: cooper }}
                      >
                        {name}
                      </div>

                      {price && (
                        <div className="mt-1 text-[1rem] font-black text-[#6f6548]">
                          {price}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onAddProduct?.(product)}
                      className="rounded-[1rem] bg-[#08a63d] px-4 py-3 text-[1rem] font-black text-[#fff3d8] shadow-[0_4px_0_rgba(0,74,24,0.24)] active:translate-y-[1px]"
                    >
                      Lisää
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      </section>
    </div>
  );
}

export { ZiiplyMobileSearchResultsCard };
