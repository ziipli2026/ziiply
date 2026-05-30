"use client";

/**
 * ZiiplyMobileScannerCard-v574-unique-region-visible-video.tsx
 * 2026-05-30
 *
 * Uudelleenrakennettu mobiiliskannerikortti.
 *
 * Muutokset:
 * - Ei käytä WEBP-taustakuvaa lainkaan.
 * - Ei cache-riippuvaista scanner-screen-kuvaa.
 * - Kamera mountataan vain yhteen tyhjään diviin: id={regionId}.
 * - Video/canvas pakotetaan täyttämään skanneriruutu.
 * - Kortti on yhden ruudun fixed-height UI:lle sopiva.
 * - Ei "EAN käsin" -nappia.
 * - Säilyttää "Liitä EAN", kameratoiminnon ja "Sulje kamera".
 * - Ohje näytetään kameraruudun päällä vain 2,5 s.
 * - Vihreä/punainen väläys koko kortin päällä success/error-tiloissa.
 * - Ei backdrop-bluria, ei WEBP-layeria, ei ylimääräisiä pointer-events-kikkailuja.
 * - v574: startup-ohje 2,5s ja tarkoitettu käytettäväksi mobiilin omalla regionId:llä.
 */

import React, { useEffect, useMemo, useState } from "react";

export type ZiiplyMobileScannerFlashState = "idle" | "success" | "error";

export type ZiiplyMobileScannerCardProps = {
  regionId: string;
  flashState?: ZiiplyMobileScannerFlashState;
  loading?: boolean;
  scannerMessage?: string;
  torchOn?: boolean;
  manualInputOpen?: boolean;
  onToggleTorch?: () => void;
  onToggleManualInput?: () => void;
  onCameraTap?: React.PointerEventHandler<HTMLDivElement>;
  onClose?: () => void | Promise<void>;
  className?: string;
};

