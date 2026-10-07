"use client";

import { useEffect, useState } from "react";

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
  const [scannerMode, setScannerMode] = useState<"checking" | "camera" | "external">("checking");
  const [workspace, setWorkspace] = useState<Assistant | null>(null);
  const [location, setLocation] = useState("Hyvinkää");
  const [gpsOn, setGpsOn] = useState(true);


  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices?.enumerateDevices().then((devices) => {
      const cameras = devices.filter((d) => d.kind === "videoinput");
      const rear = cameras.some((d) => /(back|rear|environment|world|takakamera)/i.test(d.label));
      const touch = navigator.maxTouchPoints > 1;
      if (!cancelled) setScannerMode(rear || (touch && cameras.length > 0) ? "camera" : "external");
    }).catch(() => { if (!cancelled) setScannerMode("external"); });
    return () => { cancelled = true; };
  }, []);

  return (
    <main
      className="relative h-[100dvh] overflow-hidden text-[#050b2b] selection:bg-[#d9b96f]/35"
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

      <div className="relative mx-auto flex h-[100dvh] w-full max-w-[1560px] flex-col px-8 py-5 xl:px-12 xl:py-6">
        <header className="grid grid-cols-[auto_minmax(520px,1fr)_minmax(380px,0.72fr)] items-center gap-5 border-b border-[#64745f]/20 pb-4">
          <div className="flex items-center gap-3">
            <img src="/ziiplylogo_mobile.png" alt="Ziiply" className="h-[66px] w-[66px] object-contain drop-shadow-[0_4px_10px_rgba(21,79,50,0.10)]" />
            <div>
              <div className="text-[12px] font-black uppercase tracking-[0.22em] text-[#6d765f]">Yksi haku. Kaikki hinnat.</div>
              <div className="mt-0.5 text-[17px] font-black text-[#314633]">Ziiply</div>
            </div>
          </div>

          <div className="mx-auto grid w-full max-w-[760px] grid-cols-4 gap-2.5">
            {[
              ["☀️", "SÄÄ", "+18°", "Hyvinkää", "from-[#fffdf0] to-[#ffedb8] border-[#b5cbb4]"],
              ["⚡", "SÄHKÖ", "—", "c/kWh", "from-[#fff6ce] to-[#ffdf75] border-[#d2b363]"],
              ["⛽", "AJOAINE", "—", "€/l", "from-[#fff1da] to-[#ffc795] border-[#c78b63]"],
            ].map(([icon, title, value, detail, theme]) => (
              <button key={title} type="button" className={`group relative flex h-[66px] items-center gap-3 rounded-[19px] border bg-gradient-to-b ${theme} px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_4px_10px_rgba(52,48,32,.10)] transition hover:-translate-y-0.5`}>
                <span className="text-[27px] drop-shadow-sm">{icon}</span>
                <span className="min-w-0">
                  <span className="block text-[9px] font-black tracking-[0.12em] text-[#625b43]">{title}</span>
                  <span className="mt-0.5 block text-[19px] font-black leading-none text-[#102a24]">{value}</span>
                  <span className="mt-1 block truncate text-[9px] font-black text-[#706a58]">{detail}</span>
                </span>
              </button>
            ))}
            <button type="button" onClick={() => { window.location.href = "webcal://"; }} className="group relative flex h-[66px] items-center gap-3 rounded-[19px] border border-[#c9a86d] bg-gradient-to-b from-[#fffaf0] to-[#ffe39a] px-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,.9),0_4px_10px_rgba(52,48,32,.10)] transition hover:-translate-y-0.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-[11px] border-2 border-[#8a5b1d] bg-[#fff9e8] text-[21px] font-black text-[#17322a] shadow-sm">7</span>
              <span>
                <span className="block text-[9px] font-black tracking-[0.12em] text-[#625b43]">LOKAKUU</span>
                <span className="mt-0.5 block text-[14px] font-black leading-none text-[#102a24]">Kalenteri</span>
                <span className="mt-1 block text-[9px] font-black text-[#8a5b1d]">Avaa kalenteri →</span>
              </span>
            </button>
          </div>

          <div className="grid h-[66px] min-w-0 grid-cols-[52px_minmax(180px,1fr)_64px_44px] items-center gap-2 rounded-[22px] border-[2px] border-[#0b4638] bg-[linear-gradient(180deg,#fffdf5_0%,#f7edd2_100%)] p-[5px] shadow-[inset_0_1px_0_rgba(255,255,255,.75),0_4px_12px_rgba(34,54,43,.10)]">
            <button type="button" onClick={() => setGpsOn((v) => !v)} title={gpsOn ? "GPS päällä" : "GPS pois"} className={`relative grid h-[52px] w-[52px] place-items-center rounded-[16px] border-2 shadow-[inset_0_1px_0_rgba(255,255,255,.72)] ${gpsOn ? "border-[#2f9f58] bg-gradient-to-b from-[#ebfff0] to-[#98dfad]" : "border-[#c77a7a] bg-gradient-to-b from-[#fff1f1] to-[#f0caca]"}`}>
              <span className="text-[23px]">📍</span>
              <span className="absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-full border border-white bg-[#159447] shadow-sm" />
            </button>
            <label className="relative min-w-0 rounded-[15px] border border-[#b89552] bg-gradient-to-b from-[#fff8e7] to-[#efd79d] px-3 py-1.5 shadow-inner">
              <span className="block text-[8px] font-black uppercase tracking-[0.12em] text-[#756848]">Paikkakunta tai postinumero</span>
              <input value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Paikkakunta tai postinumero" className="mt-0.5 block w-full bg-transparent text-[15px] font-black text-[#241b13] outline-none placeholder:text-[#766e5c]" placeholder="05510 tai Hyvinkää" />
            </label>
            <button type="button" title="Avaa kartta" className="group grid h-[52px] w-[64px] place-items-center rounded-[16px] border-2 border-[#65a99c] bg-gradient-to-b from-[#c8eee8] to-[#86cabf] shadow-[inset_0_1px_0_rgba(255,255,255,.65)]">
              <img src="/icons/ziiply-compass.png" alt="Avaa kartta" className="h-[43px] w-[43px] object-contain drop-shadow-[0_3px_6px_rgba(7,61,50,.24)] transition group-hover:scale-105" />
            </button>
            <button type="button" title="Valikko" className="flex h-[44px] w-[44px] items-center justify-center rounded-full border border-[#6d8069]/25 bg-[#fffaf0]/80 text-[18px] font-black shadow-sm">☰</button>
          </div>
        </header>

        <section className="grid min-h-0 flex-1 items-center gap-8 py-5 lg:grid-cols-[0.76fr_1.24fr] xl:gap-11">
          <div className="relative max-w-[570px]">
            <div aria-hidden className="absolute -left-7 -top-10 -z-10 h-[118%] w-[112%] -rotate-2 rounded-[46px] border border-[#806b45]/10 bg-[#fffaf0]/26 shadow-[0_30px_80px_rgba(54,68,52,0.06)]" />
            <div className="mb-5 inline-flex rounded-full border border-[#73846d]/25 bg-[#f8f5ed]/72 px-4 py-2 text-[12px] font-black uppercase tracking-[0.18em] text-[#68705c] shadow-sm">
              Ruokaostokset fiksummin
            </div>
            <h1 className="text-[clamp(48px,4.7vw,76px)] font-black leading-[0.91] tracking-[-0.06em] text-[#050b2b] drop-shadow-[0_2px_0_rgba(255,255,255,0.58)]">
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

          <div className="relative max-h-[calc(100dvh-150px)] rounded-[42px] border border-[#756443]/15 bg-[#f8f5ed]/92 p-5 shadow-[0_34px_90px_rgba(34,54,43,0.22)] ring-1 ring-[#fffaf0]/95 backdrop-blur-[4px] xl:p-8">
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
                    onClick={() => { setActive(item.key); setWorkspace(null); }}
                    className={[
                      "group relative min-h-[0] h-[clamp(330px,46vh,430px)] overflow-hidden rounded-[34px] border-[3px] p-5 text-center transition duration-200 hover:-translate-y-2 hover:rotate-[0.3deg] hover:shadow-[0_28px_54px_rgba(35,54,42,0.22)] active:translate-y-0",
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
                    <div className="relative z-10 mx-auto mt-5 h-[clamp(150px,19vh,205px)] w-[clamp(150px,19vh,205px)] overflow-hidden rounded-full border-[6px] border-[#f7e7c4] bg-[#314633] shadow-[0_11px_0_rgba(65,45,20,0.16),0_24px_38px_rgba(40,55,38,0.18)] xl:h-[clamp(170px,21vh,220px)] xl:w-[clamp(170px,21vh,220px)]">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.025]" />
                    </div>
                    <div className={["relative z-10 mt-6 text-[36px] font-black leading-none tracking-[-0.045em] drop-shadow-[0_1px_0_rgba(255,255,255,0.5)]", item.ink].join(" ")}>
                      {item.name}
                    </div>
                    <div className="relative z-10 mt-3 text-[13px] font-black uppercase tracking-[0.12em] text-[#1e2f2a]">
                      {item.title}
                    </div>
                    <div className="relative z-10 mt-1 text-[14px] font-bold text-[#687285]">
                      {item.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>

            {workspace && (
              <div className="absolute inset-5 z-40 flex flex-col rounded-[32px] border border-[#756443]/20 bg-[#f8f5ed]/[0.99] p-6 shadow-[0_28px_80px_rgba(34,54,43,.28)] xl:inset-8">
                <div className="flex items-center justify-between border-b border-[#71806d]/20 pb-4">
                  <div><div className="text-[11px] font-black uppercase tracking-[.16em] text-[#7a806e]">Desktop-työtila</div><div className="mt-1 text-[30px] font-black text-[#14291f]">{assistants.find(x => x.key === workspace)?.name} · {assistants.find(x => x.key === workspace)?.title}</div></div>
                  <button onClick={() => setWorkspace(null)} className="rounded-full border border-[#71806d]/25 bg-white/70 px-4 py-2 text-[13px] font-black">← Apurit</button>
                </div>
                <div className="grid min-h-0 flex-1 grid-cols-[1fr_300px] gap-5 pt-5">
                  <div className="rounded-[26px] border border-[#7b876f]/18 bg-white/55 p-6">
                    <div className="text-[12px] font-black uppercase tracking-[.14em] text-[#788170]">{workspace === "gosta" ? "Tarjoukset & kampanjat" : workspace === "justiina" ? "Tuotehaku & reseptit" : "Kaupat & asetukset"}</div>
                    <h3 className="mt-2 text-[26px] font-black text-[#193429]">{workspace === "gosta" ? "Mitä tarjouksia etsitään?" : workspace === "justiina" ? "Mitä etsitään tänään?" : "Omat valinnat"}</h3>
                    {workspace !== "arvo" ? <input autoFocus placeholder={workspace === "gosta" ? "Hae tarjouksista…" : "Hae tuotetta tai reseptiä…"} className="mt-5 w-full rounded-[18px] border-2 border-[#a88c58]/50 bg-[#fffdf5] px-5 py-4 text-[17px] font-black outline-none" /> : <div className="mt-5 grid grid-cols-2 gap-3"><button className="rounded-[18px] border border-[#82917d]/30 bg-[#f5f1e5] p-5 text-left font-black">🏪 Kaupat<br/><span className="text-[12px] text-[#788170]">{location}</span></button><button className="rounded-[18px] border border-[#82917d]/30 bg-[#f5f1e5] p-5 text-left font-black">⚙️ Asetukset<br/><span className="text-[12px] text-[#788170]">Omat valinnat</span></button></div>}
                    {workspace === "gosta" && <div className="mt-4 flex gap-3"><button className="rounded-full bg-[#2f7750] px-5 py-3 text-[13px] font-black text-white">Tarjoukset</button><button className="rounded-full border border-[#2f7750]/30 bg-white px-5 py-3 text-[13px] font-black">Kampanjat</button></div>}
                  </div>
                  <aside className="rounded-[26px] border border-[#b89552]/30 bg-gradient-to-b from-[#fff8e7] to-[#efddb3] p-5">
                    <div className="text-[11px] font-black uppercase tracking-[.14em] text-[#786642]">EAN / skanneri</div>
                    <div className="mt-3 text-[19px] font-black text-[#1b382c]">{scannerMode === "camera" ? "Kameraskannaus" : scannerMode === "external" ? "HID / EAN-lukija" : "Tarkistetaan laitetta…"}</div>
                    <p className="mt-2 text-[12px] font-bold leading-relaxed text-[#6d6654]">{scannerMode === "camera" ? "Tabletilla voit käyttää takakameraa tai ulkoista lukijaa." : "Skannaa Eyoyolla / USB-HID-lukijalla tai kirjoita EAN."}</p>
                    <input inputMode="numeric" placeholder="Skannaa tai kirjoita EAN" className="mt-5 w-full rounded-[14px] border border-[#a88c58] bg-[#fffdf5] px-4 py-3 text-[14px] font-black outline-none" />
                    {scannerMode === "camera" && <button className="mt-3 w-full rounded-[14px] bg-[#2f7750] px-4 py-3 text-[13px] font-black text-white">📷 Avaa skanneri</button>}
                  </aside>
                </div>
              </div>
            )}
<div className="mt-3 flex items-center justify-between rounded-[22px] border border-[#77856e]/15 bg-white/48 px-5 py-4">
              <div className="text-[14px] font-bold text-[#657064]">
                Valittuna <span className="font-black text-[#243a2b]">{assistants.find((x) => x.key === active)?.name}</span>
              </div>
              <button onClick={() => setWorkspace(active)} className="rounded-full bg-[#214c32] px-6 py-3 text-[14px] font-black text-white shadow-[0_8px_18px_rgba(33,76,50,0.22)]">
                Jatka →
              </button>
            </div>
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-[#64745f]/15 pt-3 text-[12px] font-bold text-[#747d6e]">
          <span>Ziiply Oy</span>
          <span>One search. All prices. · {scannerMode === "camera" ? "📷 Tablet-skannaus valmis" : scannerMode === "external" ? "⌨ HID/EAN-lukija valmis" : "Skanneria tarkistetaan…"}</span>
        </footer>
      </div>
    </main>
  );
}
