"use client";

type ZiiplyLaunchScreenProps = {
  appVersion: string;
};

export function ZiiplyLaunchScreen({ appVersion }: ZiiplyLaunchScreenProps) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-white ziiply-soft-open">
      <div className="absolute right-5 top-[calc(env(safe-area-inset-top)+0.75rem)]">
        <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-green-700 ring-1 ring-green-100">
          {appVersion}
        </span>
      </div>
      <div className="mx-auto flex w-full max-w-[340px] flex-col items-center px-8 text-center">
        <img
          src="/ziiply.png"
          alt="Ziiply"
          className="h-auto w-full max-w-[280px] object-contain"
        />
      </div>
    </div>
  );
}

type ZiiplyBottomNavProps = {
  shopsPanelOpen: boolean;
  initialStoreNavPrompt: boolean;
  searchBottomNavDisabled: boolean;
  initialStoreSelectionLocked: boolean;
  searchPanelOpen: boolean;
  searchReadyBounceKeyV320: number;
  storesReadyForSearch: boolean;
  cartLength: number;
  cartModalOpen: boolean;
  activeResult: "none" | "compare" | string;
  onShopsClick: () => void;
  onSearchClick: () => void;
  onCartClick: () => void;
  onCompareClick: () => void;
};

export function ZiiplyBottomNav({
  shopsPanelOpen,
  initialStoreNavPrompt,
  searchBottomNavDisabled,
  initialStoreSelectionLocked,
  searchPanelOpen,
  searchReadyBounceKeyV320,
  storesReadyForSearch,
  cartLength,
  cartModalOpen,
  activeResult,
  onShopsClick,
  onSearchClick,
  onCartClick,
  onCompareClick,
}: ZiiplyBottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-transparent px-3 pb-[calc(env(safe-area-inset-bottom)+0.7rem)] pt-2 sm:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1.5 rounded-[1.7rem] border border-white/70 bg-white/86 p-2 shadow-[0_18px_55px_rgba(15,23,42,0.18)] backdrop-blur-2xl">
        <button
          type="button"
          onClick={onShopsClick}
          aria-disabled={false}
          className={`flex flex-col items-center justify-center rounded-[1.2rem] px-2 py-2.5 text-xs font-black transition ${shopsPanelOpen ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white active:scale-[0.98]" : initialStoreNavPrompt ? "bg-green-50/60 text-slate-700 ring-1 ring-green-100 shadow-[0_0_18px_rgba(34,197,94,0.10)] active:scale-[0.98]" : "text-slate-700 active:scale-[0.98] active:bg-slate-100"}`}
        >
          <span className="text-lg leading-none">🏪</span>
          <span className="mt-1 block">Kaupat</span>
        </button>

        <button
          type="button"
          onClick={onSearchClick}
          disabled={searchBottomNavDisabled}
          aria-disabled={searchBottomNavDisabled}
          className={`flex flex-col items-center justify-center rounded-[1.2rem] px-2 py-2.5 text-xs font-black transition ${searchBottomNavDisabled ? (initialStoreSelectionLocked ? "cursor-not-allowed bg-red-50 text-red-300 ring-1 ring-red-100 opacity-80" : "cursor-not-allowed bg-slate-100 text-slate-300 opacity-70") : searchPanelOpen ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white shadow-md active:scale-[0.98]" : "text-slate-700 active:scale-[0.98] active:bg-slate-100"}`}
        >
          <span
            key={searchReadyBounceKeyV320}
            className={`text-lg leading-none ${!searchBottomNavDisabled && storesReadyForSearch ? "ziiply-search-ready-bounce" : ""}`}
          >
            🔎
          </span>
          <span className="mt-1 block">Hae</span>
        </button>

        <button
          type="button"
          onClick={onCartClick}
          disabled={initialStoreSelectionLocked || cartLength === 0}
          aria-disabled={initialStoreSelectionLocked || cartLength === 0}
          className={`relative flex flex-col items-center justify-center rounded-[1.2rem] px-2 py-2.5 text-xs font-black transition ${cartLength === 0 ? (initialStoreSelectionLocked ? "cursor-not-allowed bg-red-50 text-red-300 ring-1 ring-red-100 opacity-80" : "cursor-not-allowed bg-slate-100 text-slate-300 opacity-70") : cartModalOpen ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white shadow-md active:scale-[0.98]" : "text-slate-700 active:scale-[0.98] active:bg-slate-100"}`}
        >
          <span className="text-lg leading-none">🛒</span>
          <span className="mt-1 block">Kori</span>
          {cartLength > 0 && (
            <span className={`absolute right-2 top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black ${cartModalOpen ? "bg-white text-green-700" : "bg-green-700 shadow-md ring-1 ring-black/10 text-white"}`}>
              {cartLength}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onCompareClick}
          disabled={initialStoreSelectionLocked || cartLength === 0}
          aria-disabled={initialStoreSelectionLocked || cartLength === 0}
          className={`flex flex-col items-center justify-center rounded-[1.2rem] px-2 py-2.5 text-xs font-black transition ${cartLength === 0 ? (initialStoreSelectionLocked ? "cursor-not-allowed bg-red-50 text-red-300 ring-1 ring-red-100 opacity-80" : "cursor-not-allowed bg-slate-100 text-slate-300 opacity-70") : activeResult === "compare" && !searchPanelOpen && !cartModalOpen ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white shadow-md active:scale-[0.98]" : "text-slate-700 active:scale-[0.98] active:bg-slate-100"}`}
        >
          <span className="text-lg leading-none">⚖️</span>
          <span className="mt-1 block">Vertailu</span>
        </button>
      </div>
    </nav>
  );
}

