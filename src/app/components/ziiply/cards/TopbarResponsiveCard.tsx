import React from "react";

export type TopBarInfoItem = {
  id: string;
  label: string;
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

/**
 * Desktop:
 * - persistent topbar is visible and acts as app frame anchor.
 *
 * Mobile:
 * - full topbar is hidden to save vertical space.
 * - same information is shown as compact chips under/near the app header.
 */
export function ZiiplyTopBar({
  appVersion = "V320",
  areaLabel = "Hyvinkää",
  storeModeLabel = "Lähikaupat",
  logoText = "Ziiply",
  logoImageSrc,
  infoItems = [],
  onOpenArea,
  onOpenInfo,
  onOpenMenu,
}: ZiiplyTopBarProps) {
  return (
    <>
      <header className="hidden border-b border-zinc-950/10 bg-gradient-to-r from-zinc-100 via-white to-emerald-50 px-6 py-4 shadow-sm lg:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onOpenMenu}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl font-black text-zinc-900 shadow-sm ring-1 ring-zinc-950/10 active:scale-95"
              aria-label="Avaa valikko"
            >
              ☰
            </button>

            <div className="flex items-center gap-3 rounded-3xl bg-white px-4 py-3 shadow-sm ring-1 ring-zinc-950/10">
              {logoImageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoImageSrc}
                  alt={logoText}
                  className="h-10 w-auto"
                />
              ) : (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-2xl">
                    🛍️
                  </div>
                  <div className="text-3xl font-black italic text-emerald-700">
                    {logoText}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
            {infoItems.slice(0, 4).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={onOpenInfo}
                className="min-h-[42px] rounded-full bg-white px-4 text-sm font-black text-zinc-800 shadow-sm ring-1 ring-zinc-950/10"
              >
                {item.emoji && <span className="mr-1">{item.emoji}</span>}
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-500/20">
              {appVersion}
            </div>

            <button
              type="button"
              onClick={onOpenArea}
              className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-500/20"
            >
              📍 {areaLabel} · {storeModeLabel}
            </button>
          </div>
        </div>
      </header>

      <div className="lg:hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3">
          <button
            type="button"
            onClick={onOpenMenu}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl font-black text-zinc-900 shadow-sm ring-1 ring-zinc-950/10"
            aria-label="Avaa valikko"
          >
            ☰
          </button>

          <button
            type="button"
            onClick={onOpenArea}
            className="min-w-0 flex-1 truncate rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800 ring-1 ring-emerald-500/20"
          >
            📍 {areaLabel} · {storeModeLabel}
          </button>

          <button
            type="button"
            onClick={onOpenInfo}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-xl font-black text-zinc-900 shadow-sm ring-1 ring-zinc-950/10"
            aria-label="Avaa info"
          >
            ⓘ
          </button>
        </div>

        {infoItems.length > 0 && (
          <div className="scrollbar-none flex gap-2 overflow-x-auto px-4 pb-3">
            {infoItems
              .filter((item) => !item.hiddenOnMobile)
              .slice(0, 3)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={onOpenInfo}
                  className="shrink-0 rounded-full bg-white/90 px-3 py-2 text-xs font-black text-zinc-800 shadow-sm ring-1 ring-zinc-950/10"
                >
                  {item.emoji && <span className="mr-1">{item.emoji}</span>}
                  {item.label}
                </button>
              ))}
          </div>
        )}
      </div>
    </>
  );
}

export function ExampleTopBarUsage() {
  return (
    <ZiiplyTopBar
      appVersion="V320"
      areaLabel="Hyvinkää"
      storeModeLabel="Lähikaupat"
      infoItems={[
        { id: "electricity", emoji: "⚡", label: "0,3–17,4" },
        { id: "weather", emoji: "🌦", label: "+12°" },
        { id: "calendar", emoji: "📅", label: "2 menoa" },
        { id: "fuel", emoji: "⛽", label: "1,72–1,89", hiddenOnMobile: true },
      ]}
    />
  );
}
