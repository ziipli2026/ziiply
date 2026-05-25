import React from "react";

export type SearchQuickAction = {
  id: string;
  label: string;
  emoji?: string;
};

export type SearchResponsiveCardProps = {
  query?: string;
  title?: string;
  subtitle?: string;
  quickActions?: SearchQuickAction[];
  onQueryChange?: (value: string) => void;
  onSearch?: () => void;
  onScan?: () => void;
  onQuickAction?: (id: string) => void;

  /** Optional drawer controls. These keep the bottom cards inside this search card. */
  resultsOpen?: boolean;
  compareOpen?: boolean;
  onToggleResults?: () => void;
  onToggleCompare?: () => void;
  resultsTitle?: string;
  compareTitle?: string;
  resultsPanel?: React.ReactNode;
  comparePanel?: React.ReactNode;
  resultsCount?: number;
  compareCount?: number;
};

export function SearchResponsiveCard({
  query = "",
  title = "Hae",
  subtitle = "Etsi tuote, EAN tai reseptin raaka-aine",
  quickActions = [
    { id: "milk", label: "Maito", emoji: "🥛" },
    { id: "coffee", label: "Kahvi", emoji: "☕" },
    { id: "meat", label: "Jauheliha", emoji: "🥩" },
    { id: "bread", label: "Leipä", emoji: "🍞" },
  ],
  onQueryChange,
  onSearch,
  onScan,
  onQuickAction,
  resultsOpen = false,
  compareOpen = false,
  onToggleResults,
  onToggleCompare,
  resultsTitle = "Hakutulokset",
  compareTitle = "Vertailu",
  resultsPanel,
  comparePanel,
  resultsCount,
  compareCount,
}: SearchResponsiveCardProps) {
  const expandedPanelOpen = resultsOpen || compareOpen;

  return (
    <section className="relative overflow-visible rounded-[28px] border border-amber-900/15 bg-gradient-to-br from-stone-100 via-amber-50 to-emerald-50 text-zinc-950 shadow-2xl shadow-amber-900/10 lg:rounded-[40px]">
      <div className="relative overflow-visible p-4 pb-[118px] lg:p-8 lg:pb-[138px]">
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top_left,rgba(180,83,9,0.12),transparent_40%)]" />

        <div className="relative z-10 grid gap-4 lg:grid-cols-[260px_1fr] lg:items-center">
          <div className="flex items-center gap-3 lg:block">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-white text-5xl shadow-xl shadow-amber-900/10 lg:h-64 lg:w-full lg:text-[150px]">
              🔍
            </div>

            <div className="lg:hidden">
              <div className="text-sm font-black italic text-emerald-800">Etsi</div>
              <h2 className="text-4xl font-black uppercase leading-none">{title}</h2>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-zinc-600">
                50-luvun hakukone
              </p>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="text-xl font-black italic text-emerald-800">Etsi</div>
            <h2 className="text-7xl font-black uppercase leading-none">{title}</h2>
            <p className="mt-3 text-sm font-black uppercase tracking-[0.22em] text-zinc-600">
              {subtitle}
            </p>
            <blockquote className="mt-6 max-w-xl rounded-3xl bg-white/75 p-5 text-2xl font-bold text-zinc-700 shadow-sm">
              “Kirjoita tuote, niin etsitään sopivat vaihtoehdot.”
            </blockquote>
          </div>
        </div>

        <div className="relative z-20 mt-4 rounded-[30px] border border-amber-900/10 bg-white/80 p-4 shadow-lg shadow-amber-900/10 backdrop-blur lg:mt-8 lg:p-6">
          <label className="text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
            Tuotehaku
          </label>

          <div className="mt-2 flex gap-2">
            <input
              value={query}
              onChange={(event) => onQueryChange?.(event.target.value)}
              placeholder="Kirjoita esim. maito, kahvi tai 641..."
              className="min-h-[58px] min-w-0 flex-1 rounded-3xl border border-zinc-950/10 bg-white px-4 text-base font-bold text-zinc-950 outline-none placeholder:text-zinc-400 focus:ring-4 focus:ring-emerald-600/15 lg:text-xl"
            />

            <button
              type="button"
              onClick={onScan}
              className="relative z-10 flex min-h-[58px] w-[58px] shrink-0 items-center justify-center rounded-3xl bg-zinc-950 text-2xl text-white lg:w-[72px]"
              aria-label="Avaa skanneri"
            >
              ▦
            </button>
          </div>

          <button
            type="button"
            onClick={onSearch}
            className="mt-3 min-h-[58px] w-full rounded-3xl bg-emerald-700 px-4 text-lg font-black text-white shadow-lg shadow-emerald-800/20 lg:min-h-[68px] lg:text-2xl"
          >
            Hae tuotteita
          </button>

          <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
            {quickActions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => onQuickAction?.(action.id)}
                className="rounded-3xl border border-zinc-950/10 bg-white px-3 py-3 text-left shadow-sm active:scale-[0.99] lg:p-4"
              >
                <div className="text-2xl lg:text-4xl">{action.emoji || "🛒"}</div>
                <div className="mt-1 text-sm font-black uppercase lg:text-lg">{action.label}</div>
              </button>
            ))}
          </div>

          <div className="mt-5 text-center text-sm font-semibold italic text-emerald-800/80 lg:text-base">
            “Hyvä haku säästää monta hyllyväliä.”
          </div>
        </div>

        {/* Bottom cards stay anchored at the bottom of the search card. */}
        <div className="absolute inset-x-4 bottom-4 z-30 grid grid-cols-2 gap-3 lg:inset-x-8 lg:bottom-8 lg:gap-5">
          <button
            type="button"
            onClick={onToggleResults}
            className="min-h-[78px] rounded-[28px] border-[3px] border-[#5b482c] bg-[#f4e7c7] px-4 text-left shadow-[0_0_0_2px_#d4b978_inset,0_10px_20px_rgba(60,45,20,0.20)] transition active:scale-[0.99]"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#6c624b]">
              {resultsCount != null ? `${resultsCount} osumaa` : "Selaa"}
            </div>
            <div className="mt-1 text-[22px] font-black italic leading-none text-[#28402a] lg:text-[28px]">
              {resultsTitle}
            </div>
          </button>

          <button
            type="button"
            onClick={onToggleCompare}
            className="min-h-[78px] rounded-[28px] border-[3px] border-[#5b482c] bg-[#f4e7c7] px-4 text-left shadow-[0_0_0_2px_#d4b978_inset,0_10px_20px_rgba(60,45,20,0.20)] transition active:scale-[0.99]"
          >
            <div className="text-[11px] font-black uppercase tracking-[0.24em] text-[#6c624b]">
              {compareCount != null ? `${compareCount} vertailussa` : "Avaa"}
            </div>
            <div className="mt-1 text-[22px] font-black italic leading-none text-[#28402a] lg:text-[28px]">
              {compareTitle}
            </div>
          </button>
        </div>

        {/* Drawers open upward from the bottom cards. They sit above the scanner button. */}
        {expandedPanelOpen && (
          <div className="absolute inset-x-4 bottom-[108px] z-50 lg:inset-x-8 lg:bottom-[126px]">
            {resultsOpen && (
              <div className="h-[min(620px,calc(100dvh-260px))] overflow-hidden rounded-[34px] border-[4px] border-[#5b482c] bg-[#f4e7c7] shadow-[0_0_0_2px_#d4b978_inset,0_22px_44px_rgba(60,45,20,0.34)]">
                <div className="h-full overflow-y-auto p-4 lg:p-6">
                  {resultsPanel || (
                    <div className="flex h-full items-center justify-center text-center text-lg font-black text-[#66583d]">
                      Hakutulokset avautuvat tähän.
                    </div>
                  )}
                </div>
              </div>
            )}

            {compareOpen && (
              <div className="h-[min(620px,calc(100dvh-260px))] overflow-hidden rounded-[34px] border-[4px] border-[#5b482c] bg-[#f4e7c7] shadow-[0_0_0_2px_#d4b978_inset,0_22px_44px_rgba(60,45,20,0.34)]">
                <div className="h-full overflow-y-auto p-4 lg:p-6">
                  {comparePanel || (
                    <div className="flex h-full items-center justify-center text-center text-lg font-black text-[#66583d]">
                      Vertailu avautuu tähän koko hakuruudun levyisenä.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
