"use client";

import { useState } from "react";

type Props = {
  storeName: string;
  itemCount: number;
  totalPrice: number;
  onBack: () => void;
};

export default function ZiiplyMobileCompareCheckoutCard({ storeName, itemCount, totalPrice, onBack }: Props) {
  const [showPaymentNotice, setShowPaymentNotice] = useState(false);

  return (
    <div className="fixed inset-0 z-[96] flex items-start justify-center bg-[#eef7f2]/98 px-2 pb-[calc(env(safe-area-inset-bottom)+5.95rem)] pt-[calc(env(safe-area-inset-top)+0.45rem)] backdrop-blur-md sm:hidden">
      <section className="relative flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-6.9rem)] max-h-[46rem] min-h-[31rem] w-full max-w-[28rem] flex-col items-center justify-center overflow-hidden rounded-[2.1rem] border-[5px] border-[#3b2414] bg-[#f7edcf] px-5 shadow-[0_12px_0_rgba(35,23,13,0.28),0_24px_52px_rgba(0,0,0,0.30)]">
        <div className="pointer-events-none absolute inset-0 bg-[url('/ui/cart/vihkonen.webp')] bg-center bg-no-repeat opacity-80 [background-size:142%_104%]" />
        <div className="relative z-10 w-full max-w-[20.3rem] rounded-[1.05rem] border-[2.4px] border-[#70481f] bg-[#fff0c7]/90 px-4 pb-5 pt-5 text-center shadow-[0_3px_0_rgba(84,55,22,0.18),inset_0_0_0_1px_rgba(255,250,224,0.58)]">
          <div className="mb-3 text-[0.64rem] font-black uppercase tracking-[0.16em] text-[#604017]">{storeName}</div>
          {!showPaymentNotice ? (
            <>
              <h2 className="text-[2.05rem] font-extrabold italic leading-none text-[#314226]">✓ Lista kasassa!</h2>
              <div className="mx-auto mt-3 w-fit rounded-[0.58rem] border border-[#8a6b32] bg-[#f8e6b9] px-4 py-2 text-[1.08rem] font-black text-[#3d301a]">{itemCount} tuotetta · {(totalPrice / 100).toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</div>
              <div className="mx-auto mt-5 rounded-[0.72rem] border border-[#9a7a3d]/60 bg-[#fff8dc]/62 px-3 py-3 text-[1.08rem] font-extrabold italic text-[#7b3215]">Unohtuiko vielä jotain listan ulkopuolelta?</div>
              <div className="mt-5 grid gap-2.5">
                <button type="button" onClick={onBack} className="rounded-[0.62rem] border-2 border-[#8a6b32] bg-[#f5dfac] px-3 py-3 font-black italic text-[#533819]">Lisää vielä</button>
                <button type="button" onClick={() => setShowPaymentNotice(true)} className="rounded-[0.62rem] border-2 border-[#496443] bg-[#dfcfaa] px-3 py-3 text-[1.02rem] font-black italic text-[#244525]">Valmis kassalle</button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-[1.02rem] font-black italic text-[#244525]">Ziiply-maksaminen on tulossa</h2>
              <p className="mt-2 text-[0.84rem] font-extrabold leading-snug text-[#533819]">Tulevaisuudessa voit maksaa ostoksesi suoraan Ziiplyn avulla.</p>
              <button type="button" onClick={onBack} className="mt-4 rounded-[0.52rem] border-2 border-[#496443] bg-[#dfcfaa] px-5 py-2 font-black italic text-[#244525]">Selvä</button>
            </>
          )}
          <button type="button" onClick={onBack} className="mt-4 block w-full text-[0.78rem] font-extrabold text-[#6f5730] underline underline-offset-2">Takaisin vertailuun</button>
        </div>
      </section>
    </div>
  );
}
