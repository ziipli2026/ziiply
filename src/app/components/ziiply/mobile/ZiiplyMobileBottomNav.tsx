"use client";

import React from "react";

export type ZiiplyMobileBottomNavProps = {
  shopsPanelOpen: boolean;
  initialStoreNavPrompt: boolean;
  searchBottomNavDisabled: boolean;
  initialStoreSelectionLocked: boolean;
  searchPanelOpen: boolean;
  searchReadyBounceKeyV320: number;
  storesReadyForSearch: boolean;
  cartLength: number;
  cartModalOpen: boolean;
  activeResult: "none" | "offers" | "compare" | "singleCompare";
  onShopsClick: () => void;
  onSearchClick: () => void;
  onCartClick: () => void;
  onCompareClick: () => void;
};

type NavItemProps = {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  badge?: number | string | null;
  notice?: string | null;
  onClick: () => void;
};

function NavItem({
  label,
  icon,
  active = false,
  disabled = false,
  badge = null,
  notice = null,
  onClick,
}: NavItemProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        "relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-[1.15rem] px-1.5 py-2 text-center transition-all duration-150",
        active
          ? "border border-[#8da279]/35 bg-[linear-gradient(180deg,rgba(248,245,232,0.94)_0%,rgba(225,233,213,0.88)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_5px_12px_rgba(39,69,48,0.08)]"
          : "border border-transparent bg-transparent active:bg-[#eee8dc]/70",
        disabled ? "cursor-not-allowed opacity-45" : "active:scale-[0.975]",
      ].join(" ")}
      aria-current={active ? "page" : undefined}
    >
      {notice ? (
        <span className="absolute -top-4 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#bea662]/45 bg-[#fff4bd] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.08em] text-[#31503b] shadow-[0_3px_8px_rgba(65,48,18,0.12)]">
          {notice}
        </span>
      ) : null}

      <span className="relative flex h-[29px] items-center justify-center text-[26px] leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.75)]">
        {icon}
        {badge ? (
          <span className="absolute -right-4 -top-2 flex h-[22px] min-w-[22px] items-center justify-center rounded-full border border-[#0f6a37]/35 bg-[linear-gradient(180deg,#13964b_0%,#087236_100%)] px-1 text-[12px] font-black leading-none text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_3px_7px_rgba(0,70,34,0.25)]">
            {badge}
          </span>
        ) : null}
      </span>

      <span
        className={[
          "mt-1 text-[15px] font-black leading-none tracking-[-0.025em]",
          active ? "text-[#173f30]" : "text-[#2b3a4e]",
        ].join(" ")}
      >
        {label}
      </span>
    </button>
  );
}

export default function ZiiplyMobileBottomNav({
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
}: ZiiplyMobileBottomNavProps) {
  const compareActive = activeResult === "compare" || activeResult === "singleCompare";
  const searchNotice =
    storesReadyForSearch && !searchPanelOpen && !searchBottomNavDisabled ? "Voit hakea" : null;
  const shopsNotice = initialStoreNavPrompt ? "Valitse kaupat" : null;

  return (
    <nav
      className="sm:hidden fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+22px)] z-40"
      aria-label="Ziiply päävalikko"
    >
      <div className="relative mx-auto max-w-[390px] rounded-[1.75rem] border border-[#d8cda9]/70 bg-[linear-gradient(180deg,rgba(252,249,241,0.98)_0%,rgba(241,236,225,0.98)_100%)] px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_-1px_0_rgba(255,255,255,0.55),0_12px_26px_rgba(50,54,42,0.12)] backdrop-blur-md">
        <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-white/80" />
        <div className="pointer-events-none absolute inset-x-7 bottom-0 h-px bg-[#b4a06d]/15" />

        <div className="grid grid-cols-4 items-stretch gap-1.5">
          <NavItem
            label="Kaupat"
            icon={<span aria-hidden="true">🏪</span>}
            active={shopsPanelOpen || initialStoreSelectionLocked}
            notice={shopsNotice}
            onClick={onShopsClick}
          />

          <NavItem
            label="Hae"
            icon={<span aria-hidden="true">🔎</span>}
            active={searchPanelOpen}
            disabled={searchBottomNavDisabled}
            notice={searchNotice}
            onClick={onSearchClick}
            key={`search-${searchReadyBounceKeyV320}`}
          />

          <NavItem
            label="Kori"
            icon={<span aria-hidden="true">🛒</span>}
            active={cartModalOpen || activeResult === "offers"}
            badge={cartLength > 0 ? cartLength : null}
            onClick={onCartClick}
          />

          <NavItem
            label="Vertailu"
            icon={<span aria-hidden="true">⚖️</span>}
            active={compareActive}
            onClick={onCompareClick}
          />
        </div>
      </div>
    </nav>
  );
}

export { ZiiplyMobileBottomNav };
