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

function ZiiplyNavItem({
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
      aria-current={active ? "page" : undefined}
      className={[
        "relative flex min-w-0 flex-1 flex-col items-center justify-center rounded-[1.05rem] px-1 py-[7px] text-center transition-all duration-150",
        active
          ? "border border-[#9aad82]/55 bg-[linear-gradient(180deg,#eef4df_0%,#dfe9ca_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(95,117,71,0.12),0_4px_10px_rgba(38,70,45,0.09)]"
          : "border border-transparent bg-transparent hover:bg-[#efe9d8]/45 active:bg-[#e8e0cf]/70",
        disabled ? "cursor-not-allowed opacity-45" : "active:scale-[0.975]",
      ].join(" ")}
    >
      {notice ? (
        <span className="absolute -top-[18px] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full border border-[#b79f59]/50 bg-[linear-gradient(180deg,#fff8ca_0%,#efd784_100%)] px-2 py-[2px] text-[9px] font-black uppercase tracking-[0.08em] text-[#254833] shadow-[0_3px_8px_rgba(65,48,18,0.16)]">
          {notice}
        </span>
      ) : null}

      <span
        className={[
          "relative flex h-[29px] items-center justify-center leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.75)]",
          active ? "text-[27px]" : "text-[26px]",
        ].join(" ")}
      >
        {icon}
        {badge ? (
          <span className="absolute -right-4 -top-2 flex h-[23px] min-w-[23px] items-center justify-center rounded-full border border-[#075629]/50 bg-[linear-gradient(180deg,#189b4f_0%,#087135_100%)] px-1 text-[12px] font-black leading-none text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.38),0_3px_8px_rgba(0,70,34,0.28)]">
            {badge}
          </span>
        ) : null}
      </span>

      <span
        className={[
          "mt-[5px] text-[14px] font-black leading-none tracking-[-0.015em]",
          active ? "text-[#173f30]" : "text-[#2d394a]",
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
      <div className="relative mx-auto max-w-[390px] overflow-visible rounded-[1.65rem] border border-[#d7c89e]/75 bg-[linear-gradient(180deg,rgba(252,248,236,0.99)_0%,rgba(241,234,217,0.99)_48%,rgba(232,226,208,0.99)_100%)] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),inset_0_-1px_0_rgba(133,108,61,0.12),0_-1px_0_rgba(255,255,255,0.7),0_10px_24px_rgba(42,52,38,0.13)] backdrop-blur-md">
        <div className="pointer-events-none absolute inset-x-5 top-[5px] h-px bg-white/85" />
        <div className="pointer-events-none absolute inset-x-7 bottom-[5px] h-px bg-[#b59d63]/18" />
        <div className="pointer-events-none absolute left-7 right-7 top-0 h-[2px] rounded-full bg-[linear-gradient(90deg,transparent_0%,rgba(174,145,76,0.34)_18%,rgba(255,255,255,0.85)_50%,rgba(174,145,76,0.34)_82%,transparent_100%)]" />

        <div className="grid grid-cols-4 items-stretch gap-1">
          <ZiiplyNavItem
            label="Kaupat"
            icon={<span aria-hidden="true">🏪</span>}
            active={shopsPanelOpen || initialStoreSelectionLocked}
            notice={shopsNotice}
            onClick={onShopsClick}
          />

          <ZiiplyNavItem
            key={`search-${searchReadyBounceKeyV320}`}
            label="Hae"
            icon={<span aria-hidden="true">🔎</span>}
            active={searchPanelOpen}
            disabled={searchBottomNavDisabled}
            notice={searchNotice}
            onClick={onSearchClick}
          />

          <ZiiplyNavItem
            label="Kori"
            icon={<span aria-hidden="true">🛒</span>}
            active={cartModalOpen || activeResult === "offers"}
            badge={cartLength > 0 ? cartLength : null}
            onClick={onCartClick}
          />

          <ZiiplyNavItem
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
