"use client";

/**
 * ZiiplyMobileScannerCard-v577-radar-selection-overlay.tsx
 * 2026-05-30
 *
 * Mobiiliskannerikortin v577-revisio.
 *
 * Muutokset:
 * - Ei käytä WEBP-taustakuvaa lainkaan.
 * - Kamera mountataan vain yhteen tyhjään diviin: id={regionId}.
 * - Video/canvas pakotetaan täyttämään skanneriruutu.
 * - Kortti on yhden ruudun fixed-height UI:lle sopiva.
 * - Ei "EAN käsin" -nappia.
 * - Säilyttää "Liitä EAN", kameratoiminnon ja "Sulje kamera".
 * - Ohje näytetään kameraruudun päällä vain 2,5 s.
 * - v577: kova neonviiva korvattu pehmeällä haaleanvihreällä ylös/alas tutkaefektillä.
 * - v577: loading näkyy viivakoodialueen päällä läpikuultavana "HAETAAN TUOTETTA" -ilmoituksena, ei oikeassa yläkulmassa.
 * - v577: usean EAN-osuman valintapaneeli peittää koko kameraruudun, jotta tuotteet näkyvät selkeästi.
 * - v577: tutka pysähtyy loadingin ja tuotevalinnan ajaksi.
 * - Ei backdrop-bluria, ei WEBP-layeria, ei ylimääräisiä pointer-events-kikkailuja.
 */

import React, { useEffect, useMemo, useState } from "react";

export type ZiiplyMobileScannerFlashState = "idle" | "success" | "error";

export type ZiiplyMobileScannerSelectionResult = {
  key: string;
  product: any;
  storeName?: string;
  chain?: string;
};

