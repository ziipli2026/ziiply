"use client";

// ZIIPLY_MOBILE_SEARCH_RESULTS_CARD_V4_POINTER_AND_PRODUCT_PRESENTATION_FIX
// Mobiilin erillinen Löydökset-kortti.
// V3:
// - oikeampi mobiiliesitys
// - hinnat korjataan: 269 -> 2,69 €, 84 -> 0,84 €, 185 -> 1,85 €
// - otsikko näkyy Löydökset-termillä
// - tyhjä tila: Ei löydöksiä vielä
// V4:
// - korjaa overlayn pointer-events-jumin: vain itse löydöskortti vastaanottaa painallukset
// - lisää/sulje-napit nostettu varmemmin päällimmäiseksi
// - raakakoodit poistettu tuoteriveiltä
// - näytetään vertailuhinta €/kg, €/l tai €/kpl muodossa kun data löytyy
// - tuotenimelle annettu enemmän tilaa; Lisää-nappi oikeaan alakulmaan

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
  comparisonPrice?: string | number | null;
  packageSize?: string;
  unit?: string;
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
  return String(
    product.name ||
    product.title ||
    product.brandName ||
    "Tuote",
  );
}

function getImage(product: ZiiplyMobileSearchResultProduct) {
  return String(
    product.image ||
    product.imageUrl ||
    product.pictureUrl ||
    "",
  );
}

function normalizePriceToEuros(price: unknown) {
  if (typeof price === "number" && Number.isFinite(price)) {
    // S-ryhmän/K-rajapinnoista hinta voi tulla sentteinä:
    // 269 -> 2,69 €, 84 -> 0,84 €, 185 -> 1,85 €.
    // Jos luku on yli 20, se on tässä käyttöliittymässä käytännössä senttiarvo.
    return Math.abs(price) > 20 ? price / 100 : price;
  }

  const raw = String(price ?? "").trim();
  if (!raw) return null;

  const cleaned = raw
    .replace(/\s/g, "")
    .replace("€", "")
    .replace(",", ".");

  const number = Number(cleaned);
  if (!Number.isFinite(number)) return raw;

  return Math.abs(number) > 20 ? number / 100 : number;
}

function formatPrice(price: unknown) {
  const value = normalizePriceToEuros(price);

  if (value == null) return "";

  if (typeof value === "string") {
    return value.includes("€") ? value : `${value} €`;
  }

  return (
    value.toLocaleString("fi-FI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " €"
  );
}

function displayName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

function normalizeComparisonValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.abs(value) > 20 ? value / 100 : value;
  }

  const raw = String(value ?? "").trim();
  if (!raw) return null;

  if (raw.includes("€") || raw.includes("/")) return raw;

  const cleaned = raw.replace(/\s/g, "").replace(",", ".");
  const parsed = Number(cleaned.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(parsed)) return null;

  return Math.abs(parsed) > 20 ? parsed / 100 : parsed;
}

function inferComparisonUnit(product: ZiiplyMobileSearchResultProduct) {
  const raw = [
    product.comparisonUnit,
    product.priceUnit,
    product.unit,
    product.packageSize,
    product.name,
    product.title,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\b(l|ltr|litra|litran|ml|cl)\b/.test(raw)) return "€/l";
  if (/\b(kpl|pkt|pari|rll|rs|ps|tlk)\b/.test(raw)) return "€/kpl";

  return "€/kg";
}

function formatComparisonPrice(product: ZiiplyMobileSearchResultProduct) {
  const candidates = [
    product.comparisonPrice,
    product.unitPrice,
    product.pricePerUnit,
    product.comparisonPriceText,
    product.product?.comparisonPrice,
    product.product?.unitPrice,
  ];

  for (const candidate of candidates) {
    const value = normalizeComparisonValue(candidate);
    if (value == null) continue;

    if (typeof value === "string") {
      return value;
    }

    return `${value.toLocaleString("fi-FI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${inferComparisonUnit(product)}`;
  }

  return "";
}

function getSubText(product: ZiiplyMobileSearchResultProduct) {
  return formatComparisonPrice(product);
}

