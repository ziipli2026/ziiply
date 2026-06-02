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
  const baseButtonClass =
    "relative flex flex-col items-center justify-center rounded-[1.05rem] px-2 py-2 text-xs font-black tracking-[-0.01em] transition active:scale-[0.98]";

  const activeButtonClass =
    "bg-[#496f4b] text-[#fff8ea] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_4px_10px_rgba(39,58,36,0.22)] ring-1 ring-[#2f4d34]/35";

  const idleButtonClass =
    "text-[#4e4638] active:bg-[#e7deca]/70";

  const promptedButtonClass =
    "bg-[#edf3df]/72 text-[#36513a] ring-1 ring-[#9fb18f]/45 shadow-[0_0_16px_rgba(82,112,72,0.12)]";

  const disabledButtonClass = initialStoreSelectionLocked
    ? "cursor-not-allowed bg-[#fff0e7] text-[#c98a73] ring-1 ring-[#e5b49f]/70 opacity-85"
    : "cursor-not-allowed bg-[#e7e2d7]/70 text-[#9d978b] opacity-70";

  const badgeClass = cartModalOpen
    ? "bg-[#fff8ea] text-[#2f7041] ring-1 ring-[#2f7041]/25 shadow-[0_2px_5px_rgba(39,58,36,0.14)]"
    : "bg-[#2f7041] text-[#fff6e8] ring-1 ring-[#214f30]/30 shadow-[0_2px_5px_rgba(29,62,36,0.28)]";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-transparent px-3 pb-[calc(env(safe-area-inset-bottom)+0.62rem)] pt-2 sm:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1.5 rounded-[1.55rem] border border-[#9fb18f]/70 bg-[linear-gradient(180deg,#fbf7ef_0%,#f1ebde_100%)] p-1.5 shadow-[0_10px_28px_rgba(64,50,26,0.13)]">
        <button
          type="button"
          onClick={onShopsClick}
          aria-disabled={false}
          className={`${baseButtonClass} ${shopsPanelOpen ? activeButtonClass : initialStoreNavPrompt ? promptedButtonClass : idleButtonClass}`}
        >
          <span className="text-lg leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]">🏪</span>
          <span className="mt-1 block">Kaupat</span>
        </button>

        <button
          type="button"
          onClick={onSearchClick}
          disabled={searchBottomNavDisabled && !searchPanelOpen}
          aria-disabled={searchBottomNavDisabled && !searchPanelOpen}
          className={`${baseButtonClass} ${searchPanelOpen ? activeButtonClass : searchBottomNavDisabled ? disabledButtonClass : idleButtonClass}`}
        >
          <span
            key={searchReadyBounceKeyV320}
            className={`text-lg leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.55)] ${!searchBottomNavDisabled && storesReadyForSearch ? "ziiply-search-ready-bounce" : ""}`}
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
          className={`${baseButtonClass} ${cartLength === 0 ? disabledButtonClass : cartModalOpen ? activeButtonClass : idleButtonClass}`}
        >
          <span className="text-lg leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]">🛒</span>
          <span className="mt-1 block">Kori</span>
          {cartLength > 0 && (
            <span className={`absolute right-2 top-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-black ${badgeClass}`}>
              {cartLength}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onCompareClick}
          disabled={cartLength === 0}
          aria-disabled={cartLength === 0}
          className={`${baseButtonClass} ${cartLength === 0 ? disabledButtonClass : activeResult === "compare" && !searchPanelOpen && !cartModalOpen ? activeButtonClass : idleButtonClass}`}
        >
          <span className="text-lg leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]">⚖️</span>
          <span className="mt-1 block">Vertailu</span>
        </button>
      </div>
    </nav>
  );
}
