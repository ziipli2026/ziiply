"use client";

// ZIIPLY MOBILE COMPARE RECEIPT STYLE
// Kevyempi mobiilivertailu kuitin / hintalistan hengessä

import React from "react";

type Store = {
  id: string;
  name: string;
  totalPrice?: number;
  itemCount?: number;
  isBest?: boolean;
  chain?: "S" | "K";
};

type Props = {
  open?: boolean;
  stores: Store[];
  items?: unknown[];
  title?: string;
  subtitle?: string;
  loading?: boolean;
  onSelectStore?: (id: string) => void;
  onBack?: () => void;
  onBackToCart?: () => void;
  onOpenStore?: (id: string) => void;
  onClose?: () => void;
};

const cooper = '"Cooper Black", Georgia, serif';

function euro(v?: number) {
  if (v == null) return "—";
  return `${(v / 100).toFixed(2).replace(".", ",")} €`;
}

export default function ZiiplyMobileCompareCardresponsive({
  open = true,
  stores,
  items = [],
  title = "Vertailu",
  subtitle,
  loading = false,
  onSelectStore,
  onBack,
  onBackToCart,
  onOpenStore,
  onClose,
}: Props) {
  if (!open) return null;
  const handleBack = onBack || onBackToCart;
  const cheapest = [...stores]
    .filter((s) => typeof s.totalPrice === "number")
    .sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0))[0];

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center bg-[#eef3ef]/96 px-2 pb-[7rem] pt-[0.55rem] sm:hidden">
      <section className="relative flex h-[calc(100dvh-8rem)] w-full max-w-[28rem] flex-col overflow-hidden rounded-[2rem] border-[5px] border-[#3a2416] bg-[linear-gradient(135deg,#2b180e_0%,#5c3820_45%,#2b180e_100%)] shadow-[0_20px_40px_rgba(0,0,0,0.28)]">
        <div
          className="absolute inset-[0.22rem] rounded-[1.7rem] bg-[#f6edd1]"
          style={{
            backgroundImage: "url('/ui/cart/vihkonen.webp')",
            backgroundSize: "145% auto",
            backgroundPosition: "center top",
          }}
        />

        <div className="absolute inset-[0.45rem] rounded-[1.5rem] border border-dashed border-[#d8b36c]/55" />

        <header className="relative z-10 shrink-0 px-5 pb-3 pt-[3.6rem]">
          <div className="border-b-[2px] border-[#9f8149]/60 pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[0.56rem] font-black uppercase tracking-[0.24em] text-[#6c624f]">
                  Hintavertailu
                </div>

                <h1
                  className="mt-1 text-[2rem] font-black italic leading-none text-[#264129]"
                  style={{ fontFamily: cooper }}
                >
                  {title}
                </h1>

                <p className="mt-1 text-[0.78rem] font-extrabold text-[#5e523b]">
                  {subtitle || `${stores.length} kauppaa vertailtu`}
                </p>
              </div>

              {cheapest ? (
                <div className="rounded-[1rem] border-[3px] border-[#0b6330] bg-[linear-gradient(180deg,#139143_0%,#087237_100%)] px-3 py-2 text-center text-[#fff1d4] shadow-[0_3px_0_#064a26]">
                  <div className="text-[0.5rem] font-black uppercase tracking-[0.15em]">
                    Huokein
                  </div>
                  <div className="mt-1 text-[1.05rem] font-black leading-none">
                    {euro(cheapest.totalPrice)}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="relative z-10 flex-1 overflow-y-auto px-5 pb-3">
          <div className="overflow-hidden rounded-[1.35rem] border-[2px] border-[#7c653c] bg-[#fff5da]/84 shadow-[0_4px_18px_rgba(60,42,18,0.10)]">
            {stores.map((store, index) => {
              const best =
                store.isBest || cheapest?.id === store.id;

              return (
                <button
                  key={store.id}
                  onClick={() => onSelectStore?.(store.id)}
                  className={`relative flex w-full items-center gap-3 border-b border-[#d8c79e] px-4 py-4 text-left transition active:scale-[0.992] ${
                    best
                      ? "bg-[#dff0dc]"
                      : "bg-[#fff7e6]"
                  }`}
                >
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-[2px] text-[1rem] font-black ${
                      store.chain === "K"
                        ? "border-[#7f1418] bg-[#ca1d24] text-[#fff4d7]"
                        : "border-[#0b6330] bg-[#0c973d] text-[#fff4d7]"
                    }`}
                  >
                    {store.chain || "?"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[1rem] font-black text-[#233020]">
                      {store.name}
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-[0.64rem] font-black uppercase tracking-[0.08em] text-[#756b58]">
                      <span>#{index + 1}</span>
                      <span>{store.itemCount || items.length || 0} tuotetta</span>

                      {best ? (
                        <span className="rounded-full border border-[#0b6330] bg-[#0c973d] px-2 py-[0.1rem] text-[#fff4d7]">
                          Paras
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={`shrink-0 text-[1.55rem] font-black italic ${
                      best ? "text-[#0b7c38]" : "text-[#3d301e]"
                    }`}
                    style={{ fontFamily: cooper }}
                  >
                    {euro(store.totalPrice)}
                  </div>
                </button>
              );
            })}
          </div>
        </main>

        <footer className="relative z-10 grid shrink-0 grid-cols-2 gap-3 px-5 pb-5 pt-2">
          <button
            onClick={handleBack}
            className="min-h-[3rem] rounded-[1rem] border-[3px] border-[#8a7142] bg-[#efe1bd] text-[0.9rem] font-black uppercase text-[#29412c] shadow-[0_0_0_2px_#f9efd6_inset]"
          >
            Takaisin
          </button>

          <button
            onClick={() => cheapest && onSelectStore?.(cheapest.id)}
            className="min-h-[3rem] rounded-[1rem] border-[3px] border-[#0b6330] bg-[linear-gradient(180deg,#139143_0%,#087237_100%)] text-[0.9rem] font-black uppercase text-[#fff1d4] shadow-[0_3px_0_#064a26]"
          >
            Huokein
          </button>
        </footer>

        {onClose ? (
          <button
            onClick={onClose}
            className="absolute right-[0.8rem] top-[0.8rem] z-20 grid h-[3.1rem] w-[3.1rem] place-items-center rounded-[1rem] border-[3px] border-[#2a190e] bg-[linear-gradient(135deg,#7d4c2b_0%,#3c2414_80%)] shadow-[0_4px_10px_rgba(0,0,0,0.28)]"
          >
            <span className="grid h-[1.7rem] w-[1.7rem] place-items-center rounded-full bg-[radial-gradient(circle_at_35%_35%,#f8c96e_0%,#b1762c_55%,#68401e_100%)] text-[1rem] font-black text-[#2b1a0e]">
              ×
            </span>
          </button>
        ) : null}
      </section>
    </div>
  );
}
