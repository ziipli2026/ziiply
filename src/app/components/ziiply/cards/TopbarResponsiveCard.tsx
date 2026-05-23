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

function TopbarInfoTile({
  item,
  compact = false,
}: {
  item: TopBarInfoItem;
  compact?: boolean;
}) {
  return (
    <div
      className={[
        "min-w-0 border-amber-900/20 bg-white/20",
        compact
          ? "rounded-2xl border px-2 py-2"
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
  logoImageSrc = "/ziiply.png",
  infoItems,
  onOpenInfo,
  onOpenMenu,
}: ZiiplyTopBarProps) {
  const items = infoItems && infoItems.length > 0 ? infoItems : fallbackInfoItems();

  return (
    <div className="w-full">
      {/* Mobile: mockupin mukainen yläpalkki, ilman versiota/sijaintipilleriä/Ziiply-tekstiä */}
      <div className="mx-auto block w-full max-w-[430px] px-3 md:hidden">
        <div className="relative overflow-hidden rounded-[1.65rem] border-[4px] border-emerald-950 bg-emerald-950 shadow-[0_18px_42px_rgba(15,23,42,0.18)]">
          <div className="relative rounded-[1.15rem] border border-amber-900/20 bg-[#fff7df] px-3 py-3">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-[radial-gradient(circle_at_7px_7px,rgba(180,122,35,0.22)_1.5px,transparent_2.5px)] bg-[length:10px_10px] opacity-65" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-amber-100/60 to-transparent" />

            <div className="relative grid grid-cols-[auto_1fr_auto] items-stretch gap-2">
              <button
                type="button"
                onClick={onOpenMenu}
                aria-label="Avaa valikko"
                className="flex h-full min-h-[104px] w-14 items-center justify-center rounded-2xl border border-emerald-950/15 bg-white/55 text-xl font-black text-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] active:scale-95"
              >
                ☰
              </button>

              <div className="min-w-0">
                <div className="grid grid-cols-[86px_1fr] gap-2">
                  <div className="flex h-full min-h-[104px] items-center justify-center rounded-2xl border border-amber-900/15 bg-white/35 px-2">
                    <img
                      src={logoImageSrc}
                      alt="Ziiply"
                      className="h-[74px] w-[74px] object-contain"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {items.slice(0, 4).map((item) => (
                      <TopbarInfoTile key={item.id} item={item} compact />
                    ))}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onOpenInfo}
                aria-label="Lisätiedot"
                className="flex h-full min-h-[104px] w-14 items-center justify-center rounded-2xl border border-emerald-950/15 bg-white/55 text-xl font-black text-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] active:scale-95"
              >
                ⓘ
              </button>
            </div>
          </div>

          <div className="h-5 bg-emerald-950" />
        </div>
      </div>

      {/* Desktop / tablet: mockupin leveä vaakapalkki, punaisen alueen tila infokorteille */}
      <div className="mx-auto hidden w-full max-w-[1180px] px-4 md:block">
        <div className="relative overflow-hidden rounded-[1.6rem] border-[7px] border-emerald-950 bg-emerald-950 shadow-[0_20px_50px_rgba(15,23,42,0.22)]">
          <div className="relative rounded-[1.08rem] border border-amber-900/20 bg-[#fff7df] px-5 py-4">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-36 bg-[radial-gradient(circle_at_10px_10px,rgba(180,122,35,0.26)_2px,transparent_3px)] bg-[length:14px_14px] opacity-65" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-72 bg-gradient-to-l from-amber-100/60 to-transparent" />

            <div className="relative grid grid-cols-[132px_1fr_auto] items-stretch gap-4">
              <div className="flex items-center justify-center rounded-3xl border border-amber-900/15 bg-white/25 px-3">
                <img
                  src={logoImageSrc}
                  alt="Ziiply"
                  className="h-[92px] w-[92px] object-contain"
                />
              </div>

              <div className="grid grid-cols-4 overflow-hidden rounded-3xl border border-amber-900/20 bg-white/25">
                {items.slice(0, 4).map((item) => (
                  <TopbarInfoTile key={item.id} item={item} />
                ))}
              </div>

              <button
                type="button"
                onClick={onOpenInfo}
                aria-label="Lisätiedot"
                className="flex w-16 items-center justify-center rounded-3xl border border-emerald-950/15 bg-white/35 text-2xl font-black text-emerald-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
              >
                ⓘ
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
