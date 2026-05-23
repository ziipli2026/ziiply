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

type ChainMeta = {
  label: string;
  letter: string;
  border: string;
  surface: string;
  circle: string;
  ring: string;
  labelText: string;
  nameText: string;
  mutedText: string;
  selectedPill: string;
};

function normalizeChain(chain?: StoreOption["chain"]) {
  return String(chain || "").trim().toLowerCase();
}

function getChainMeta(chain?: StoreOption["chain"]): ChainMeta {
  const normalized = normalizeChain(chain);

  if (normalized === "s" || normalized.includes("s-ryhmä") || normalized.includes("s-ryhma")) {
    return {
      label: "S-RYHMÄ",
      letter: "S",
      border: "border-[#05A83F]",
      surface: "bg-[#EEFBF4]",
      circle: "bg-[#009A3D]",
      ring: "ring-[#D8F7E4]",
      labelText: "text-[#68768D]",
      nameText: "text-[#19243A]",
      mutedText: "text-[#9AA8BC]",
      selectedPill: "border-[#D9E2EC] bg-[#F5F8FB] text-[#98A7BB]",
    };
  }

  if (normalized === "k" || normalized.includes("k-ryhmä") || normalized.includes("k-ryhma")) {
    return {
      label: "K-RYHMÄ",
      letter: "K",
      border: "border-[#F1191F]",
      surface: "bg-[#FFF1F1]",
      circle: "bg-[#D9000D]",
      ring: "ring-[#FFE0E0]",
      labelText: "text-[#68768D]",
      nameText: "text-[#19243A]",
      mutedText: "text-[#9AA8BC]",
      selectedPill: "border-[#D9E2EC] bg-[#F5F8FB] text-[#98A7BB]",
    };
  }

  if (normalized.includes("lidl")) {
    return {
      label: "LIDL",
      letter: "L",
      border: "border-[#E8EDF3]",
      surface: "bg-white",
      circle: "bg-[#7096F8]",
      ring: "ring-[#E5EDFF]",
      labelText: "text-[#A2ADBC]",
      nameText: "text-[#6B7280]",
      mutedText: "text-[#A2ADBC]",
      selectedPill: "border-[#E5EAF1] bg-[#F8FAFC] text-[#B4BECC]",
    };
  }

  if (normalized.includes("tokmanni") || normalized.includes("spar") || normalized === "t") {
    return {
      label: "TOKMANNI",
      letter: "T",
      border: "border-[#E8EDF3]",
      surface: "bg-white",
      circle: "bg-[#FFDB55]",
      ring: "ring-[#FFF5C9]",
      labelText: "text-[#A2ADBC]",
      nameText: "text-[#6B7280]",
      mutedText: "text-[#A2ADBC]",
      selectedPill: "border-[#E5EAF1] bg-[#F8FAFC] text-[#B4BECC]",
    };
  }

  return {
    label: chain ? String(chain).toUpperCase() : "KAUPPA",
    letter: chain ? String(chain).slice(0, 1).toUpperCase() : "K",
    border: "border-[#E8EDF3]",
    surface: "bg-white",
    circle: "bg-[#94A3B8]",
    ring: "ring-[#EEF2F7]",
    labelText: "text-[#A2ADBC]",
    nameText: "text-[#19243A]",
    mutedText: "text-[#A2ADBC]",
    selectedPill: "border-[#E5EAF1] bg-[#F8FAFC] text-[#B4BECC]",
  };
}

function getFallbackStores(): StoreOption[] {
  return [
    { id: "s", name: "Prisma Hyvinkää", chain: "S", distance: "10 km", selected: true },
    { id: "k", name: "K-Citymarket Hyvinkää", chain: "K", distance: "10 km", selected: true },
    { id: "lidl", name: "Tulossa", chain: "Lidl", selected: false },
    { id: "tokmanni", name: "Tulossa", chain: "Tokmanni", selected: false },
  ];
}

function isComingSoon(store: StoreOption) {
  const text = `${store.name || ""} ${store.badge || ""} ${store.distance || ""}`.toLowerCase();
  return text.includes("tulossa");
}

