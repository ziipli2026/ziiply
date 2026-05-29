"use client";

import React from "react";

type ScannerFlashState = "idle" | "success" | "error" | "searching";

type ZiiplyMobileScannerCardProps = {
  regionId: string;
  flashState?: ScannerFlashState;
  onClose?: () => void;
  onManualEan?: () => void;
  onCameraTap?: React.PointerEventHandler<HTMLDivElement>;
  className?: string;
};

export default function ZiiplyMobileScannerCard({
  regionId,
  flashState = "idle",
  onClose,
  onManualEan,
  onCameraTap,
  className = "",
}: ZiiplyMobileScannerCardProps) {
  const flashOverlayClass =
    flashState === "success"
      ? "bg-[#59ff7b]/20"
      : flashState === "error"
        ? "bg-[#ff4d4d]/20"
        : flashState === "searching"
          ? "bg-[#ffe27a]/12"
          : "bg-transparent";

  return (
    <div
      className={[
        "relative mx-auto w-full max-w-[430px]",
        "rounded-[2rem]",
        "border-[4px] border-[#35593d]",
        "bg-[#f5ead1]",
        "shadow-[0_18px_48px_rgba(0,0,0,0.18)]",
        "overflow-hidden",
        className,
      ].join(" ")}
    >
      {/* paper texture */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-multiply">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "radial-gradient(#000 0.4px, transparent 0.4px)",
            backgroundSize: "8px 8px",
          }}
        />
      </div>

      {/* top header */}
      <div className="relative px-5 pt-5">
        <div className="flex items-center justify-between">
          {/* retro grille */}
          <div className="space-y-[5px]">
            <div className="h-[3px] w-[42px] rounded-full bg-[#70562e]" />
            <div className="h-[3px] w-[42px] rounded-full bg-[#70562e]" />
            <div className="h-[3px] w-[42px] rounded-full bg-[#70562e]" />
          </div>

          {/* title plaque */}
          <div
            className="
              relative flex-1 mx-4
              rounded-[1rem]
              border-[3px] border-[#9a7a47]
              bg-[#efe0b8]
              py-3
              text-center
              shadow-[inset_0_2px_0_rgba(255,255,255,0.8)]
            "
          >
            <div className="absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-[#7a5d36] bg-[#d9c089]" />
            <div className="absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border border-[#7a5d36] bg-[#d9c089]" />

            <span
              className="
                text-[2rem]
                font-black
                uppercase
                tracking-[0.06em]
                text-[#24452c]
              "
              style={{
                fontFamily:
                  'Georgia, "Times New Roman", serif',
              }}
            >
              Skanneri
            </span>
          </div>

          {/* red status lamp */}
          <div
            className="
              h-[52px] w-[52px]
              rounded-full
              border-[4px] border-[#4f3717]
              bg-[radial-gradient(circle_at_35%_30%,#ffb0a5_0%,#f13f31_45%,#7d120d_100%)]
              shadow-[0_0_14px_rgba(255,70,50,0.5)]
            "
          />
        </div>

        {/* instruction strip */}
        <div
          className="
            mt-5
            rounded-[1rem]
            border-[2px] border-[#d2b279]
            bg-[#f7ecd0]
            px-4
            py-3
            text-center
            text-[1.05rem]
            font-bold
            text-[#24452c]
          "
        >
          Aseta viivakoodi kehykseen
        </div>
      </div>

      {/* scanner frame */}
      <div className="relative px-5 pt-5">
        <div
          className="
            relative
            overflow-hidden
            rounded-[2rem]
            border-[5px] border-[#6c532c]
            bg-[#101713]
            p-4
          "
        >
          {/* flash overlay */}
          <div
            className={[
              "pointer-events-none absolute inset-0 z-20 transition-colors duration-200",
              flashOverlayClass,
            ].join(" ")}
          />

          {/* camera viewport */}
          <div
            id={regionId}
            onPointerUp={onCameraTap}
            className="
              relative
              h-[420px]
              overflow-hidden
              rounded-[1.5rem]
              border-[3px] border-[#927342]
              bg-[#0f1411]
            "
          >
            {/* subtle grid */}
            <div
              className="absolute inset-0 opacity-[0.08]"
              style={{
                backgroundImage:
                  "linear-gradient(to right,#fff 1px,transparent 1px),linear-gradient(to bottom,#fff 1px,transparent 1px)",
                backgroundSize: "18px 18px",
              }}
            />

            {/* scan line */}
            <div
              className="
                pointer-events-none
                absolute left-0 top-1/2 z-10
                h-[4px] w-full
                -translate-y-1/2
                bg-[#88ff7d]
                shadow-[0_0_22px_rgba(120,255,120,0.9)]
              "
            />

            {/* corner guides */}
            <ScannerCorner className="left-6 top-6" />
            <ScannerCorner className="right-6 top-6 rotate-90" />
            <ScannerCorner className="bottom-6 left-6 -rotate-90" />
            <ScannerCorner className="bottom-6 right-6 rotate-180" />

            {/* top focus notch */}
            <div
              className="
                absolute left-1/2 top-5
                h-[46px] w-[180px]
                -translate-x-1/2
                rounded-[1rem]
                border-[4px] border-[#d6c08d]
              "
            />
          </div>
        </div>
      </div>

      {/* info strip */}
      <div className="px-5 pt-5">
        <div
          className="
            flex items-center gap-4
            rounded-[1rem]
            border-[2px] border-[#d2b279]
            bg-[#f7ecd0]
            px-4
            py-4
          "
        >
          <div
            className="
              h-7 w-7 flex-shrink-0
              rounded-full
              border-[3px] border-[#274d20]
              bg-[radial-gradient(circle_at_35%_30%,#c8ff9d_0%,#5daa39_55%,#2b5c18_100%)]
              shadow-[0_0_10px_rgba(98,255,98,0.45)]
            "
          />

          <div
            className="
              text-[1rem]
              font-bold
              leading-snug
              text-[#27452d]
            "
          >
            Kuva otetaan, hinnanhuojennukset talteen.
            Säästöt esiin!
          </div>
        </div>
      </div>

      {/* bottom controls */}
      <div className="flex items-end justify-between px-5 pb-6 pt-6">
        {/* manual */}
        <button
          type="button"
          onClick={onManualEan}
          className="
            flex h-[110px] w-[110px]
            flex-col items-center justify-center gap-2
            rounded-[1.2rem]
            border-[4px] border-[#8d6e3d]
            bg-[#f8ecd0]
            shadow-[inset_0_2px_0_rgba(255,255,255,0.85)]
            active:scale-[0.98]
          "
        >
          <span className="text-[2rem]">✎</span>

          <span
            className="
              text-center text-[1rem]
              font-black uppercase
              leading-tight
              text-[#28492f]
            "
          >
            EAN käsin
          </span>
        </button>

        {/* camera button */}
        <button
          type="button"
          className="
            relative
            flex h-[145px] w-[145px]
            items-center justify-center
            rounded-full
            border-[6px] border-[#7b6034]
            bg-[#d8c08c]
            shadow-[0_6px_18px_rgba(0,0,0,0.2)]
            active:scale-[0.98]
          "
        >
          <div
            className="
              flex h-[112px] w-[112px]
              items-center justify-center
              rounded-full
              border-[4px] border-[#efe2b8]
              bg-[linear-gradient(180deg,#214e27_0%,#132f18_100%)]
            "
          >
            <span className="text-[3.4rem] text-[#fff6d9]">
              📷
            </span>
          </div>
        </button>

        {/* close */}
        <button
          type="button"
          onClick={onClose}
          className="
            flex h-[110px] w-[110px]
            flex-col items-center justify-center gap-2
            rounded-[1.2rem]
            border-[4px] border-[#7d2b1d]
            bg-[linear-gradient(180deg,#c64235_0%,#9d261d_100%)]
            shadow-[inset_0_2px_0_rgba(255,255,255,0.2)]
            active:scale-[0.98]
          "
        >
          <span className="text-[2.4rem] font-black text-[#fff3dc]">
            ×
          </span>

          <span
            className="
              text-center text-[1rem]
              font-black uppercase
              leading-tight
              text-[#fff2db]
            "
          >
            Sulje
            <br />
            kamera
          </span>
        </button>
      </div>
    </div>
  );
}

function ScannerCorner({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={[
        "absolute h-[90px] w-[90px]",
        className,
      ].join(" ")}
    >
      <div className="absolute left-0 top-0 h-[8px] w-[72px] rounded-full bg-[#fff8ea]" />
      <div className="absolute left-0 top-0 h-[72px] w-[8px] rounded-full bg-[#fff8ea]" />
    </div>
  );
}
