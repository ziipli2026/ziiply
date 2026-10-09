"use client";

/** Desktop assistant cards: descriptions align to the same top baseline and cards reach the large frame bottom. */
type Assistant = "gosta" | "justiina" | "arvo";
const assistants = [
  { key: "gosta" as const, name: "Gösta", title: "Tarjoukset", subtitle: "Hinnat ja säästövinkit", description: "Tarjoukset, hintahavainnot, säästövinkit ja tarjousvahdit.", image: "/assistants/gosta.png", frame: "border-[#8bb56d] bg-gradient-to-b from-[#f4ffe3] via-[#e0f0bd] to-[#c6dc91]", ink: "text-[#244a28]" },
  { key: "justiina" as const, name: "Justiina", title: "Hintahaku", subtitle: "Hintahaku ja ruokaideat", description: "Reseptihaku, ateriavinkit ja korin perusteella ehdotetut ruoat.", image: "/assistants/justiina.png", frame: "border-[#c69655] bg-gradient-to-b from-[#fff6da] via-[#ffe9a2] to-[#edc66c]", ink: "text-[#6b331e]" },
  { key: "arvo" as const, name: "Arvo", title: "Asetukset", subtitle: "Omat valinnat", description: "Ruokavaliot, suosikit, kaupat, sijainti ja muut pysyvät valinnat.", image: "/assistants/arvo.png", frame: "border-[#b99d62] bg-gradient-to-b from-[#fff3d0] via-[#ead4a1] to-[#d3b474]", ink: "text-[#314633]" },
];

export default function DesktopAssistantCards({active,hasSelectedStores,chooseStoresNoticeFor,onSelect,onlyGosta=false}:{onlyGosta?:boolean;active:Assistant|null;hasSelectedStores:boolean;chooseStoresNoticeFor:Assistant|null;onSelect:(assistant:Assistant)=>void}){
  return (
    <div className="grid h-full min-h-0 grid-cols-3 gap-3 xl:gap-4 -mt-3">
      {(onlyGosta ? assistants.filter(item=>item.key==="gosta") : assistants).map((item) => {
        const selected = active === item.key;
        return (
          <button key={item.key} type="button" onClick={() => onSelect(item.key)} className={[
            "group relative flex h-full min-h-0 flex-col items-center overflow-hidden rounded-[34px] border-[3px] px-5 pb-0 pt-5 text-center transition duration-200 active:translate-y-[2px]",
            item.frame,
            selected ? "ring-4 ring-[#0a7f3a]/18 shadow-[0_22px_42px_rgba(35,54,42,0.18)]" : "shadow-[0_14px_30px_rgba(35,54,42,0.12)] ring-1 ring-white/70",
          ].join(" ")}>
            <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:radial-gradient(#7f6a3e_1px,transparent_1px)] [background-size:12px_12px]" />
            {selected && <div className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[#0a7f3a] text-lg font-black text-white shadow-md">✓</div>}
            <div className="relative z-10 mt-5 h-[clamp(150px,19vh,205px)] w-[clamp(150px,19vh,205px)] shrink-0 self-center overflow-hidden rounded-full border-[6px] border-[#f7e7c4] bg-[#f5e5c1] shadow-[0_11px_0_rgba(65,45,20,0.16),0_24px_38px_rgba(40,55,38,0.18)]">
              <img src={item.image} alt={item.name} className="h-full w-full object-contain object-center transition duration-300 group-hover:scale-[1.025]" />
            </div>
            <div className={["relative z-10 mt-6 text-[36px] font-black leading-none tracking-[-0.045em] drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]", item.ink].join(" ")}>{item.name}</div>
            <div className="relative z-10 mt-3 text-[13px] font-black uppercase tracking-[0.12em] text-[#1e2f2a]">{item.title}</div>
            <div className="relative z-10 mt-1 text-[14px] font-bold text-[#687285]">{item.subtitle}</div>
            {(item.key==="gosta" || item.key==="justiina") && chooseStoresNoticeFor===item.key && !hasSelectedStores && (
              <div role="status" aria-live="polite" className="relative z-20 mt-4 w-full max-w-[270px] rounded-xl border-2 border-[#986c20] bg-[#fff4cc] px-3 py-2 text-center text-[16px] font-black leading-snug text-[#5d3c12] shadow-md">Valitse ensin kaupat</div>
            )}
            <div className="relative z-10 -mx-5 mt-auto flex min-h-[145px] w-[calc(100%+2.5rem)] flex-1 items-start justify-center border-t-2 border-[#8d805e]/25 px-5 pt-5 pb-5">
              <p className="w-full text-[15px] font-bold leading-snug text-[#3f4654]">{item.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
