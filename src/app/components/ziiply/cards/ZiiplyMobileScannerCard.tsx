"use client";

import React from "react";

export type ZiiplyScannerFlashState = "idle" | "success" | "error" | "searching";

type ZiiplyMobileScannerCardProps = {
  regionId: string;
  flashState?: ZiiplyScannerFlashState;
  loading?: boolean;
  scannerMessage?: string;
  manualInputOpen?: boolean;
  torchOn?: boolean;
  onClose?: () => void;
  onManualEan?: () => void;
  onPasteEan?: () => void;
  onTorch?: () => void;
  onCameraTap?: React.PointerEventHandler<HTMLDivElement>;
  children?: React.ReactNode;
  className?: string;
};

export default function ZiiplyMobileScannerCard({
  regionId,
  flashState = "idle",
  loading = false,
  scannerMessage = "Kuva otetaan, hinnanhuojennukset talteen. Säästöt esiin!",
  manualInputOpen = false,
  torchOn = false,
  onClose,
  onManualEan,
  onPasteEan,
  onTorch,
  onCameraTap,
  children,
  className = "",
}: ZiiplyMobileScannerCardProps) {
  const flashOverlayClass =
    flashState === "success"
      ? "bg-[#59ff7b]/28"
      : flashState === "error"
        ? "bg-[#ff4d4d]/28"
        : flashState === "searching"
          ? "bg-[#ffe27a]/14"
          : "bg-transparent";

  return (
    <div
      className={[
        "relative mx-auto w-full max-w-[430px] overflow-hidden rounded-[2rem]",
        "border-[4px] border-[#35593d] bg-[#f5ead1]",
        "shadow-[0_18px_48px_rgba(0,0,0,0.18)]",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: "radial-gradient(#000 0.42px, transparent 0.42px)",
            backgroundSize: "8px 8px",
          }}
        />
      </div>

      <div className="relative px-4 pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="hidden min-[390px]:block space-y-[5px]">
            <div className="h-[3px] w-[42px] rounded-full bg-[#70562e]" />
            <div className="h-[3px] w-[42px] rounded-full bg-[#70562e]" />
            <div className="h-[3px] w-[42px] rounded-full bg-[#70562e]" />
          </div>

          <div className="relative min-w-0 flex-1 rounded-[1rem] border-[3px] border-[#9a7a47] bg-[#efe0b8] py-2 text-center shadow-[inset_0_2px_0_rgba(255,255,255,0.8)]">
            <span className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-[#7a5d36] bg-[#d9c089]" />
            <span className="absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-[#7a5d36] bg-[#d9c089]" />
            <span
              className="text-[1.8rem] font-black uppercase tracking-[0.06em] text-[#24452c]"
              style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
            >
              Skanneri
            </span>
          </div>

          <div
            className="h-[42px] w-[42px] shrink-0 rounded-full border-[4px] border-[#4f3717] bg-[radial-gradient(circle_at_35%_30%,#ffb0a5_0%,#f13f31_45%,#7d120d_100%)] shadow-[0_0_14px_rgba(255,70,50,0.45)]"
            aria-hidden="true"
          />
        </div>

        <div className="mt-4 rounded-[1rem] border-[2px] border-[#d2b279] bg-[#f7ecd0] px-3 py-2 text-center text-[0.98rem] font-black text-[#24452c]">
          Aseta viivakoodi kehykseen
        </div>
      </div>

      <div className="relative px-4 pt-4">
        <div className="relative overflow-hidden rounded-[2rem] border-[5px] border-[#6c532c] bg-[#101713] p-3">
          <div className={["pointer-events-none absolute inset-0 z-30 transition-colors duration-200", flashOverlayClass].join(" ")} />

          <div
            onPointerDown={onCameraTap}
            className="relative h-[420px] max-h-[calc(100dvh-22rem)] min-h-[300px] overflow-hidden rounded-[1.5rem] border-[3px] border-[#927342] bg-[#0f1411]"
          >
            <div
              id={regionId}
              className="absolute inset-0 h-full w-full overflow-hidden rounded-[1.35rem] bg-[#0f1411] [&_*]:!box-border [&_canvas]:!hidden [&_div]:!border-0 [&_div]:!shadow-none [&_video]:!absolute [&_video]:!inset-0 [&_video]:!h-full [&_video]:!w-full [&_video]:rounded-[1.35rem] [&_video]:!object-cover"
            />

            <div
              className="pointer-events-none absolute inset-0 z-10 opacity-[0.08]"
              style={{
                backgroundImage:
                  "linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)",
                backgroundSize: "18px 18px",
              }}
            />

            <div className="pointer-events-none absolute left-0 top-1/2 z-20 h-[4px] w-full -translate-y-1/2 bg-[#88ff7d] shadow-[0_0_22px_rgba(120,255,120,0.9)]" />

            <ScannerCorner className="left-6 top-6" />
            <ScannerCorner className="right-6 top-6 rotate-90" />
            <ScannerCorner className="bottom-6 left-6 -rotate-90" />
            <ScannerCorner className="bottom-6 right-6 rotate-180" />

            <div className="pointer-events-none absolute left-1/2 top-5 z-20 h-[42px] w-[160px] -translate-x-1/2 rounded-[1rem] border-[4px] border-[#d6c08d]" />

            {loading && (
              <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-[1.5rem] bg-[#172016]/45">
                <div className="rounded-3xl bg-[#101713]/85 px-6 py-4 text-center text-[#fff6dd] shadow-2xl ring-2 ring-white/20">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/15 text-3xl animate-pulse">⏳</div>
                  <div className="mt-2 text-xs font-black uppercase tracking-[0.22em]">Haetaan</div>
                </div>
              </div>
            )}

            {flashState === "success" && (
              <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-[1.5rem] bg-green-400/20">
                <div className="grid h-24 w-24 place-items-center rounded-full bg-green-600 text-5xl font-black text-white shadow-2xl ring-4 ring-white/80 animate-pulse">✓</div>
                <div className="absolute bottom-5 rounded-full bg-green-700 px-4 py-2 text-sm font-black text-white shadow-xl ring-2 ring-white/70">Löytyi</div>
              </div>
            )}

            {flashState === "error" && (
              <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-[1.5rem] bg-red-500/20">
                <div className="grid h-24 w-24 place-items-center rounded-full bg-red-700 text-5xl font-black text-white shadow-2xl ring-4 ring-white/80 animate-pulse">?</div>
                <div className="absolute bottom-5 rounded-full bg-red-700 px-4 py-2 text-sm font-black text-white shadow-xl ring-2 ring-white/70">Ei löytynyt</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-center gap-3 rounded-[1rem] border-[2px] border-[#d2b279] bg-[#f7ecd0] px-3 py-3">
          <div className="h-6 w-6 shrink-0 rounded-full border-[3px] border-[#274d20] bg-[radial-gradient(circle_at_35%_30%,#c8ff9d_0%,#5daa39_55%,#2b5c18_100%)] shadow-[0_0_10px_rgba(98,255,98,0.45)]" />
          <div className="min-w-0 text-[0.88rem] font-black leading-snug text-[#27452d]">
            {scannerMessage}
          </div>
        </div>
      </div>

      <div className="px-4 pt-3">
        <div className={manualInputOpen ? "block" : "hidden"}>{children}</div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 px-4 pb-5 pt-5">
        <button
          type="button"
          onClick={onManualEan}
          className={`flex h-[96px] min-w-0 flex-col items-center justify-center gap-1 rounded-[1.1rem] border-[3px] px-2 shadow-[inset_0_2px_0_rgba(255,255,255,0.85)] active:scale-[0.98] ${manualInputOpen ? "border-[#2f7c3f] bg-[#e3f1d5] text-[#1f4d25]" : "border-[#8d6e3d] bg-[#f8ecd0] text-[#28492f]"}`}
          aria-pressed={manualInputOpen}
        >
          <span className="text-[1.8rem]">✎</span>
          <span className="text-center text-[0.88rem] font-black uppercase leading-tight">EAN käsin</span>
        </button>

        <button
          type="button"
          onClick={onTorch}
          className="relative grid h-[120px] w-[120px] place-items-center rounded-full border-[5px] border-[#7b6034] bg-[#d8c08c] shadow-[0_6px_18px_rgba(0,0,0,0.2)] active:scale-[0.98]"
          aria-label="Kamera / valo"
        >
          <div className={`grid h-[92px] w-[92px] place-items-center rounded-full border-[4px] border-[#efe2b8] ${torchOn ? "bg-[linear-gradient(180deg,#fff4a8_0%,#c99d24_100%)]" : "bg-[linear-gradient(180deg,#214e27_0%,#132f18_100%)]"}`}>
            <span className="text-[2.9rem] text-[#fff6d9]">📷</span>
          </div>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="flex h-[96px] min-w-0 flex-col items-center justify-center gap-1 rounded-[1.1rem] border-[3px] border-[#7d2b1d] bg-[linear-gradient(180deg,#c64235_0%,#9d261d_100%)] px-2 text-[#fff2db] shadow-[inset_0_2px_0_rgba(255,255,255,0.2)] active:scale-[0.98]"
        >
          <span className="text-[2.1rem] font-black leading-none">×</span>
          <span className="text-center text-[0.86rem] font-black uppercase leading-tight">Sulje<br />kamera</span>
        </button>
      </div>

      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onPasteEan}
            className="rounded-[1rem] border border-[#d2b279] bg-[#f7ecd0] px-3 py-3 text-sm font-black text-[#3a3325] active:scale-[0.98]"
          >
            Liitä EAN
          </button>
          <button
            type="button"
            onClick={onTorch}
            className={`rounded-[1rem] border px-3 py-3 text-sm font-black active:scale-[0.98] ${torchOn ? "border-[#b99a33] bg-yellow-100 text-yellow-900" : "border-[#d2b279] bg-[#f7ecd0] text-[#3a3325]"}`}
          >
            {torchOn ? "Valo päällä" : "Valo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ScannerCorner({ className = "" }: { className?: string }) {
  return (
    <div className={["pointer-events-none absolute z-20 h-[72px] w-[72px]", className].join(" ")}>
      <div className="absolute left-0 top-0 h-[7px] w-[58px] rounded-full bg-[#fff8ea]" />
      <div className="absolute left-0 top-0 h-[58px] w-[7px] rounded-full bg-[#fff8ea]" />
    </div>
  );
}
