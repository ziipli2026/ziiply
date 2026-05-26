"use client";

import React from "react";

type Mode =
  | "price"
  | "distance"
  | "speed"
  | "offers";

type Props = {
  mode: Mode;
  onChange: (mode: Mode) => void;
};

const modes: {
  key: Mode;
  label: string;
}[] = [
  { key: "price", label: "Hinta" },
  { key: "distance", label: "Matka" },
  { key: "speed", label: "Nopeus" },
  { key: "offers", label: "Tarjoukset" },
];

export default function ZiiplyMobileStoreModeSelector({
  mode,
  onChange,
}: Props) {
  return (
    <section className="mb-3 flex gap-2 overflow-x-auto pb-1">
      {modes.map((item) => {
        const active = item.key === mode;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            className={[
              "shrink-0 rounded-full px-4 py-2 text-[13px] font-black transition",
              active
                ? "bg-[#03133f] text-white shadow-[0_6px_18px_rgba(3,19,63,0.18)]"
                : "bg-white text-slate-500 ring-1 ring-slate-200",
            ].join(" ")}
          >
            {item.label}
          </button>
        );
      })}
    </section>
  );
}
