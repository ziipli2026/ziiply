"use client";

/**
 * ZiiplyMobileScannerCard-v595-bottom-up-no-hint.tsx
 * 2026-05-30
 *
 * Mobiiliskannerikortin v590-revisio.
 *
 * Muutokset:
 * - Ei käytä WEBP-taustakuvaa lainkaan.
 * - Ei cache-riippuvaista scanner-screen-kuvaa.
 * - Kamera mountataan vain yhteen tyhjään diviin: id={regionId}.
 * - Video/canvas pakotetaan täyttämään skanneriruutu.
 * - Kortti on yhden ruudun fixed-height UI:lle sopiva.
 * - Ei "EAN käsin" -nappia.
 * - Säilyttää "Liitä EAN", kameratoiminnon ja "Sulje kamera".
 * - v595: kameran ohjetekstit piilotettu kokonaan; vain haku-/flash-/valintakuittaukset näytetään.
 * - V593: vihreä/punainen väläys rajattu vain kameraruudun/skanneri-ikkunan sisään.
 * - Vihreä/punainen väläys koko kortin päällä success/error-tiloissa.
 * - Ei backdrop-bluria, ei WEBP-layeria, ei ylimääräisiä pointer-events-kikkailuja.
 * - v576: yhteensopiva page-v576:n näkyvän mountin odotuksen kanssa.
 * - v576: scanner mount pidetään aina näkyvässä kameraruudussa ja video/canvas nostetaan varmistetusti näkyviin.
 * - v576: startup-hyppyä ei tehdä kortin sisällä; ei transform-/scale-animaatiota mountissa.

 * - v577/v578: tutkaefekti vahvistettu merkittävästi.
 * - v578: sweep liikkuu lähes koko kameraruudun alueella.
 * - v578: hitaampi ja näkyvämpi radar-animaatio mobiilikäyttöön.
 * - v579: lisää selectionResults/onSelectResult propsit page-v577/v578-yhteensopivaksi.
 * - v579: tuotevalinta peittää koko kameraruudun.
 * - v580: fullscreen-tila ilman max-width/pyöristettyä korttireunaa.
 * - v580: tutkaefekti vahvistettu selvästi ja sweep-alue kasvatettu.
 * - v580: scanner mode täyttää koko mobiili-ikkunan.
 * - v581: tutkaefekti muutettu koko kameraruudun korkuiseksi ylhäältä alas.
 * - v581: taskulampun nappi pysyy puhtaana pass-through-toimintona page-logiikalle.
 * - v582: taskulamppunappi pysäyttää event-kuplan ja kutsuu vain page-propin.
 * - v585: palauttaa v582-tyylisen selkeän tutkalinjan, mutta poistaa haamu-/varjoviivat.
 * - v585: tutka on yksi fyysisesti kapea liikkuva elementti, ei koko ruudun korkuinen gradientti.
 * - v586: palauttaa koko kameraruudun korkuisen liikeradan.
 * - v586: yksi pehmeä tutka-aalto, ei kapeaa laser-viivaa eikä useita haamuaaltoja.
 * - v587: poistaa full-height-gradientin aiheuttamat haamuaallot.
 * - v587: ulompi alue on koko kameraruudun korkuinen, mutta vain yksi pehmeä sisäinen aalto liikkuu.
 * - v587: näkyvimmän aallon pehmeys säilytetty ilman terävää laser-viivaa.
 * - v588: korjaa tutka-aallon liikeradan kulkemaan koko kameraruudun korkeudelta ylhäältä alas.
 * - v588: säilyttää v587:n pehmeän yhden aallon ulkoasun.
 * - v589: hidastaa tutka-aallon liikkeen noin 0.5x nopeuteen pehmeämmän liikkeen saavuttamiseksi.
 * - v590: palauttaa kameraruudun päällä näkyvän HAETAAN-statusilmoituksen loading/scannerMessage-tilasta.
 * - v590: siistii useamman EAN-osuman valintapaneelin koko kameraruudun overlayksi.
 * - v590: piilottaa tutkan valintapaneelin ja hakuoverlayn alta.
 */

import React, { useMemo } from "react";

export type ZiiplyMobileScannerFlashState = "idle" | "success" | "error";

export type ZiiplyMobileScannerSelectionResult = {
  product?: unknown;
  name?: string;
  title?: string;
  displayName?: string;
  store?: string;
  chain?: string;
  price?: number | string;
  [key: string]: unknown;
};

