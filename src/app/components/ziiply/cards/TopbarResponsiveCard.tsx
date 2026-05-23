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
    { id: "electricity", label: "SÄHKÖ", value: "4,2", subLabel: "c/kWh", emoji: "⚡" },
    { id: "fuel", label: "BENSA", value: "1,649", subLabel: "€", emoji: "⛽" },
    { id: "calendar", label: "KAL", value: "3", subLabel: "tap.", emoji: "📅" },
  ];
}

function cleanLocationLabel(areaLabel?: string, storeModeLabel?: string) {
  const area = String(areaLabel || "Hyvinkää").trim();
  const mode = String(storeModeLabel || "").trim();

  if (!mode || mode === "Valitse hakutapa") return area;
  return `${area} · ${mode}`;
}

function MobileSquareInfo({ item }: { item: TopBarInfoItem }) {
  return (
    <div className="flex h-[58px] min-w-0 flex-col items-center justify-center rounded-[1rem] border border-amber-900/20 bg-white/34 px-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
      <div className="text-[18px] leading-none">{item.emoji || "•"}</div>
      <div className="mt-0.5 max-w-full truncate text-[8px] font-black uppercase tracking-wide text-emerald-950/85">
        {item.label}
      </div>
      {item.value ? (
        <div className="max-w-full truncate text-[13px] font-black leading-none text-emerald-950">
          {item.value}
        </div>
      ) : null}
    </div>
  );
}

function DesktopInfoTile({ item }: { item: TopBarInfoItem }) {
  return (
    <div className="min-w-0 border-r border-amber-900/20 bg-white/20 px-4 py-3 last:border-r-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="text-4xl leading-none">{item.emoji || "•"}</div>
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
  );
}

export default function TopbarResponsiveCard({
  areaLabel = "Hyvinkää",
  storeModeLabel = "",
  logoImageSrc = "/ziiplylogo_mobile.png",
  infoItems,
  onOpenArea,
}: ZiiplyTopBarProps) {
  const items = infoItems && infoItems.length > 0 ? infoItems : fallbackInfoItems();
  const locationLabel = cleanLocationLabel(areaLabel, storeModeLabel);

  return (
    <div className="w-full">
      {/* MOBIILI: yksi matala vaakarivi, ei menu/info/versio/tekstilogoa */}
      <div className="mx-auto block w-full max-w-[430px] px-3 md:hidden">
        <div className="relative overflow-hidden rounded-[1.35rem] border-[4px] border-emerald-950 bg-emerald-950 shadow-[0_12px_30px_rgba(15,23,42,0.16)]">
          <div className="relative rounded-[0.92rem] border border-amber-900/20 bg-[#fff7df] px-2.5 py-2">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-[radial-gradient(circle_at_7px_7px,rgba(180,122,35,0.22)_1.5px,transparent_2.5px)] bg-[length:10px_10px] opacity-65" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-amber-100/60 to-transparent" />

            <div className="relative grid h-[64px] grid-cols-[58px_repeat(4,minmax(0,1fr))_76px] items-center gap-1.5">
              <div className="flex h-[58px] w-[58px] items-center justify-center rounded-[1rem] border border-amber-900/18 bg-white/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                <img
                  src={logoImageSrc}
                  alt="Ziiply"
                  className="h-[48px] w-[48px] object-contain"
                />
              </div>

              {items.slice(0, 4).map((item) => (
                <MobileSquareInfo key={item.id} item={item} />
              ))}

              <button
                type="button"
                onClick={onOpenArea}
                className="flex h-[34px] min-w-0 items-center justify-center gap-0.5 self-center rounded-full border border-emerald-950/22 bg-white/34 px-1.5 text-[10px] font-black text-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.70)] active:scale-[0.99]"
              >
                <span className="shrink-0 text-[13px] leading-none">📍</span>
                <span className="min-w-0 truncate">{locationLabel}</span>
              </button>
            </div>
          </div>

          <div className="h-3 bg-emerald-950" />
        </div>
      </div>

      {/* DESKTOP / TABLET */}
      <div className="mx-auto hidden w-full max-w-[1180px] px-4 md:block">
        <div className="relative overflow-hidden rounded-[1.6rem] border-[7px] border-emerald-950 bg-emerald-950 shadow-[0_20px_50px_rgba(15,23,42,0.22)]">
          <div className="relative rounded-[1.08rem] border border-amber-900/20 bg-[#fff7df] px-5 py-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-36 bg-[radial-gradient(circle_at_10px_10px,rgba(180,122,35,0.26)_2px,transparent_3px)] bg-[length:14px_14px] opacity-65" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-72 bg-gradient-to-l from-amber-100/60 to-transparent" />

            <div className="relative grid grid-cols-[132px_1fr_190px] items-stretch gap-4">
              <div className="flex items-center justify-center rounded-3xl border border-amber-900/15 bg-white/25 px-3">
                <img src={logoImageSrc} alt="Ziiply" className="h-[92px] w-[92px] object-contain" />
              </div>

              <div className="grid grid-cols-4 overflow-hidden rounded-3xl border border-amber-900/20 bg-white/25">
                {items.slice(0, 4).map((item) => (
                  <DesktopInfoTile key={item.id} item={item} />
                ))}
              </div>

              <button
                type="button"
                onClick={onOpenArea}
                className="flex min-w-0 items-center justify-center gap-2 rounded-3xl border border-emerald-950/20 bg-white/30 px-4 text-sm font-black text-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.70)]"
              >
                <span className="text-2xl">📍</span>
                <span className="min-w-0 truncate">{locationLabel}</span>
              </button>
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
