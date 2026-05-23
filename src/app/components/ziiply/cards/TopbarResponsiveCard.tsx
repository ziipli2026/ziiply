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
    { id: "weather", label: "SÄÄ", value: "+18°", subLabel: "Puolipilvistä", emoji: "🌤️" },
    { id: "electricity", label: "SÄHKÖ", value: "4,2 c/kWh", subLabel: "Kohtalainen", emoji: "⚡" },
    { id: "fuel", label: "BENSA 95", value: "1,649 €", subLabel: "Edullinen", emoji: "⛽" },
    { id: "calendar", label: "KALENTERI", value: "3", subLabel: "Tapahtumaa", emoji: "📅" },
  ];
}

function getStoreLabel(areaLabel?: string, storeModeLabel?: string) {
  const area = areaLabel || "Hyvinkää";
  const mode = storeModeLabel || "Valitse hakutapa";
  return `${area} · ${mode}`;
}

function InfoTile({
  item,
  compact = false,
}: {
  item: TopBarInfoItem;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "min-w-0 border-amber-900/20 bg-white/35",
        compact
          ? "rounded-2xl border px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
          : "border-r px-4 py-3 last:border-r-0",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div className={compact ? "text-2xl leading-none" : "text-4xl leading-none"}>
          {item.emoji || "•"}
        </div>

        <div className="min-w-0">
          <div
            className={[
              "truncate font-black uppercase tracking-wide text-emerald-950",
              compact ? "text-[10px]" : "text-xs",
            ].join(" ")}
          >
            {item.label}
          </div>

          {item.value ? (
            <div
              className={[
                "truncate font-black leading-tight text-emerald-950",
                compact ? "text-lg" : "text-2xl",
              ].join(" ")}
            >
              {item.value}
            </div>
          ) : null}

          {item.subLabel ? (
            <div
              className={[
                "truncate font-black text-emerald-950/80",
                compact ? "text-[10px]" : "text-xs",
              ].join(" ")}
            >
              {item.subLabel}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
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
  const storeLabel = getStoreLabel(areaLabel, storeModeLabel);

  return (
    <div className="w-full">
      {/* Mobile: mockup-fiilis, mutta ei desktop-banneria väkisin pienennettynä */}
      <div className="mx-auto block w-full max-w-[430px] px-3 md:hidden">
        <div className="relative overflow-hidden rounded-[1.75rem] border-[4px] border-emerald-950 bg-emerald-950 shadow-[0_18px_45px_rgba(15,23,42,0.18)]">
          <div className="relative rounded-[1.28rem] border border-amber-900/20 bg-[#fff7df] px-3 py-3">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-[radial-gradient(circle_at_7px_7px,rgba(180,122,35,0.24)_1.5px,transparent_2.5px)] bg-[length:10px_10px] opacity-60" />
            <div className="pointer-events-none absolute right-4 top-5 h-16 w-16 rounded-full bg-amber-200/45 blur-2xl" />
            <div className="pointer-events-none absolute left-8 top-8 h-20 w-20 rounded-full bg-emerald-200/25 blur-2xl" />

            <div className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenMenu}
                aria-label="Avaa valikko"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-950/15 bg-white/70 text-xl font-black text-emerald-950 shadow-[0_8px_18px_rgba(15,23,42,0.10)] active:scale-95"
              >
                ☰
              </button>

              <div className="flex min-w-0 flex-1 items-center rounded-2xl border border-amber-900/10 bg-white/50 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.70)]">
                {logoImageSrc ? (
                  <img
                    src={logoImageSrc}
                    alt={logoText}
                    className="h-10 w-auto max-w-[132px] object-contain"
                  />
                ) : (
                  <span className="truncate text-2xl font-black text-emerald-900">{logoText}</span>
                )}
              </div>

              <button
                type="button"
                onClick={onOpenInfo}
                aria-label="Lisätiedot"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-950/15 bg-white/70 text-xl font-black text-emerald-950 shadow-[0_8px_18px_rgba(15,23,42,0.10)] active:scale-95"
              >
                ⓘ
              </button>
            </div>

            <div className="relative mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenArea}
                className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border border-emerald-950/25 bg-white/55 px-3 py-2.5 text-sm font-black text-emerald-950 shadow-inner active:scale-[0.99]"
              >
                <span className="shrink-0 text-lg">📍</span>
                <span className="min-w-0 truncate">{storeLabel}</span>
                <span className="shrink-0 text-xs">⌄</span>
              </button>

              <div className="shrink-0 rounded-full bg-emerald-900 px-3.5 py-2.5 text-xs font-black tracking-wide text-white shadow-[0_8px_20px_rgba(6,78,59,0.28)]">
                {appVersion}
              </div>
            </div>

            <div className="relative mt-2 grid grid-cols-2 gap-2">
              {items.slice(0, 4).map((item) => (
                <InfoTile key={item.id} item={item} compact />
              ))}
            </div>

            <div className="pointer-events-none absolute bottom-[-23px] left-1/2 h-10 w-16 -translate-x-1/2 rounded-full border-t-[4px] border-emerald-950 bg-[#fff7df]" />
            <div className="pointer-events-none absolute bottom-[-8px] left-1/2 -translate-x-1/2 text-2xl text-emerald-950">✦</div>
          </div>

          <div className="h-5 bg-emerald-950" />
        </div>
      </div>

      {/* Desktop / tablet: mockupin leveä vaakabanneri */}
      <div className="mx-auto hidden w-full max-w-[1180px] px-4 md:block">
        <div className="relative overflow-hidden rounded-[1.7rem] border-[7px] border-emerald-950 bg-emerald-950 shadow-[0_20px_50px_rgba(15,23,42,0.22)]">
          <div className="relative rounded-[1.2rem] border border-amber-900/20 bg-[#fff7df] px-5 py-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-36 bg-[radial-gradient(circle_at_10px_10px,rgba(180,122,35,0.28)_2px,transparent_3px)] bg-[length:14px_14px] opacity-60" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-72 bg-gradient-to-l from-amber-100/70 to-transparent" />
            <div className="pointer-events-none absolute bottom-[-25px] left-1/2 h-14 w-24 -translate-x-1/2 rounded-full border-t-[7px] border-emerald-950 bg-[#fff7df]" />
            <div className="pointer-events-none absolute bottom-[-7px] left-1/2 -translate-x-1/2 text-4xl text-emerald-950">✦</div>

            <div className="relative grid grid-cols-[minmax(250px,1fr)_auto_minmax(230px,0.72fr)] items-center gap-4">
              <div className="flex min-w-0 items-center gap-4">
                {logoImageSrc ? (
                  <img src={logoImageSrc} alt={logoText} className="h-20 max-w-[285px] object-contain" />
                ) : (
                  <div className="text-5xl font-black text-emerald-900">{logoText}</div>
                )}
                <span className="hidden text-3xl text-amber-700 lg:inline">✦</span>
                <span className="hidden text-xl text-emerald-800 lg:inline">✦</span>
              </div>

              <div className="grid grid-cols-4 overflow-hidden rounded-3xl border border-amber-900/20 bg-white/35">
                {items.slice(0, 4).map((item) => (
                  <InfoTile key={item.id} item={item} />
                ))}
              </div>

              <div className="flex min-w-0 flex-col items-end gap-3 border-l border-dashed border-amber-900/20 pl-4">
                <button
                  type="button"
                  onClick={onOpenArea}
                  className="flex max-w-full items-center gap-2 rounded-full border border-emerald-950/25 bg-white/55 px-4 py-2 text-sm font-black text-emerald-950 shadow-inner"
                >
                  <span className="text-lg">📍</span>
                  <span className="truncate">{storeLabel}</span>
                  <span>⌄</span>
                </button>

                <div className="flex items-center gap-4">
                  <span className="text-2xl text-emerald-800">✦</span>
                  <div className="rounded-full bg-emerald-900 px-5 py-2 text-xl font-black tracking-wide text-white shadow-[0_10px_24px_rgba(6,78,59,0.30)]">
                    {appVersion}
                  </div>
                  <span className="text-2xl text-amber-700">✦</span>
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
