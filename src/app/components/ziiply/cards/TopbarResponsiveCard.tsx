import React from "react";

export type TopBarInfoItem = {
  id: string;
  label: string;
  value?: string;
  subLabel?: string;
  emoji?: string;
  hiddenOnMobile?: boolean;
};

export type ZiiplyTopBarProps = {
  appVersion?: string;
  areaLabel?: string;
  storeModeLabel?: string;
  logoText?: string;
  logoImageSrc?: string;
  infoItems?: TopBarInfoItem[];
  onOpenArea?: () => void;
  onOpenInfo?: () => void;
  onOpenMenu?: () => void;
};

function fallbackInfoItems(): TopBarInfoItem[] {
  return [
    {
      id: "weather",
      label: "SÄÄ",
      value: "+18°",
      subLabel: "Puolipilvistä",
      emoji: "🌤️",
    },
    {
      id: "electricity",
      label: "SÄHKÖ",
      value: "4,2 c/kWh",
      subLabel: "Kohtalainen",
      emoji: "⚡",
    },
    {
      id: "fuel",
      label: "BENSA 95",
      value: "1,649 €",
      subLabel: "Edullinen",
      emoji: "⛽",
    },
    {
      id: "calendar",
      label: "KALENTERI",
      value: "3",
      subLabel: "Tapahtumaa",
      emoji: "📅",
    },
  ];
}

function getCompactStoreLabel(areaLabel?: string, storeModeLabel?: string) {
  const area = areaLabel || "Hyvinkää";
  const mode = storeModeLabel || "Valitse hakutapa";
  return `${area} · ${mode}`;
}