export default function ZiiplyMobileScannerCard({
  regionId,
  flashState = "idle",
  loading = false,
  scannerMessage = "",
  torchOn = false,
  manualInputOpen = false,
  onToggleTorch,
  onToggleManualInput,
  onCameraTap,
  onClose,
  className = "",
}: ZiiplyMobileScannerCardProps) {
  const [showStartupHint, setShowStartupHint] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowStartupHint(false);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, []);

  const flashClass = useMemo(() => {
    if (flashState === "success") {
      return "bg-[#56ff72]/28 shadow-[inset_0_0_90px_rgba(70,255,100,0.72)]";
    }

    if (flashState === "error") {
      return "bg-[#ff3e32]/30 shadow-[inset_0_0_90px_rgba(255,40,30,0.72)]";
    }

    return "bg-transparent";
  }, [flashState]);

  const visibleMessage =
    flashState === "success"
      ? "Lisätty koriin"
      : flashState === "error"
        ? "Ei löytynyt"
        : scannerMessage || "";

  return (
    <section
      className={[
        "relative mx-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden",
        "rounded-[1.65rem] border-[4px] border-[#073d32]",
        "bg-[#fff5d9]",
        "shadow-[0_16px_38px_rgba(8,42,35,0.24),inset_0_0_0_2px_rgba(255,255,255,0.74)]",
        "text-[#163d32]",
        className,
      ].join(" ")}
      aria-label="Viivakoodin skanneri"
    >
      <style jsx global>{`
        #${regionId} {
          width: 100% !important;
          height: 100% !important;
          min-height: 100% !important;
          position: absolute !important;
          inset: 0 !important;
          overflow: hidden !important;
          background: #050806 !important;
        }

        #${regionId} video,
        #${regionId} canvas {
          width: 100% !important;
          height: 100% !important;
          min-width: 100% !important;
          min-height: 100% !important;
          object-fit: cover !important;
          border-radius: 1.05rem !important;
        }

        #${regionId} > div {
          width: 100% !important;
          height: 100% !important;
        }

        #${regionId} img,
        #${regionId} svg {
          max-width: none !important;
        }
      `}</style>

      {/* koko kortin palauteväläys */}
      <div
        className={[
          "pointer-events-none absolute inset-0 z-[80] transition-colors duration-150",
          flashClass,
        ].join(" ")}
        aria-hidden="true"
      />

      {/* paperi/emali tekstuuri */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-[0.055] mix-blend-multiply"
        style={{
          backgroundImage: "radial-gradient(#3f2f16 0.45px, transparent 0.45px)",
          backgroundSize: "7px 7px",
        }}
        aria-hidden="true"
      />

      {/* Header */}
      <header className="relative z-10 flex shrink-0 items-center gap-2 px-3 pb-2 pt-3">
        <div className="flex h-[40px] w-[54px] shrink-0 flex-col justify-center gap-[5px] rounded-[0.8rem] border-[2px] border-[#b9975c] bg-[#f7e6bd] px-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)]">
          <span className="h-[3px] rounded-full bg-[#2c5b38]" />
          <span className="h-[3px] rounded-full bg-[#2c5b38]" />
          <span className="h-[3px] rounded-full bg-[#2c5b38]" />
        </div>

        <div className="min-w-0 flex-1 rounded-[0.95rem] border-[2.5px] border-[#9a7a47] bg-[#efe0b8] px-3 py-2 text-center shadow-[inset_0_2px_0_rgba(255,255,255,0.74)]">
          <div
            className="truncate text-[22px] font-black uppercase leading-none tracking-[0.075em] text-[#163d32]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            Skanneri
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleTorch}
          className={[
            "flex h-[40px] w-[54px] shrink-0 items-center justify-center rounded-[0.8rem] border-[2px] text-[18px] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.65)] active:scale-[0.98]",
            torchOn
              ? "border-[#a36f19] bg-[#ffd96f] text-[#4f3300]"
              : "border-[#b9975c] bg-[#f7e6bd] text-[#27452d]",
          ].join(" ")}
          aria-label={torchOn ? "Sammuta valo" : "Sytytä valo"}
          title={torchOn ? "Sammuta valo" : "Sytytä valo"}
        >
          ✦
        </button>
      </header>

      {/* Kamera-alue */}
      <main className="relative z-10 min-h-0 flex-1 px-3 pb-2">
        <div
          className="relative h-full min-h-[250px] overflow-hidden rounded-[1.35rem] border-[4px] border-[#6c532c] bg-[#07100b] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.12),0_8px_18px_rgba(0,0,0,0.20)]"
          onPointerUp={onCameraTap}
        >
          {/* AINOA kameran mount-piste. Html5Qrcode saa täyttää tämän. */}
          <div
            id={regionId}
            className="absolute inset-0 z-[1] h-full w-full overflow-hidden rounded-[1.05rem] bg-black"
          />

          {/* Tumma vintage-lasi-overlay */}
          <div
            className="pointer-events-none absolute inset-0 z-[5] rounded-[1.05rem] bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.08),transparent_48%),linear-gradient(180deg,rgba(0,0,0,0.10),rgba(0,0,0,0.22))]"
            aria-hidden="true"
          />

          {/* Scanline */}
          <div
            className="pointer-events-none absolute left-0 top-1/2 z-[12] h-[4px] w-full -translate-y-1/2 bg-[#91ff74] shadow-[0_0_20px_rgba(120,255,100,0.95),0_0_42px_rgba(120,255,100,0.48)]"
            aria-hidden="true"
          />

          {/* Kohdistuskulmat */}
          <ScannerCorner className="left-5 top-5" />
          <ScannerCorner className="right-5 top-5 rotate-90" />
          <ScannerCorner className="bottom-5 left-5 -rotate-90" />
          <ScannerCorner className="bottom-5 right-5 rotate-180" />

          {/* Hetken näkyvä alkuohje */}
          {showStartupHint && (
            <div className="pointer-events-none absolute inset-x-4 top-4 z-[35] rounded-[1rem] border-[2px] border-[#d1b06f] bg-[#fff4d1]/95 px-3 py-2 text-center text-[14px] font-black leading-tight text-[#163d32] shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
              Aseta viivakoodi kehykseen
            </div>
          )}

          {/* Palauteviesti, ei loaderia */}
          {visibleMessage && (
            <div
              className={[
                "pointer-events-none absolute inset-x-5 bottom-5 z-[35] rounded-[1rem] px-3 py-2 text-center text-[14px] font-black uppercase tracking-[0.035em] shadow-[0_8px_18px_rgba(0,0,0,0.20)]",
                flashState === "success"
                  ? "border-[2px] border-[#245c28] bg-[#d7ffd2]/95 text-[#123d18]"
                  : flashState === "error"
                    ? "border-[2px] border-[#7a1b15] bg-[#ffd6cf]/95 text-[#61130e]"
                    : "border-[2px] border-[#d1b06f] bg-[#fff4d1]/92 text-[#163d32]",
              ].join(" ")}
            >
              {visibleMessage}
            </div>
          )}
        </div>
      </main>

      {/* Alatoiminnot */}
      <footer className="relative z-10 grid shrink-0 grid-cols-[1fr_82px_1fr] items-center gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2">
        <button
          type="button"
          onClick={onToggleManualInput}
          className={[
            "flex h-[64px] items-center justify-center rounded-[1.05rem] border-[3px] px-2 text-center text-[13px] font-black uppercase leading-tight shadow-[inset_0_2px_0_rgba(255,255,255,0.7)] active:scale-[0.985]",
            manualInputOpen
              ? "border-[#245b32] bg-[#d8ffd0] text-[#123d18]"
              : "border-[#8d6e3d] bg-[#f8ecd0] text-[#28492f]",
          ].join(" ")}
        >
          Liitä EAN
        </button>

        <button
          type="button"
          onClick={() => {
            // Pääkameranappi ei käynnistä erillistä logiikkaa.
            // Kamera käynnistetään page.tsx:n eanModalOpen/eanScannerOpen-polussa.
            // Napin tarkoitus on antaa käyttäjälle iso, selkeä "skannaa/katso tähän" -ankkuri.
          }}
          className="flex h-[78px] w-[78px] items-center justify-center rounded-full border-[5px] border-[#7b6034] bg-[#d8c08c] shadow-[0_6px_16px_rgba(0,0,0,0.22),inset_0_2px_0_rgba(255,255,255,0.55)] active:scale-[0.98]"
          aria-label="Kamera"
        >
          <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full border-[3px] border-[#efe2b8] bg-[linear-gradient(180deg,#24572b_0%,#113116_100%)] text-[29px] leading-none text-[#fff6d9]">
            📷
          </span>
        </button>

        <button
          type="button"
          onClick={() => void onClose?.()}
          className="flex h-[64px] items-center justify-center rounded-[1.05rem] border-[3px] border-[#7d2b1d] bg-[linear-gradient(180deg,#c64235_0%,#922016_100%)] px-2 text-center text-[13px] font-black uppercase leading-tight text-[#fff3dc] shadow-[inset_0_2px_0_rgba(255,255,255,0.20)] active:scale-[0.985]"
        >
          Sulje kamera
        </button>
      </footer>

      {loading && (
        <div className="pointer-events-none absolute right-4 top-[66px] z-[45] rounded-full border-[2px] border-[#d1b06f] bg-[#fff4d1]/95 px-3 py-1 text-[11px] font-black uppercase tracking-[0.06em] text-[#163d32] shadow-[0_5px_14px_rgba(0,0,0,0.14)]">
          Luetaan
        </div>
      )}
    </section>
  );
}

function ScannerCorner({ className = "" }: { className?: string }) {
  return (
    <div
      className={["pointer-events-none absolute z-[15] h-[76px] w-[76px]", className].join(" ")}
      aria-hidden="true"
    >
      <div className="absolute left-0 top-0 h-[7px] w-[58px] rounded-full bg-[#fff8ea] shadow-[0_0_10px_rgba(255,255,255,0.45)]" />
      <div className="absolute left-0 top-0 h-[58px] w-[7px] rounded-full bg-[#fff8ea] shadow-[0_0_10px_rgba(255,255,255,0.45)]" />
    </div>
  );
}
