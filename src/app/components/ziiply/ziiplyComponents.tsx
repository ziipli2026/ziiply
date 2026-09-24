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


function ZiiplyNavIcon({
  type,
  active = false,
  disabled = false,
  className = "",
}: {
  type: "shops" | "search" | "cart" | "compare";
  active?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const ink = active ? "#fff8ea" : disabled ? "#9d978b" : "#384538";
  const accent = active ? "#f3d790" : disabled ? "#b9b1a2" : "#2f7041";
  const brass = active ? "#ffe5a8" : disabled ? "#c7bca9" : "#b88b42";
  const muted = active ? "rgba(255,248,234,0.36)" : disabled ? "#e4ded3" : "#f6edd8";

  if (type === "shops") {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
        <path d="M9 21h30v18H9V21Z" fill={muted} stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M12 15h24l4 6H8l4-6Z" fill={brass} stroke={ink} strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M14 39V27h8v12M27 27h7v7h-7z" fill={active ? "rgba(255,248,234,0.18)" : "#fff8ea"} stroke={ink} strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx="36" cy="13" r="6" fill={active ? "#fff8ea" : accent} stroke={ink} strokeWidth="2" />
        <path d="M36 10v6M33 13h6" stroke={active ? accent : "#fff8ea"} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "search") {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
        <circle cx="21" cy="20" r="11" fill={active ? "rgba(255,248,234,0.22)" : "#fff8ea"} stroke={ink} strokeWidth="3" />
        <path d="M29.5 28.5 40 39" stroke={ink} strokeWidth="4" strokeLinecap="round" />
        <path d="M15 20a6 6 0 0 1 6-6" stroke={active ? "#fff8ea" : "#b8c3bd"} strokeWidth="2" strokeLinecap="round" />
        <path d="M35.5 34.5 32 38" stroke={brass} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  if (type === "cart") {
    return (
      <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
        <path d="M9 11h4l4 21h19l4-14H17" fill="none" stroke={ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M18 22h20M20 27h15" stroke={active ? "#fff8ea" : "#b8a884"} strokeWidth="2" strokeLinecap="round" />
        <circle cx="21" cy="38" r="3.6" fill={brass} stroke={ink} strokeWidth="2" />
        <circle cx="34" cy="38" r="3.6" fill={brass} stroke={ink} strokeWidth="2" />
        <path d="M20 15h18" stroke={accent} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d="M24 8v30M15 38h18" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M12 17h24" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <path d="M15 17 9 30h12L15 17ZM33 17l-6 13h12L33 17Z" fill={active ? "rgba(255,248,234,0.22)" : "#fff8ea"} stroke={ink} strokeWidth="2.3" strokeLinejoin="round" />
      <path d="M20 11h8" stroke={brass} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="24" cy="17" r="2.5" fill={accent} stroke={ink} strokeWidth="1.6" />
    </svg>
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
  const buttonShellClass =
    "relative flex min-w-0 items-center justify-center rounded-[1.25rem] px-1 py-1 text-xs font-black tracking-[-0.01em] transition active:scale-[0.985]";

  // V4: aktiivinen tila ei enää väritä koko tabia, vaan icon+teksti saavat oman
  // pienemmän emalttimerkin. Näin palkki pysyy paperipaneelina eikä muutu raskaaksi vihreäksi blokiksi.
  const innerBaseClass =
    "relative flex min-h-[58px] w-full max-w-[86px] flex-col items-center justify-center rounded-[1.05rem] px-2 py-1.5 transition";

  const activeInnerClass =
    "bg-[linear-gradient(180deg,#5f875e_0%,#466b49_100%)] text-[#fff8ea] shadow-[inset_0_2px_0_rgba(255,255,255,0.20),inset_0_-2px_0_rgba(20,42,24,0.18),0_4px_10px_rgba(42,58,34,0.20)] ring-1 ring-[#2f4d34]/40";

  const idleInnerClass =
    "text-[#4e4638] active:bg-[#e7deca]/64";

  const promptedInnerClass =
    "bg-[#edf3df]/78 text-[#36513a] shadow-[inset_0_1px_0_rgba(255,255,255,0.70),0_0_13px_rgba(82,112,72,0.12)] ring-1 ring-[#9fb18f]/45";

  const disabledInnerClass = initialStoreSelectionLocked
    ? "cursor-not-allowed bg-[#fff0e7] text-[#c98a73] ring-1 ring-[#e5b49f]/70 opacity-85"
    : "cursor-not-allowed bg-[#e7e2d7]/62 text-[#9d978b] opacity-70";

  const badgeClass = cartModalOpen
    ? "bg-[#fff8ea] text-[#2f7041] ring-1 ring-[#2f7041]/25 shadow-[0_2px_5px_rgba(39,58,36,0.14)]"
    : "bg-[#2f7041] text-[#fff6e8] ring-1 ring-[#214f30]/30 shadow-[0_2px_5px_rgba(29,62,36,0.28)]";

  const shopsActive = shopsPanelOpen;
  const searchActive = searchPanelOpen;
  const cartActive = cartModalOpen && cartLength > 0;
  const compareActive = activeResult === "compare" && !searchPanelOpen && !cartModalOpen && cartLength > 0;
  const searchDisabled = searchBottomNavDisabled && !searchPanelOpen;
  const cartDisabled = cartLength === 0;
  const compareDisabled = cartLength === 0;
  const iconClass = "h-[30px] w-[30px] drop-shadow-[0_1px_0_rgba(255,255,255,0.45)]";
  const labelClass = "mt-0.5 block leading-none";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-transparent px-3 pb-[calc(env(safe-area-inset-bottom)+0.58rem)] pt-2 sm:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1 rounded-[1.55rem] border border-[#8f7a55]/35 bg-[linear-gradient(180deg,#fbf7ef_0%,#efe7d7_100%)] p-[5px] shadow-[inset_0_1px_0_rgba(255,255,255,0.86),0_9px_24px_rgba(64,50,26,0.13)] ring-1 ring-[#d7ccb5]/55">
        <button
          type="button"
          onClick={onShopsClick}
          aria-disabled={false}
          className={buttonShellClass}
        >
          <span className={`${innerBaseClass} ${shopsActive ? activeInnerClass : initialStoreNavPrompt ? promptedInnerClass : idleInnerClass}`}>
            <ZiiplyNavIcon type="shops" active={shopsActive} className={iconClass} />
            <span className={labelClass}>Kaupat</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onSearchClick}
          disabled={searchDisabled}
          aria-disabled={searchDisabled}
          className={buttonShellClass}
        >
          <span className={`${innerBaseClass} ${searchActive ? activeInnerClass : searchDisabled ? disabledInnerClass : idleInnerClass}`}>
            <span
              key={searchReadyBounceKeyV320}
              className={!searchDisabled && storesReadyForSearch ? "ziiply-search-ready-bounce" : undefined}
            >
              <ZiiplyNavIcon type="search" active={searchActive} disabled={searchDisabled} className={iconClass} />
            </span>
            <span className={labelClass}>Hae</span>
          </span>
        </button>

        <button
          type="button"
          onClick={onCartClick}
          disabled={cartDisabled}
          aria-disabled={cartDisabled}
          className={buttonShellClass}
        >
          <span className={`${innerBaseClass} ${cartDisabled ? disabledInnerClass : cartActive ? activeInnerClass : idleInnerClass}`}>
            <ZiiplyNavIcon type="cart" active={cartActive} disabled={cartDisabled} className={iconClass} />
            <span className={labelClass}>Kori</span>
            {cartLength > 0 && (
              <span className={`absolute right-[7px] top-[5px] flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-black leading-none ${badgeClass}`}>
                {cartLength}
              </span>
            )}
          </span>
        </button>

        <button
          type="button"
          onClick={onCompareClick}
          disabled={compareDisabled}
          aria-disabled={compareDisabled}
          className={buttonShellClass}
        >
          <span className={`${innerBaseClass} ${compareDisabled ? disabledInnerClass : compareActive ? activeInnerClass : idleInnerClass}`}>
            <ZiiplyNavIcon type="compare" active={compareActive} disabled={compareDisabled} className={iconClass} />
            <span className={labelClass}>Vertailu</span>
          </span>
        </button>
      </div>
    </nav>
  );
}
