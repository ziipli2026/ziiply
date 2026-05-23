import React from "react";

export type StoreOption = {
  id: string;
  name: string;
  chain?: "S" | "K" | "Lidl" | string;
  distance?: string;
  address?: string;
  badge?: string;
  selected?: boolean;
};

export type StoresResponsiveCardProps = {
  stores: StoreOption[];
  title?: string;
  subtitle?: string;
  onSelectStore?: (storeId: string) => void;
  onUseGps?: () => void;
  onManualArea?: () => void;
};

function getChainMeta(chain?: StoreOption["chain"]) {
  const normalized = String(chain || "").toLowerCase();

  if (normalized === "s" || normalized.includes("s-ryhmä") || normalized.includes("s-ryhma")) {
    return {
      label: "S-RYHMÄ",
      letter: "S",
      border: "border-emerald-600",
      bg: "bg-emerald-50",
      badgeBg: "bg-emerald-600",
      badgeRing: "ring-emerald-100",
      text: "text-emerald-700",
      selectedButton: "bg-emerald-50 text-slate-400 border-slate-200",
    };
  }

  if (normalized === "k" || normalized.includes("k-ryhmä") || normalized.includes("k-ryhma")) {
    return {
      label: "K-RYHMÄ",
      letter: "K",
      border: "border-red-600",
      bg: "bg-red-50",
      badgeBg: "bg-red-600",
      badgeRing: "ring-red-100",
      text: "text-red-700",
      selectedButton: "bg-slate-50 text-slate-400 border-slate-200",
    };
  }

  if (normalized.includes("lidl")) {
    return {
      label: "LIDL",
      letter: "L",
      border: "border-slate-200",
      bg: "bg-white",
      badgeBg: "bg-blue-500",
      badgeRing: "ring-blue-100",
      text: "text-slate-400",
      selectedButton: "bg-slate-50 text-slate-400 border-slate-200",
    };
  }

  if (normalized.includes("tokmanni") || normalized.includes("spar")) {
    return {
      label: "TOKMANNI",
      letter: "T",
      border: "border-slate-200",
      bg: "bg-white",
      badgeBg: "bg-yellow-300",
      badgeRing: "ring-yellow-100",
      text: "text-slate-400",
      selectedButton: "bg-slate-50 text-slate-400 border-slate-200",
    };
  }

  return {
    label: chain ? String(chain).toUpperCase() : "KAUPPA",
    letter: chain ? String(chain).slice(0, 1).toUpperCase() : "K",
    border: "border-slate-200",
    bg: "bg-white",
    badgeBg: "bg-slate-400",
    badgeRing: "ring-slate-100",
    text: "text-slate-500",
    selectedButton: "bg-slate-50 text-slate-400 border-slate-200",
  };
}

function getFallbackStores(): StoreOption[] {
  return [
    { id: "s", name: "Prisma Hyvinkää", chain: "S", distance: "10 km", selected: true },
    { id: "k", name: "K-Citymarket Hyvinkää", chain: "K", distance: "10 km", selected: true },
    { id: "lidl", name: "Tulossa", chain: "Lidl", distance: "", selected: false },
    { id: "tokmanni", name: "Tulossa", chain: "Tokmanni", distance: "", selected: false },
  ];
}

export function StoresResponsiveCard({
  stores,
  title = "Ketjujen väliltä",
  subtitle = "Valitse kaupat",
  onSelectStore,
  onUseGps,
  onManualArea,
}: StoresResponsiveCardProps) {
  const shown = stores.length ? stores : getFallbackStores();

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/92 text-slate-900 shadow-[0_10px_34px_rgba(15,23,42,0.10)] backdrop-blur lg:rounded-[36px]">
      <div className="relative px-4 pb-5 pt-4 lg:px-8 lg:pb-8 lg:pt-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onManualArea}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-base font-black text-slate-800 shadow-[0_3px_10px_rgba(15,23,42,0.08)] active:scale-[0.98] lg:px-5 lg:text-lg"
          >
            <span className="text-lg leading-none">←</span>
            <span>Kaupat</span>
          </button>

          <div className="inline-flex min-h-[44px] items-center rounded-full border border-emerald-100 bg-emerald-50 px-5 text-sm font-black uppercase tracking-[0.04em] text-emerald-800 shadow-[0_3px_10px_rgba(16,185,129,0.08)] lg:px-6 lg:text-base">
            {title}
          </div>
        </div>

        <div className="sr-only">
          <h2>{subtitle}</h2>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 lg:mt-7 lg:gap-4">
          {shown.map((store) => {
            const meta = getChainMeta(store.chain);
            const isDisabled = /tulossa/i.test(store.name) || store.badge?.toLowerCase() === "tulossa";
            const isSelected = Boolean(store.selected);

            return (
              <button
                key={store.id}
                type="button"
                onClick={() => {
                  if (!isDisabled) onSelectStore?.(store.id);
                }}
                disabled={isDisabled}
                className={`relative min-h-[168px] rounded-[24px] border-2 p-3 text-center transition active:scale-[0.99] lg:min-h-[190px] lg:p-5 ${
                  isSelected ? `${meta.border} ${meta.bg} shadow-[0_4px_14px_rgba(15,23,42,0.10)]` : "border-slate-200 bg-white shadow-[0_3px_12px_rgba(15,23,42,0.05)]"
                } ${isDisabled ? "opacity-70" : ""}`}
              >
                <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full text-3xl font-black text-white ring-[10px] ${meta.badgeBg} ${meta.badgeRing} lg:h-20 lg:w-20 lg:text-4xl`}>
                  {meta.letter}
                </div>

                {isSelected ? (
                  <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-xl font-black text-white shadow-[0_4px_10px_rgba(15,23,42,0.22)]">
                    ✓
                  </div>
                ) : (
                  <div className="absolute right-4 top-4 h-9 w-9 rounded-full bg-slate-50" />
                )}

                <div className={`mt-4 text-[13px] font-black uppercase tracking-wide ${isDisabled ? "text-slate-400" : "text-slate-500"} lg:text-sm`}>
                  {meta.label}
                </div>

                <div className={`mt-2 min-h-[44px] text-[16px] font-black leading-tight lg:text-xl ${isDisabled ? "text-slate-500" : "text-slate-900"}`}>
                  {store.name}
                </div>

                {store.distance ? (
                  <div className="mt-3 text-sm font-black text-slate-400 lg:text-base">{store.distance}</div>
                ) : null}

                {isDisabled ? (
                  <div className="mt-2 text-[13px] font-black text-slate-500 lg:text-base">Tulossa</div>
                ) : (
                  <div className={`mx-auto mt-3 inline-flex min-h-[34px] items-center rounded-full border px-4 text-sm font-black ${meta.selectedButton}`}>
                    {isSelected ? "Valittu" : "Valitse"}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:hidden">
          <button
            type="button"
            onClick={onManualArea}
            className="min-h-[48px] rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-700 shadow-sm"
          >
            Alue
          </button>
          <button
            type="button"
            onClick={onUseGps}
            className="min-h-[48px] rounded-2xl bg-slate-950 px-3 text-sm font-black text-white shadow-lg"
          >
            Sijainti
          </button>
        </div>
      </div>
    </section>
  );
}