export type ZiiplyMobileScannerCardProps = {
  regionId: string;
  flashState?: ZiiplyMobileScannerFlashState;
  loading?: boolean;
  scannerMessage?: string;
  torchOn?: boolean;
  manualInputOpen?: boolean;
  selectionResults?: ZiiplyMobileScannerSelectionResult[];
  onSelectResult?: (result: ZiiplyMobileScannerSelectionResult) => void;
  formatPrice?: (value: number) => string;
  getProductPrice?: (result: ZiiplyMobileScannerSelectionResult) => number | null | undefined;
  onToggleTorch?: () => void;
  onToggleManualInput?: () => void;
  onCameraTap?: React.PointerEventHandler<HTMLDivElement>;
  onClose?: () => void | Promise<void>;
  className?: string;
  fullscreen?: boolean;
};

export default function ZiiplyMobileScannerCard({
  regionId,
  flashState = "idle",
  loading = false,
  scannerMessage = "",
  torchOn = false,
  manualInputOpen = false,
  selectionResults = [],
  onSelectResult,
  formatPrice,
  getProductPrice,
  onToggleTorch,
  onToggleManualInput,
  onCameraTap,
  onClose,
  className = "",
  fullscreen = false,
}: ZiiplyMobileScannerCardProps) {
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
    loading
      ? "Haetaan tuotetta"
      : flashState === "success"
        ? "Lisätty koriin"
        : flashState === "error"
          ? "Ei löytynyt"
          : scannerMessage === "Tuote lisätty"
            ? "Tuote lisätty"
            : "";

  const hasSelectionResults = selectionResults.length > 1;

  function getSelectionName(result: ZiiplyMobileScannerSelectionResult) {
    return String(
      result.name ||
        result.title ||
        result.displayName ||
        (result.product as any)?.name ||
        (result.product as any)?.title ||
        "Tuote",
    );
  }

  function getSelectionMeta(result: ZiiplyMobileScannerSelectionResult) {
    const store = String(result.store || (result.product as any)?.store || "");
    const chain = String(result.chain || (result.product as any)?.chain || "");
    return [store, chain].filter(Boolean).join(" · ");
  }

  function getSelectionPrice(result: ZiiplyMobileScannerSelectionResult) {
    const directPrice =
      typeof result.price === "number"
        ? result.price
        : typeof result.price === "string"
          ? Number(String(result.price).replace(",", "."))
          : null;

    const resolvedPrice =
      getProductPrice?.(result) ??
      directPrice ??
      (typeof (result.product as any)?.price === "number"
        ? (result.product as any).price
        : null);

    if (typeof resolvedPrice !== "number" || !Number.isFinite(resolvedPrice)) return "";

    return formatPrice ? formatPrice(resolvedPrice) : `${resolvedPrice.toFixed(2).replace(".", ",")} €`;
  }

  return (
    <section
      className={[
"relative isolate mx-auto flex h-full w-full flex-col overflow-hidden transform-none",
        fullscreen ? "max-w-none rounded-none border-0" : "max-w-[430px] rounded-[1.65rem] border-[4px] border-[#073d32]",
        "bg-[#fff5d9]",
        fullscreen ? "shadow-none" : "shadow-[0_16px_38px_rgba(8,42,35,0.24),inset_0_0_0_2px_rgba(255,255,255,0.74)]",
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

        @keyframes ziiplyRadarSweep {
          0% {
            top: 100%;
            opacity: 0;
          }

          10% {
            opacity: 1;
          }

          90% {
            opacity: 1;
          }

          100% {
            top: -26%;
            opacity: 0;
          }
        }

        .ziiply-radar-sweep {
          overflow: hidden;
        }

        .ziiply-radar-band {
          position: absolute;
          left: 0;
          right: 0;
          top: 100%;
          height: 24%;
          min-height: 72px;
          max-height: 132px;

          background:
            linear-gradient(
              180deg,
              rgba(120,255,120,0.00) 0%,
              rgba(120,255,120,0.10) 20%,
              rgba(120,255,120,0.34) 38%,
              rgba(150,255,132,0.72) 50%,
              rgba(120,255,120,0.34) 62%,
              rgba(120,255,120,0.10) 80%,
              rgba(120,255,120,0.00) 100%
            );

          filter: blur(5px);

          box-shadow:
            0 0 26px rgba(120,255,120,0.38),
            0 0 58px rgba(120,255,120,0.18);

          animation: ziiplyRadarSweep 6.8s ease-in-out infinite;
          will-change: transform, opacity;
        }

      `}</style>


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
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleTorch?.();
          }}
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

          {/* V593: palauteväläys vain kameraruudun/skanneri-ikkunan sisällä */}
          <div
            className={[
              "pointer-events-none absolute inset-0 z-[24] rounded-[1.05rem] transition-colors duration-150",
              flashClass,
            ].join(" ")}
            aria-hidden="true"
          />
          {/* Radar sweep */}
          {!loading && !hasSelectionResults && (
            <div
              className="pointer-events-none absolute inset-0 z-[28] ziiply-radar-sweep"
              aria-hidden="true"
            >
              <div className="ziiply-radar-band" />
            </div>
          )}


          {/* Kohdistuskulmat */}
          <ScannerCorner className="left-5 top-5" />
          <ScannerCorner className="right-5 top-5 rotate-90" />
          <ScannerCorner className="bottom-5 left-5 -rotate-90" />
          <ScannerCorner className="bottom-5 right-5 rotate-180" />

          {/* V594: kameran käynnistyksen ohjeteksti poistettu kokonaan. */}

          {/* Palauteviesti, ei loaderia */}
          {visibleMessage && (
            <div
              className={[
                "pointer-events-none absolute left-1/2 top-1/2 z-[45] w-[min(82%,320px)] -translate-x-1/2 -translate-y-1/2 rounded-[1rem] px-4 py-3 text-center text-[15px] font-black uppercase tracking-[0.05em] shadow-[0_10px_24px_rgba(0,0,0,0.28)]",
                flashState === "success"
                  ? "border-[2px] border-[#245c28] bg-[#d7ffd2]/95 text-[#123d18]"
                  : flashState === "error"
                    ? "border-[2px] border-[#7a1b15] bg-[#ffd6cf]/95 text-[#61130e]"
                    : visibleMessage === "Tuote lisätty"
                      ? "border-[2px] border-[#245c28]/70 bg-[#d7ffd2]/52 text-[#123d18] backdrop-blur-[1px]"
                      : "border-[2px] border-[#245c28] bg-[#d7ffd2]/88 text-[#123d18] backdrop-blur-[2px]",
              ].join(" ")}
            >
              {visibleMessage}
            </div>
          )}

          {hasSelectionResults && (
            <div className="absolute inset-0 z-[60] flex flex-col rounded-[1.05rem] bg-[#fff5d9]/98 p-2 shadow-[inset_0_0_0_3px_rgba(21,61,50,0.18)]">
              <div className="mb-2 rounded-[0.85rem] border-[2px] border-[#9a7a47] bg-[#efe0b8] px-3 py-2 text-center text-[13px] font-black uppercase tracking-[0.035em] text-[#163d32]">
                Valitse lisättävä tuote
              </div>

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {selectionResults.map((result, index) => {
                  const name = getSelectionName(result);
                  const meta = getSelectionMeta(result);
                  const price = getSelectionPrice(result);

                  return (
                    <button
                      key={`${name}-${index}`}
                      type="button"
                      onClick={() => onSelectResult?.(result)}
                      className="flex min-h-[86px] w-full items-center gap-3 rounded-[1rem] border-[2px] border-[#8d6e3d] bg-[#fffaf0] px-3 py-2 text-left shadow-[0_3px_10px_rgba(0,0,0,0.10),inset_0_2px_0_rgba(255,255,255,0.75)] active:scale-[0.99]"
                    >
                      <div className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-[0.8rem] border border-[#d5bd83] bg-[#f8ecd0] text-[22px]">
                        🛒
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-[14px] font-black leading-tight text-[#173d31]">
                          {name}
                        </div>

                        <div className="mt-1 truncate text-[11px] font-bold text-[#6b5735]">
                          {meta || "Tarkka EAN-osuma"}
                        </div>

                        {price && (
                          <div className="mt-1 inline-flex rounded-full border border-[#245b32] bg-[#d8ffd0] px-2 py-[2px] text-[12px] font-black text-[#123d18]">
                            {price}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 rounded-full bg-[#04933c] px-3 py-2 text-[12px] font-black uppercase text-white shadow-[0_4px_10px_rgba(0,0,0,0.18)]">
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
