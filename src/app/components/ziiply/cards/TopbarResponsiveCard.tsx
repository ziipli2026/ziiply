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
  const mode = storeModeLabel || "Tavaratalot";
  return `${area} · ${mode}`;
}

function MobileInfoIcon({ item }: { item: TopBarInfoItem }) {
  return (
    <div className="flex min-w-0 flex-1 items-center justify-center border-r border-amber-900/20 px-1.5 last:border-r-0">
      <span className="text-[21px] leading-none">{item.emoji || "•"}</span>
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
  storeModeLabel = "Tavaratalot",
  logoImageSrc = "/ziiplylogo_mobile.png",
  infoItems,
  onOpenArea,
}: ZiiplyTopBarProps) {
  const items = infoItems && infoItems.length > 0 ? infoItems : fallbackInfoItems();
  const storeLabel = getStoreLabel(areaLabel, storeModeLabel);

  return (
    <div className="w-full">
      {/* Mobile: matala mockup-yläpalkki. Ei menu/info-nappeja, ei versiota, ei tekstilogoa. */}
      <div className="mx-auto block w-full max-w-[430px] px-3 md:hidden">
        <div className="relative overflow-hidden rounded-[1.45rem] border-[4px] border-emerald-950 bg-emerald-950 shadow-[0_14px_34px_rgba(15,23,42,0.16)]">
          <div className="relative rounded-[0.98rem] border border-amber-900/20 bg-[#fff7df] px-3 py-2.5">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-[radial-gradient(circle_at_7px_7px,rgba(180,122,35,0.22)_1.5px,transparent_2.5px)] bg-[length:10px_10px] opacity-65" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-amber-100/60 to-transparent" />

            <div className="relative grid h-[74px] grid-cols-[64px_minmax(0,1fr)_92px] items-stretch gap-2">
              <div className="flex items-center justify-center rounded-2xl border border-amber-900/15 bg-white/25 px-1.5">
                <img
                  src={logoImageSrc}
                  alt="Ziiply"
                  className="h-[50px] w-[50px] object-contain"
                />
              </div>

              <div className="flex min-w-0 overflow-hidden rounded-2xl border border-amber-900/20 bg-white/25">
                {items.slice(0, 4).map((item) => (
                  <MobileInfoIcon key={item.id} item={item} />
                ))}
              </div>

              <button
                type="button"
                onClick={onOpenArea}
                className="flex min-w-0 items-center justify-center gap-1 rounded-2xl border border-emerald-950/20 bg-white/30 px-1.5 text-[11px] font-black text-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.70)] active:scale-[0.99]"
              >
                <span className="shrink-0 text-base">📍</span>
                <span className="min-w-0 truncate">{storeLabel}</span>
              </button>
            </div>
          </div>

          <div className="h-4 bg-emerald-950" />
        </div>
      </div>

      {/* Desktop / tablet: leveä vaakapalkki */}
      <div className="mx-auto hidden w-full max-w-[1180px] px-4 md:block">
        <div className="relative overflow-hidden rounded-[1.6rem] border-[7px] border-emerald-950 bg-emerald-950 shadow-[0_20px_50px_rgba(15,23,42,0.22)]">
          <div className="relative rounded-[1.08rem] border border-amber-900/20 bg-[#fff7df] px-5 py-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-36 bg-[radial-gradient(circle_at_10px_10px,rgba(180,122,35,0.26)_2px,transparent_3px)] bg-[length:14px_14px] opacity-65" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-72 bg-gradient-to-l from-amber-100/60 to-transparent" />

            <div className="relative grid grid-cols-[132px_1fr_190px] items-stretch gap-4">
              <div className="flex items-center justify-center rounded-3xl border border-amber-900/15 bg-white/25 px-3">
                <img
                  src={logoImageSrc}
                  alt="Ziiply"
                  className="h-[92px] w-[92px] object-contain"
                />
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
                <span className="min-w-0 truncate">{storeLabel}</span>
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