export default function TopbarResponsiveCard({
  appVersion = "V320",
  areaLabel = "Hyvinkää",
  storeModeLabel = "Valitse hakutapa",
  logoText = "Ziiply",
  logoImageSrc = "/ziiply.png",
  infoItems,
  onOpenArea,
  onOpenInfo,
  onOpenMenu,
}: ZiiplyTopBarProps) {
  const items = infoItems && infoItems.length > 0 ? infoItems : fallbackInfoItems();
  const compactStoreLabel = getCompactStoreLabel(areaLabel, storeModeLabel);

  return (
    <div className="w-full">
      {/* Mobile */}
      <div className="mx-auto block w-full max-w-[430px] px-3 md:hidden">
        <div className="relative overflow-hidden rounded-[2rem] border border-emerald-950/15 bg-[#fff7df] shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
          <div className="absolute inset-x-0 bottom-0 h-3 bg-emerald-950" />
          <div className="absolute left-4 top-3 h-16 w-16 rounded-full bg-amber-200/40 blur-2xl" />
          <div className="absolute right-5 top-5 h-14 w-14 rounded-full bg-emerald-200/40 blur-2xl" />

          <div className="relative p-3 pb-5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenMenu}
                aria-label="Avaa valikko"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-900/10 bg-white/90 text-2xl font-black text-slate-950 shadow-[0_8px_22px_rgba(15,23,42,0.12)] active:scale-95"
              >
                ☰
              </button>

              <button
                type="button"
                onClick={onOpenArea}
                className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-900/20 bg-white/80 px-3 py-3 text-left shadow-inner active:scale-[0.99]"
              >
                <span className="text-xl">📍</span>
                <span className="min-w-0 truncate text-[17px] font-black leading-none text-emerald-950">
                  {compactStoreLabel}
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenInfo}
                aria-label="Lisätiedot"
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-900/10 bg-white/90 text-2xl font-black text-slate-950 shadow-[0_8px_22px_rgba(15,23,42,0.12)] active:scale-95"
              >
                ⓘ
              </button>
            </div>

            <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-3">
              <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-amber-900/10 bg-white/70 px-3 py-2">
                {logoImageSrc ? (
                  <img
                    src={logoImageSrc}
                    alt={logoText}
                    className="h-12 w-auto shrink-0 object-contain"
                  />
                ) : (
                  <span className="text-3xl font-black text-emerald-900">{logoText}</span>
                )}
              </div>

              <div className="rounded-full bg-emerald-900 px-4 py-2 text-sm font-black tracking-wide text-white shadow-[0_8px_20px_rgba(6,78,59,0.25)]">
                {appVersion}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              {items.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className={item.hiddenOnMobile ? "hidden" : "rounded-2xl border border-amber-900/10 bg-white/70 px-3 py-2 shadow-inner"}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{item.emoji || "•"}</span>
                    <div className="min-w-0">
                      <div className="truncate text-[10px] font-black uppercase tracking-wide text-emerald-950/80">
                        {item.label}
                      </div>
                      {item.value ? (
                        <div className="truncate text-base font-black text-emerald-950">
                          {item.value}
                        </div>
                      ) : null}
                      {item.subLabel ? (
                        <div className="truncate text-[10px] font-bold text-emerald-950/70">
                          {item.subLabel}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop / tablet */}
      <div className="mx-auto hidden w-full max-w-[1160px] px-4 md:block">
        <div className="relative overflow-hidden rounded-[1.7rem] border-[6px] border-emerald-950 bg-emerald-950 shadow-[0_20px_50px_rgba(15,23,42,0.20)]">
          <div className="relative rounded-[1.25rem] border border-amber-900/20 bg-[#fff7df] px-5 py-4">
            <div className="absolute inset-y-0 left-0 w-32 bg-[radial-gradient(circle_at_12px_12px,rgba(180,122,35,0.28)_2px,transparent_3px)] bg-[length:14px_14px] opacity-60" />
            <div className="absolute inset-x-0 bottom-[-22px] mx-auto h-12 w-20 rounded-full border-t-[6px] border-emerald-950 bg-[#fff7df]" />
            <div className="absolute bottom-[-8px] left-1/2 -translate-x-1/2 text-3xl text-emerald-950">✦</div>

            <div className="relative grid grid-cols-[minmax(230px,1fr)_auto_minmax(220px,0.8fr)] items-center gap-4">
              <div className="flex min-w-0 items-center gap-4">
                {logoImageSrc ? (
                  <img
                    src={logoImageSrc}
                    alt={logoText}
                    className="h-20 max-w-[260px] object-contain"
                  />
                ) : (
                  <div className="text-5xl font-black text-emerald-900">{logoText}</div>
                )}
                <span className="hidden text-3xl text-amber-700 lg:inline">✦</span>
              </div>

              <div className="grid grid-cols-4 overflow-hidden rounded-3xl border border-amber-900/20 bg-white/40">
                {items.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="min-w-[125px] border-r border-amber-900/20 px-4 py-3 last:border-r-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{item.emoji || "•"}</div>
                      <div className="min-w-0">
                        <div className="truncate text-xs font-black uppercase tracking-wide text-emerald-950">
                          {item.label}
                        </div>
                        {item.value ? (
                          <div className="truncate text-2xl font-black leading-tight text-emerald-950">
                            {item.value}
                          </div>
                        ) : null}
                        {item.subLabel ? (
                          <div className="truncate text-xs font-black text-emerald-950/80">
                            {item.subLabel}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex min-w-0 flex-col items-end gap-3">
                <button
                  type="button"
                  onClick={onOpenArea}
                  className="flex max-w-full items-center gap-2 rounded-full border border-emerald-950/25 bg-white/60 px-4 py-2 text-sm font-black text-emerald-950 shadow-inner"
                >
                  <span>📍</span>
                  <span className="truncate">{compactStoreLabel}</span>
                  <span>⌄</span>
                </button>

                <div className="rounded-full bg-emerald-900 px-5 py-2 text-xl font-black tracking-wide text-white shadow-[0_10px_24px_rgba(6,78,59,0.30)]">
                  {appVersion}
                </div>
              </div>
            </div>
          </div>

          <div className="h-7 bg-emerald-950" />
        </div>
      </div>
    </div>
  );
}

export { TopbarResponsiveCard };
export function ZiiplyTopBar(props: ZiiplyTopBarProps) {
  return <TopbarResponsiveCard {...props} />;
}
export function ZiiplyTopbarResponsiveCard(props: ZiiplyTopBarProps) {
  return <TopbarResponsiveCard {...props} />;
}