export default function ZiiplyMobileSearchResultsCard({
  open = false,
  loading = false,
  title = "Tuotteet",
  products = [],
  onClose,
  onAddProduct,
}: ZiiplyMobileSearchResultsCardProps) {
  if (!open) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[95] flex items-end justify-center bg-slate-950/22 px-2 pb-[calc(env(safe-area-inset-bottom)+5.45rem)] pt-[calc(env(safe-area-inset-top)+5.8rem)] backdrop-blur-[3px] sm:hidden">
      <section className="pointer-events-auto relative flex h-[min(72dvh,38rem)] w-full max-w-[28rem] flex-col overflow-hidden rounded-[2rem] border-[4px] border-[#5b482c] bg-[#e8d39c] shadow-[0_12px_0_rgba(60,45,20,0.20),0_22px_48px_rgba(0,0,0,0.25)]">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(#c6aa63_1.15px,transparent_1.15px)] [background-size:16px_16px]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.45),transparent_58%)]" />

        <header className="relative z-10 shrink-0 border-b-[3px] border-[#b99858] bg-[#e7cf91]/75 px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div
                className="text-[0.82rem] font-black uppercase tracking-[0.48em] text-[#7d6b45]"
                style={{ fontFamily: copper }}
              >
                LÖYDÖKSET
              </div>

              <div
                className="mt-1 truncate text-[1.1rem] font-black italic text-[#28422a]"
                style={{ fontFamily: cooper }}
              >
                {title || "Tuotteet"}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="pointer-events-auto relative z-30 grid h-[2.7rem] w-[2.7rem] shrink-0 place-items-center rounded-full border-[3px] border-[#6f5730] bg-[#fff2cb] text-[1.35rem] font-black leading-none text-[#513d1f] shadow-[0_3px_0_rgba(91,72,44,0.24)] active:translate-y-[1px]"
              aria-label="Sulje löydökset"
              title="Sulje"
            >
              ×
            </button>
          </div>
        </header>

        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="space-y-3 pb-2">
            {loading && (
              <div className="rounded-[1.35rem] border-[3px] border-[#d4ba73] bg-[#fff4d6] px-5 py-8 text-center text-[1rem] font-black text-[#78633a] shadow-[0_4px_0_rgba(91,72,44,0.12)]">
                Haetaan löydöksiä…
              </div>
            )}

            {!loading && products.length === 0 && (
              <div className="rounded-[1.35rem] border-[3px] border-[#d4ba73] bg-[#fff4d6] px-5 py-8 text-center text-[1rem] font-black text-[#78633a] shadow-[0_4px_0_rgba(91,72,44,0.12)]">
                Ei löydöksiä vielä.
              </div>
            )}

            {!loading &&
              products.map((product, index) => {
                const name = getName(product);
                const image = getImage(product);
                const price = formatPrice(product.price);
                const subText = getSubText(product);

                return (
                  <article
                    key={String(product.id ?? product.ean ?? index)}
                    className="relative grid min-h-[7.4rem] grid-cols-[4.7rem_minmax(0,1fr)] items-start gap-3 rounded-[1.55rem] border-[3px] border-[#d4ba73] bg-[#fff5d9] p-3 pr-[6.3rem] shadow-[0_5px_0_rgba(91,72,44,0.14)]"
                  >
                    <div className="grid h-[4.7rem] w-[4.7rem] place-items-center overflow-hidden rounded-[1rem] bg-white shadow-[inset_0_1px_8px_rgba(0,0,0,0.08)]">
                      {image ? (
                        <img
                          src={image}
                          alt=""
                          className="h-full w-full object-contain p-2"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-3xl">🛒</span>
                      )}
                    </div>

                    <div className="min-w-0 pb-[2.65rem]">
                      <div
                        className="text-[0.96rem] font-black leading-[1.02] text-[#1f251c]"
                        style={{ fontFamily: cooper }}
                      >
                        {displayName(name)}
                      </div>

                      {subText && (
                        <div className="mt-1 truncate text-[0.76rem] font-black text-[#8a7a55]">
                          {subText}
                        </div>
                      )}

                      {price && (
                        <div className="mt-1 text-[1rem] font-black leading-none text-[#6f6548]">
                          {price}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => onAddProduct?.(product)}
                      className="pointer-events-auto absolute bottom-3 right-3 z-30 h-[3.25rem] w-[5.1rem] rounded-[1rem] bg-[#08a63d] px-2 text-[0.98rem] font-black text-[#fff3d8] shadow-[0_4px_0_rgba(0,74,24,0.24)] active:translate-y-[1px] active:shadow-[0_2px_0_rgba(0,74,24,0.24)]"
                    >
                      Lisää
                    </button>
                  </article>
                );
              })}
          </div>
        </div>
      </section>
    </div>
  );
}

export { ZiiplyMobileSearchResultsCard };
