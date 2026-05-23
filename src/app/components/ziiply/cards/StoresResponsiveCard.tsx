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

export function StoresResponsiveCard({
  stores,
  title = "Kaupat",
  subtitle = "Valitse lähikaupat vertailuun",
  onSelectStore,
  onUseGps,
  onManualArea,
}: StoresResponsiveCardProps) {
  const shown = stores.length
    ? stores
    : [
        { id: "1", name: "Prisma Sello", chain: "S", distance: "1,4 km", badge: "Lähin", selected: true },
        { id: "2", name: "K-Citymarket Sello", chain: "K", distance: "1,6 km", badge: "Vertailuun" },
        { id: "3", name: "Lidl Leppävaara", chain: "Lidl", distance: "1,9 km", badge: "Edullinen" },
      ];

  return (
    <section className="overflow-hidden rounded-[28px] border border-emerald-500/20 bg-gradient-to-br from-black via-zinc-950 to-black text-white shadow-[0_0_50px_rgba(16,185,129,0.18)] lg:rounded-[40px]">
      <div className="relative p-4 lg:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_45%)]" />

        <div className="relative grid gap-4 lg:grid-cols-[260px_1fr] lg:items-center">
          <div className="flex items-center gap-3 lg:block">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-emerald-500/10 text-5xl ring-1 ring-emerald-500/20 lg:h-64 lg:w-full lg:text-[150px]">
              🏪
            </div>

            <div className="lg:hidden">
              <div className="text-sm font-black italic text-emerald-400">Valitse</div>
              <h2 className="text-4xl font-black uppercase leading-none">{title}</h2>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-400/70">
                Lähikauppojen kartta
              </p>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="text-xl font-black italic text-emerald-400">Valitse</div>
            <h2 className="text-7xl font-black uppercase leading-none">{title}</h2>
            <p className="mt-3 text-sm font-black uppercase tracking-[0.22em] text-emerald-400/75">
              {subtitle}
            </p>
            <blockquote className="mt-6 max-w-xl rounded-3xl bg-white/[0.04] p-5 text-2xl font-semibold text-zinc-200 ring-1 ring-white/10">
              “Hyvä vertailu alkaa oikeista kaupoista.”
            </blockquote>
          </div>
        </div>

        <div className="relative mt-4 rounded-[30px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur lg:mt-8 lg:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-lg font-black lg:text-3xl">{shown.length} kauppaa löytyi</div>
              <div className="mt-1 text-sm font-semibold text-zinc-300 lg:text-lg">
                GPS tai käsin valittu alue
              </div>
            </div>

            <button
              type="button"
              onClick={onUseGps}
              className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-black shadow-xl shadow-emerald-500/20 lg:text-base"
            >
              📍 GPS
            </button>
          </div>

          <div className="mt-5 space-y-2 lg:space-y-3">
            {shown.map((store) => (
              <article
                key={store.id}
                className={`rounded-3xl border p-3 transition-all active:scale-[0.99] lg:p-5 ${
                  store.selected
                    ? "border-emerald-400/30 bg-emerald-500/10 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
                    : "border-white/10 bg-black/35"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl lg:h-16 lg:w-16 lg:text-4xl ${
                      store.selected ? "bg-emerald-500 text-black" : "bg-white/10"
                    }`}
                  >
                    {store.chain === "K" ? "🟠" : store.chain === "S" ? "🟢" : "🏬"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-black lg:text-xl">{store.name}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold text-zinc-400 lg:text-sm">
                      {store.chain && <span>{store.chain}-kauppa</span>}
                      {store.distance && <span>• {store.distance}</span>}
                      {store.address && <span>• {store.address}</span>}
                    </div>
                  </div>

                  {store.badge && (
                    <div className="rounded-full bg-emerald-500/20 px-3 py-2 text-xs font-black text-emerald-300">
                      {store.badge}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onSelectStore?.(store.id)}
                  className={`mt-4 min-h-[50px] w-full rounded-2xl px-4 text-sm font-black lg:text-lg ${
                    store.selected ? "bg-emerald-500 text-black" : "bg-white/10 text-white ring-1 ring-white/10"
                  }`}
                >
                  {store.selected ? "✓ Valittu" : "Valitse kauppa"}
                </button>
              </article>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onManualArea}
              className="min-h-[58px] rounded-3xl bg-white/10 px-4 text-sm font-black text-white ring-1 ring-white/10 lg:text-xl"
            >
              ✍️ Alue
            </button>
            <button
              type="button"
              onClick={onUseGps}
              className="min-h-[58px] rounded-3xl bg-emerald-500 px-4 text-sm font-black text-black shadow-xl shadow-emerald-500/25 lg:text-xl"
            >
              📍 Käytä sijaintia
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