export type ZiiplyMobileScannerCardProps = {
  regionId: string;
  flashState?: ZiiplyMobileScannerFlashState;
  loading?: boolean;
  scannerMessage?: string;
  torchOn?: boolean;
  manualInputOpen?: boolean;
  onToggleTorch?: () => void;
  onToggleManualInput?: () => void;
  selectionResults?: ZiiplyMobileScannerSelectionResult[];
  onSelectResult?: (result: ZiiplyMobileScannerSelectionResult) => void;
  formatPrice?: (value: number) => string;
  getProductPrice?: (product: any) => number;
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
  selectionResults = [],
  onSelectResult,
  formatPrice,
  getProductPrice,
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

  const hasSelectionResults = selectionResults.length > 1;
  const radarActive = !loading && !hasSelectionResults;

  const readProductPrice = (product: any) => {
    try {
      const value =
        typeof getProductPrice === "function"
          ? getProductPrice(product)
          : Number(product?.price ?? product?.priceValue ?? product?.currentPrice ?? 0);
      return Number.isFinite(value) ? value : 0;
    } catch {
      return 0;
    }
  };

  const formatProductPrice = (price: number) => {
    if (typeof formatPrice === "function") return formatPrice(price);
    return price.toLocaleString("fi-FI", {
      style: "currency",
      currency: "EUR",
    });
  };

  return (
    <section
      className={[
        "relative isolate mx-auto flex h-full w-full max-w-[430px] flex-col overflow-hidden transform-none",
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

        #${regionId} > div,
        #${regionId}__dashboard,
        #${regionId}__scan_region {
          width: 100% !important;
          height: 100% !important;
        }

        #${regionId} video,
        #${regionId} canvas {
          display: block !important;
          position: relative !important;
          z-index: 2 !important;
        }

        #${regionId} img,
        #${regionId} svg {
          max-width: none !important;
        }

        @keyframes ziiply-scanner-radar-v577 {
          0% {
            transform: translateY(-38%);
            opacity: 0.28;
          }
          50% {
            transform: translateY(38%);
            opacity: 0.58;
          }
          100% {
            transform: translateY(-38%);
            opacity: 0.28;
          }
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
            data-ziiply-mobile-scanner-region="v576"
            className="absolute inset-0 z-[1] h-full w-full overflow-hidden rounded-[1.05rem] bg-black"
          />

          {/* Tumma vintage-lasi-overlay */}
          <div
            className="pointer-events-none absolute inset-0 z-[5] rounded-[1.05rem] bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.08),transparent_48%),linear-gradient(180deg,rgba(0,0,0,0.10),rgba(0,0,0,0.22))]"
            aria-hidden="true"
          />

          {/* V577: pehmeä tutkaefekti korvaa kovan neonviivan. */}
          {radarActive && (
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-[12] h-full"
              aria-hidden="true"
            >
              <div
                className="absolute left-0 top-1/2 h-[34%] w-full -translate-y-1/2 bg-[linear-gradient(180deg,transparent_0%,rgba(145,255,116,0.10)_22%,rgba(145,255,116,0.34)_50%,rgba(145,255,116,0.10)_78%,transparent_100%)] shadow-[0_0_28px_rgba(120,255,100,0.32)]"
                style={{ animation: "ziiply-scanner-radar-v577 2.2s ease-in-out infinite" }}
              />
            </div>
          )}

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
          {visibleMessage && !hasSelectionResults && (
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

          {loading && !hasSelectionResults && (
            <div className="pointer-events-none absolute inset-0 z-[40] flex items-center justify-center bg-[#082017]/18">
              <div className="rounded-[1.1rem] border-[2px] border-[#9ee98e]/70 bg-[#103722]/78 px-5 py-3 text-center text-[15px] font-black uppercase tracking-[0.10em] text-[#e8ffe4] shadow-[0_10px_28px_rgba(0,0,0,0.28),0_0_32px_rgba(145,255,116,0.24)]">
                Haetaan tuotetta
              </div>
            </div>
          )}

          {hasSelectionResults && (
            <div className="absolute inset-0 z-[50] flex flex-col rounded-[1.05rem] bg-[#f8ecd0]/96 p-3 text-[#163d32] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.58)]">
              <div className="shrink-0 rounded-[0.95rem] border-[2px] border-[#9a7a47] bg-[#efe0b8] px-3 py-2 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                <div className="text-[14px] font-black uppercase tracking-[0.08em]">
                  Valitse oikea tuote
                </div>
                <div className="mt-0.5 text-[11px] font-bold text-[#42604b]">
                  Sama viivakoodi löytyi useammasta tuotteesta
                </div>
              </div>

              <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {selectionResults.map((result) => {
                  const product = result.product || {};
                  const price = readProductPrice(product);
                  const image = product.pictureUrl || product.image || product.imageUrl;

                  return (
                    <button
                      key={result.key}
                      type="button"
                      onClick={() => onSelectResult?.(result)}
                      className="flex w-full items-center gap-3 rounded-[1rem] border-[2px] border-[#d0b071] bg-[#fff7df] p-2 text-left shadow-[0_3px_0_rgba(80,58,28,0.14)] active:scale-[0.99]"
                    >
                      {image ? (
                        <img
                          src={image}
                          alt={String(product.name || "Tuote")}
                          className="h-16 w-16 shrink-0 rounded-[0.75rem] border border-[#e0c996] bg-white object-contain"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[0.75rem] border border-[#e0c996] bg-[#f1dfb3] text-2xl">
                          ▦
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-[13px] font-black leading-tight text-[#142f24]">
                          {String(product.name || "Tuote")}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {result.storeName && (
                            <span className="rounded-full bg-[#e8d8ae] px-2 py-0.5 text-[10px] font-black text-[#4d3f22]">
                              {result.storeName}
                            </span>
                          )}
                          <span className="rounded-full bg-[#d8ffd0] px-2 py-0.5 text-[10px] font-black text-[#125020]">
                            Tarkka EAN
                          </span>
                        </div>
                        <div className="mt-1 text-[17px] font-black text-[#107331]">
                          {price > 0 ? formatProductPrice(price) : ""}
                        </div>
                      </div>

                      <div className="flex h-10 min-w-[58px] shrink-0 items-center justify-center rounded-full bg-[#0f7f36] px-3 text-[12px] font-black uppercase text-white shadow-sm">
                        Lisää
                      </div>
                    </button>
                  );
                })}
              </div>
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
