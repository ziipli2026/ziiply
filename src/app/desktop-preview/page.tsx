"use client";

import { useState } from "react";

type Assistant = "gosta" | "justiina" | "arvo";

const assistants = [
  {
    key: "gosta" as const,
    name: "Gösta",
    title: "Tarjoukset",
    subtitle: "Hinnat ja tarjoukset",
    image: "/assistants/gosta.png",
    frame: "border-[#8bb56d] bg-gradient-to-b from-[#f4ffe3] via-[#e0f0bd] to-[#c6dc91]",
    ink: "text-[#244a28]",
  },
  {
    key: "justiina" as const,
    name: "Justiina",
    title: "Reseptit",
    subtitle: "Ruokaideat ja haku",
    image: "/assistants/justiina.png",
    frame: "border-[#c69655] bg-gradient-to-b from-[#fff6da] via-[#ffe9a2] to-[#edc66c]",
    ink: "text-[#6b331e]",
  },
  {
    key: "arvo" as const,
    name: "Arvo",
    title: "Asetukset",
    subtitle: "Omat valinnat",
    image: "/assistants/arvo.png",
    frame: "border-[#b99d62] bg-gradient-to-b from-[#fff3d0] via-[#ead4a1] to-[#d3b474]",
    ink: "text-[#314633]",
  },
];

