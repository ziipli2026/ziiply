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
  const baseItemClass =
    "relative flex flex-col items-center justify-center rounded-[1.12rem] px-2 py-2.5 text-[11px] font-black tracking-[-0.015em] transition active:scale-[0.98]";

  const activeItemClass =
    "bg-[linear-gradient(180deg,#557a55_0%,#345a3b_100%)] text-[#fff8e8] shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_5px_12px_rgba(37,62,38,0.20)] ring-1 ring-[#28482f]";

  const passiveItemClass =
    "text-[#4f4638] hover:bg-[#efe7d7]/70 active:bg-[#eadfca]";

  const promptItemClass =
    "bg-[linear-gradient(180deg,#f8f1dc_0%,#ecdfbf_100%)] text-[#36553a] shadow-[inset_0_1px_0_rgba(255,255,255,0.68),0_0_16px_rgba(111,139,88,0.16)] ring-1 ring-[#d3c294]";

  const disabledItemClass = initialStoreSelectionLocked
    ? "cursor-not-allowed bg-[#fff3ee] text-[#c78472] opacity-80 ring-1 ring-[#efc5b7]"
    : "cursor-not-allowed bg-[#ebe5da] text-[#aaa090] opacity-70";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-transparent px-3 pb-[calc(env(safe-area-inset-bottom)+0.58rem)] pt-1.5 sm:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1.5 rounded-[1.55rem] border border-[#d7c6a5] bg-[linear-gradient(180deg,#fffaf1_0%,#f2eadb_55%,#e8dcc6_100%)] p-2 shadow-[0_10px_28px_rgba(78,58,28,0.16),inset_0_1px_0_rgba(255,255,255,0.82)]">
        <button
          type="button"
          onClick={onShopsClick}
          aria-disabled={false}
          className={`${baseItemClass} ${shopsPanelOpen ? activeItemClass : initialStoreNavPrompt ? promptItemClass : passiveItemClass}`}
        >
          <span className="text-[19px] leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]">🏪</span>
          <span className="mt-1 block">Kaupat</span>
        </button>

        <button
          type="button"
          onClick={onSearchClick}
          disabled={searchBottomNavDisabled && !searchPanelOpen}
          aria-disabled={searchBottomNavDisabled && !searchPanelOpen}
          className={`${baseItemClass} ${searchPanelOpen ? activeItemClass : searchBottomNavDisabled ? disabledItemClass : passiveItemClass}`}
        >
          <span
            key={searchReadyBounceKeyV320}
            className={`text-[19px] leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.55)] ${!searchBottomNavDisabled && storesReadyForSearch ? "ziiply-search-ready-bounce" : ""}`}
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
          className={`${baseItemClass} ${cartLength === 0 ? disabledItemClass : cartModalOpen ? activeItemClass : passiveItemClass}`}
        >
          <span className="text-[19px] leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]">🛒</span>
          <span className="mt-1 block">Kori</span>
          {cartLength > 0 && (
            <span className={`absolute right-2 top-1 flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-[10px] font-black shadow-[0_2px_6px_rgba(40,65,34,0.22)] ${cartModalOpen ? "border-[#fff8e8] bg-[#fff8e8] text-[#345a3b]" : "border-[#24482e] bg-[#2f7041] text-[#fff8e8]"}`}>
              {cartLength}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onCompareClick}
          disabled={cartLength === 0}
          aria-disabled={cartLength === 0}
          className={`${baseItemClass} ${cartLength === 0 ? disabledItemClass : activeResult === "compare" && !searchPanelOpen && !cartModalOpen ? activeItemClass : passiveItemClass}`}
        >
          <span className="text-[19px] leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.55)]">⚖️</span>
          <span className="mt-1 block">Vertailu</span>
        </button>
      </div>
    </nav>
  );
}
