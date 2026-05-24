"use client";

type ZiiplyLaunchScreenProps = {
  appVersion: string;
};

export function ZiiplyLaunchScreen({ appVersion: _appVersion }: ZiiplyLaunchScreenProps) {
  return (
    <div className="fixed inset-0 z-[2147483646] flex items-start justify-center bg-[#EAF4F1] px-7 pt-[18dvh] ziiply-launch-root">
      <div className="mx-auto flex w-full max-w-[360px] flex-col items-center text-center">
        <div className="relative flex w-full max-w-[300px] items-center justify-center">
          <div className="pointer-events-none absolute h-28 w-28 rounded-full bg-green-400/18 blur-2xl ziiply-launch-halo" />

          <img
            src="/ziiply.png"
            alt="Ziiply"
            className="relative h-auto w-full max-w-[238px] object-contain ziiply-launch-logo"
          />
        </div>

        <div className="ziiply-launch-copy mt-7 max-w-[21.5rem] text-center">
          <p className="text-[1.22rem] font-black leading-[1.05] tracking-[-0.045em] text-slate-950">
            Viilaa ruokakorisi halvemmaks.
          </p>

          <p className="mx-auto mt-3 max-w-[19rem] text-[0.94rem] font-semibold leading-snug tracking-[-0.015em] text-slate-500">
            Gösta ja Justiina auttavat arjen valinnoissa.
          </p>
        </div>

        <style>{`
          .ziiply-launch-root {
            animation: ziiplyLaunchRoot 220ms ease-out both;
          }

          .ziiply-launch-logo {
            animation: ziiplyLaunchLogo 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
            will-change: transform, opacity;
          }

          .ziiply-launch-halo {
            animation: ziiplyLaunchHalo 1100ms ease-out both;
            will-change: transform, opacity;
          }

          .ziiply-launch-copy {
            animation: ziiplyLaunchCopy 720ms cubic-bezier(0.22, 1, 0.36, 1) 160ms both;
            will-change: transform, opacity;
          }

          @keyframes ziiplyLaunchRoot {
            0% {
              opacity: 0;
            }

            100% {
              opacity: 1;
            }
          }

          @keyframes ziiplyLaunchLogo {
            0% {
              opacity: 0;
              transform: translateY(14px) scale(0.96);
            }

            70% {
              opacity: 1;
              transform: translateY(-2px) scale(1.01);
            }

            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes ziiplyLaunchHalo {
            0% {
              opacity: 0;
              transform: scale(0.72);
            }

            35% {
              opacity: 1;
              transform: scale(1);
            }

            100% {
              opacity: 0;
              transform: scale(1.55);
            }
          }

          @keyframes ziiplyLaunchCopy {
            0% {
              opacity: 0;
              transform: translateY(12px);
            }

            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .ziiply-launch-root,
            .ziiply-launch-logo,
            .ziiply-launch-halo,
            .ziiply-launch-copy {
              animation: none !important;
            }
          }
        `}</style>
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
          disabled={searchBottomNavDisabled && !searchPanelOpen}
          aria-disabled={searchBottomNavDisabled && !searchPanelOpen}
          className={`flex flex-col items-center justify-center rounded-[1.2rem] px-2 py-2.5 text-xs font-black transition ${searchPanelOpen ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white active:scale-[0.98]" : searchBottomNavDisabled ? (initialStoreSelectionLocked ? "cursor-not-allowed bg-red-50 text-red-300 ring-1 ring-red-100 opacity-80" : "cursor-not-allowed bg-slate-100 text-slate-300 opacity-70") : "text-slate-700 active:scale-[0.98] active:bg-slate-100"}`}
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
          disabled={cartLength === 0}
          aria-disabled={cartLength === 0}
          className={`relative flex flex-col items-center justify-center rounded-[1.2rem] px-2 py-2.5 text-xs font-black transition ${cartLength === 0 ? (initialStoreSelectionLocked ? "cursor-not-allowed bg-red-50 text-red-300 ring-1 ring-red-100 opacity-80" : "cursor-not-allowed bg-slate-100 text-slate-300 opacity-70") : cartModalOpen ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white active:scale-[0.98]" : "text-slate-700 active:scale-[0.98] active:bg-slate-100"}`}
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
          disabled={cartLength === 0}
          aria-disabled={cartLength === 0}
          className={`flex flex-col items-center justify-center rounded-[1.2rem] px-2 py-2.5 text-xs font-black transition ${cartLength === 0 ? (initialStoreSelectionLocked ? "cursor-not-allowed bg-red-50 text-red-300 ring-1 ring-red-100 opacity-80" : "cursor-not-allowed bg-slate-100 text-slate-300 opacity-70") : activeResult === "compare" && !searchPanelOpen && !cartModalOpen ? "bg-green-700 shadow-md ring-1 ring-black/10 text-white shadow-md active:scale-[0.98]" : "text-slate-700 active:scale-[0.98] active:bg-slate-100"}`}
        >
          <span className="text-lg leading-none">⚖️</span>
          <span className="mt-1 block">Vertailu</span>
        </button>
      </div>
    </nav>
  );
}