export default function DesktopPreviewPage() {
  const [active, setActive] = useState<Assistant>("justiina");

  return (
    <main
      className="relative min-h-screen overflow-hidden text-[#050b2b] selection:bg-[#d9b96f]/35"
      style={{
        background:
          "radial-gradient(circle at 18% 5%, rgba(255,249,232,0.98) 0%, rgba(240,237,220,0.92) 25%, rgba(225,232,220,0.97) 52%, rgba(209,221,211,1) 100%)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.11]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 18% 16%, rgba(255,255,255,0.62) 0 1px, transparent 1.8px), radial-gradient(circle at 72% 42%, rgba(122,97,49,0.12) 0 1px, transparent 2px)",
          backgroundSize: "34px 34px, 48px 48px",
        }}
      />

      <div aria-hidden className="pointer-events-none absolute -left-32 top-24 h-[520px] w-[520px] rounded-full bg-[#f6e8b8]/35 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-40 bottom-[-80px] h-[620px] w-[620px] rounded-full bg-[#8ead91]/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute left-[44%] top-[10%] h-[190px] w-[190px] rotate-12 rounded-[44px] border border-[#8c7042]/10 bg-[#fff7df]/18 shadow-[0_30px_80px_rgba(70,60,35,0.05)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1560px] flex-col px-8 py-7 xl:px-12 xl:py-9">
        <header className="flex items-center justify-between border-b border-[#64745f]/20 pb-5">
          <div className="flex items-center gap-4">
            <img
              src="/ziiplylogo_mobile.png"
              alt="Ziiply"
              className="h-[74px] w-[74px] object-contain drop-shadow-[0_4px_10px_rgba(21,79,50,0.10)]"
            />
            <div>
              <div className="text-[13px] font-black uppercase tracking-[0.22em] text-[#6d765f]">
                Yksi haku. Kaikki hinnat.
              </div>
              <div className="mt-1 text-[18px] font-black text-[#314633]">Ziiply</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm font-black text-[#4e5d4d]">
            <button className="rounded-full border border-[#6d8069]/25 bg-[#fffaf0]/65 px-5 py-3 shadow-sm">
              📍 Hyvinkää
            </button>
            <button className="rounded-full border border-[#6d8069]/25 bg-[#fffaf0]/65 px-5 py-3 shadow-sm">
              ☰
            </button>
          </div>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[0.76fr_1.24fr] xl:gap-14">
          <div className="relative max-w-[570px]">
            <div aria-hidden className="absolute -left-7 -top-10 -z-10 h-[118%] w-[112%] -rotate-2 rounded-[46px] border border-[#806b45]/10 bg-[#fffaf0]/26 shadow-[0_30px_80px_rgba(54,68,52,0.06)]" />
            <div className="mb-5 inline-flex rounded-full border border-[#73846d]/25 bg-[#f8f5ed]/72 px-4 py-2 text-[12px] font-black uppercase tracking-[0.18em] text-[#68705c] shadow-sm">
              Ruokaostokset fiksummin
            </div>
            <h1 className="text-[clamp(54px,5.3vw,86px)] font-black leading-[0.91] tracking-[-0.06em] text-[#050b2b] drop-shadow-[0_2px_0_rgba(255,255,255,0.58)]">
              Viilaa ruokakorisi huokeammaks
            </h1>
            <p className="mt-6 max-w-[500px] text-[clamp(18px,1.6vw,25px)] font-black leading-[1.22] tracking-[-0.025em] text-[#686d5c]">
              Gösta, Justiina ja Arvo auttavat arjen valinnoissa.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <span className="rotate-[-1deg] rounded-full border border-[#77906f]/25 bg-[#f4ffe3]/72 px-4 py-2 text-[12px] font-black uppercase tracking-[0.08em] text-[#36553b] shadow-sm">Tarjoukset</span>
              <span className="rotate-[1deg] rounded-full border border-[#c69a58]/25 bg-[#fff1c8]/72 px-4 py-2 text-[12px] font-black uppercase tracking-[0.08em] text-[#704b27] shadow-sm">Hintavertailu</span>
              <span className="rotate-[-1deg] rounded-full border border-[#9b8762]/25 bg-[#f3e7c9]/72 px-4 py-2 text-[12px] font-black uppercase tracking-[0.08em] text-[#4f553e] shadow-sm">Ostoskorit</span>
            </div>
            <p className="mt-6 max-w-[480px] text-[16px] font-bold leading-relaxed text-[#697468]">
              Etsi hinnat ja tarjoukset, suunnittele ostokset ja pidä omat valintasi yhdessä paikassa.
            </p>
          </div>

          <div className="relative rounded-[46px] border border-[#756443]/15 bg-[#f8f5ed]/92 p-6 shadow-[0_34px_90px_rgba(34,54,43,0.22)] ring-1 ring-[#fffaf0]/95 backdrop-blur-[4px] xl:p-8">
            <div aria-hidden className="absolute -right-4 -top-5 h-24 w-24 rotate-6 rounded-[26px] border border-[#8b7145]/15 bg-[#fff0bd]/55 shadow-[0_16px_35px_rgba(91,67,30,0.10)]" />
            <div aria-hidden className="absolute -bottom-5 left-12 h-16 w-40 -rotate-2 rounded-[22px] border border-[#61785d]/12 bg-[#dce8d8]/60 shadow-[0_14px_30px_rgba(41,67,46,0.08)]" />
            <div className="mb-6 flex items-end justify-between gap-4 px-1">
              <div>
                <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#7a806e]">Mitä tehdään?</div>
                <h2 className="mt-1 text-[30px] font-black tracking-[-0.035em]">Valitse apuri</h2>
              </div>
              <div className="hidden text-right text-[13px] font-bold leading-tight text-[#818777] xl:block">
                Sama Ziiply,<br />enemmän työtilaa.
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 xl:gap-5">
              {assistants.map((item) => {
                const selected = active === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActive(item.key)}
                    className={[
                      "group relative min-h-[430px] overflow-hidden rounded-[34px] border-[3px] p-5 text-center transition duration-200 hover:-translate-y-2 hover:rotate-[0.3deg] hover:shadow-[0_28px_54px_rgba(35,54,42,0.22)] active:translate-y-0",
                      item.frame,
                      selected ? "ring-4 ring-[#0a7f3a]/18 shadow-[0_22px_42px_rgba(35,54,42,0.18)]" : "shadow-[0_14px_30px_rgba(35,54,42,0.12)] ring-1 ring-white/70",
                    ].join(" ")}
                  >
                    <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:radial-gradient(#7f6a3e_1px,transparent_1px)] [background-size:12px_12px]" />
                    {selected && (
                      <div className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-[#0a7f3a] text-lg font-black text-white shadow-md">
                        ✓
                      </div>
                    )}
                    <div className="relative z-10 mx-auto mt-5 h-[205px] w-[205px] overflow-hidden rounded-full border-[6px] border-[#f7e7c4] bg-[#314633] shadow-[0_11px_0_rgba(65,45,20,0.16),0_24px_38px_rgba(40,55,38,0.18)] xl:h-[235px] xl:w-[235px]">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]" />
                    </div>
                    <div className={["relative z-10 mt-6 text-[36px] font-black leading-none tracking-[-0.045em] drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]", item.ink].join(" ")}>
                      {item.name}
                    </div>
                    <div className="relative z-10 mt-3 text-[13px] font-black uppercase tracking-[0.12em] text-[#1e2f2a]">
                      {item.title}
                    </div>
                    <div className="relative z-10 mt-2 text-[14px] font-bold text-[#687285]">
                      {item.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between rounded-[24px] border border-[#77856e]/15 bg-white/48 px-5 py-4">
              <div className="text-[14px] font-bold text-[#657064]">
                Valittuna <span className="font-black text-[#243a2b]">{assistants.find((x) => x.key === active)?.name}</span>
              </div>
              <button className="rounded-full bg-[#214c32] px-6 py-3 text-[14px] font-black text-white shadow-[0_8px_18px_rgba(33,76,50,0.22)]">
                Jatka →
              </button>
            </div>
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-[#64745f]/15 pt-5 text-[12px] font-bold text-[#747d6e]">
          <span>Ziiply Oy</span>
          <span>One search. All prices.</span>
        </footer>
      </div>
    </main>
  );
}