function getDisplayName(store: StoreOption, disabled: boolean) {
  if (disabled) return "Tulossa";
  return store.name;
}

export function StoresResponsiveCard({
  stores,
  title = "Ketjujen väliltä",
  onSelectStore,
  onManualArea,
}: StoresResponsiveCardProps) {
  const shown = stores.length ? stores : getFallbackStores();

  return (
    <section className="overflow-hidden rounded-[32px] border border-[#E5EBF2] bg-white/95 text-[#19243A] shadow-[0_8px_26px_rgba(15,23,42,0.08)] backdrop-blur lg:rounded-[38px]">
      <div className="px-4 pb-5 pt-4 lg:px-8 lg:pb-8 lg:pt-6">
        <div className="mb-6 flex items-center justify-between gap-3 lg:mb-7">
          <button
            type="button"
            onClick={onManualArea}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-[#DCE3EC] bg-white px-5 text-[18px] font-black text-[#24324A] shadow-[0_4px_10px_rgba(15,23,42,0.08)] active:scale-[0.98] lg:px-6 lg:text-xl"
          >
            <span className="text-[20px] leading-none">←</span>
            <span>Kaupat</span>
          </button>

          <div className="inline-flex min-h-[48px] items-center rounded-full border border-[#D9F4E3] bg-[#F0FBF4] px-6 text-[17px] font-black uppercase tracking-[0.04em] text-[#087A3A] shadow-[0_4px_10px_rgba(16,185,129,0.08)] lg:px-8 lg:text-xl">
            {title}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5 lg:gap-5">
          {shown.map((store) => {
            const meta = getChainMeta(store.chain);
            const disabled = isComingSoon(store);
            const selected = Boolean(store.selected);
            const showSelected = selected && !disabled;

            return (
              <button
                key={store.id}
                type="button"
                onClick={() => {
                  if (!disabled) onSelectStore?.(store.id);
                }}
                disabled={disabled}
                className={`relative min-h-[220px] overflow-hidden rounded-[28px] border-2 p-4 text-center transition active:scale-[0.985] lg:min-h-[250px] lg:p-5 ${
                  showSelected
                    ? `${meta.border} ${meta.surface} shadow-[0_5px_14px_rgba(15,23,42,0.10)]`
                    : `${meta.border} ${meta.surface} shadow-[0_3px_12px_rgba(15,23,42,0.04)]`
                } ${disabled ? "opacity-65" : ""}`}
              >
                {showSelected ? (
                  <div className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#008F3A] text-[22px] font-black text-white shadow-[0_5px_12px_rgba(15,23,42,0.25)] lg:h-11 lg:w-11">
                    ✓
                  </div>
                ) : (
                  <div className="absolute right-4 top-4 h-10 w-10 rounded-full bg-[#F6F8FA]" />
                )}

                <div className={`mx-auto flex h-[76px] w-[76px] items-center justify-center rounded-full text-[38px] font-black text-white ring-[10px] ${meta.circle} ${meta.ring} lg:h-[92px] lg:w-[92px] lg:text-[46px]`}>
                  {meta.letter}
                </div>

                <div className={`mt-4 text-[15px] font-black uppercase tracking-wide ${meta.labelText} lg:text-[16px]`}>
                  {meta.label}
                </div>

                <div className={`mx-auto mt-2 min-h-[46px] max-w-[190px] text-[18px] font-black leading-tight ${disabled ? "text-[#7B8493]" : meta.nameText} lg:text-[21px]`}>
                  {getDisplayName(store, disabled)}
                </div>

                {!disabled && store.distance ? (
                  <div className={`mt-2 text-[16px] font-black ${meta.mutedText} lg:text-[17px]`}>
                    {store.distance}
                  </div>
                ) : null}

                {!disabled ? (
                  <div className={`mx-auto mt-4 inline-flex min-h-[36px] items-center rounded-full border px-5 text-[15px] font-black ${meta.selectedPill} lg:text-[16px]`}>
                    {selected ? "Valittu" : "Valitse"}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
