"use client";

import React from "react";
import * as ZiiplyCompareCardModule from "../cards/ZiiplyCompareCard";

const ZiiplyCompareCard = ((ZiiplyCompareCardModule as any).default ||
  (ZiiplyCompareCardModule as any).ZiiplyCompareCard ||
  (ZiiplyCompareCardModule as any).CompareResponsiveCard ||
  (ZiiplyCompareCardModule as any).ZiiplyCompareResponsiveCard) as any;

export type ZiiplyMobileCompareViewProps = {
  open?: boolean;
  closing?: boolean;
  compareOverlayScrollRef?: React.RefObject<HTMLDivElement | null>;
  onClose?: () => void;
  className?: string;

  cart?: any[];
  selectedChains?: Record<string, boolean>;
  setSelectedChains?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

  comparisonLoading?: boolean;
  sMatches?: Record<string, any>;
  kMatches?: Record<string, any>;
  expandedAlternatives?: Record<string, boolean>;
  alternativeResults?: Record<string, any[]>;
  loadingAlternatives?: Record<string, boolean>;
  optimizingChains?: Record<string, boolean>;
  qualityModesByCart?: Record<string, any>;

  cheapest?: any;
  secondCheapest?: any;
  savings?: number;
  savingsPercent?: number;
  chainResults?: any[];
  lastOptimizationSnapshot?: any;

  formatEuro?: (value: number) => string;
  fixText?: (value: string) => string;

  onToggleChain?: (chainKey: string) => void;
  onCompareCart?: () => void;
  onClearComparison?: () => void;
  onToggleAlternative?: (itemId: string) => void;
  onPickAlternative?: (cartItem: any, product: any, chain: "S" | "K") => void;
  onOptimizeChain?: (chain: "S" | "K") => void;
  onSetQualityMode?: (cartItemId: string, mode: any) => void;
  onAddMore?: () => void;
  onOpenCart?: () => void;

  /**
   * Sallii P394:n nykyisten propsien läpiviennin ilman että tämä välivaiheen
   * komponentti kaataa buildin tuntemattomiin avaimiin.
   */
  [key: string]: unknown;
};

export default function ZiiplyMobileCompareView({
  open = true,
  closing = false,
  compareOverlayScrollRef,
  onClose,
  className = "",

  cart = [],
  selectedChains = { s: true, k: true, lidl: false, tokmanni: false },
  setSelectedChains,

  comparisonLoading = false,
  sMatches = {},
  kMatches = {},
  expandedAlternatives = {},
  alternativeResults = {},
  loadingAlternatives = {},
  optimizingChains = {},
  qualityModesByCart = {},

  cheapest = null,
  secondCheapest = null,
  savings = 0,
  savingsPercent = 0,
  chainResults = [],
  lastOptimizationSnapshot = null,

  formatEuro = (value: number) =>
    Number(value || 0).toLocaleString("fi-FI", {
      style: "currency",
      currency: "EUR",
    }),
  fixText = (value: string) => String(value || ""),

  onToggleChain = () => undefined,
  onCompareCart = () => undefined,
  onClearComparison = () => undefined,
  onToggleAlternative = () => undefined,
  onPickAlternative = () => undefined,
  onOptimizeChain = () => undefined,
  onSetQualityMode = () => undefined,
  onAddMore = () => undefined,
  onOpenCart = () => undefined,

  ...rest
}: ZiiplyMobileCompareViewProps) {
  if (!open) return null;

  const safeSetSelectedChains =
    setSelectedChains ||
    (((_value: any) => undefined) as React.Dispatch<
      React.SetStateAction<Record<string, boolean>>
    >);

  return (
    <div
      className={`fixed inset-0 z-[86] block bg-[#eef7f2]/95 px-3 pb-[calc(env(safe-area-inset-bottom)+6.1rem)] pt-[calc(env(safe-area-inset-top)+6.8rem)] backdrop-blur-xl sm:hidden ${
        closing ? "ziiply-soft-close" : "ziiply-soft-open"
      } ${className}`}
    >
      <div
        ref={compareOverlayScrollRef}
        className="mx-auto h-full max-w-[34rem] overflow-y-auto rounded-[2rem] bg-white/92 p-3 shadow-[0_18px_55px_rgba(15,23,42,0.16)] ring-1 ring-white/80"
      >
        {onClose && (
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black text-slate-700 shadow-sm active:scale-95"
            >
              Sulje
            </button>
          </div>
        )}

        <div className="ziiply-compare-retro-fix">
          <ZiiplyCompareCard
            {...rest}
            cart={cart}
            selectedChains={selectedChains}
            setSelectedChains={safeSetSelectedChains}
            comparisonLoading={comparisonLoading}
            sMatches={sMatches}
            kMatches={kMatches}
            expandedAlternatives={expandedAlternatives}
            alternativeResults={alternativeResults}
            loadingAlternatives={loadingAlternatives}
            optimizingChains={optimizingChains}
            qualityModesByCart={qualityModesByCart}
            cheapest={cheapest}
            secondCheapest={secondCheapest}
            savings={savings}
            savingsPercent={savingsPercent}
            chainResults={chainResults}
            lastOptimizationSnapshot={lastOptimizationSnapshot}
            formatEuro={formatEuro}
            fixText={fixText}
            onToggleChain={onToggleChain}
            onCompareCart={onCompareCart}
            onClearComparison={onClearComparison}
            onToggleAlternative={onToggleAlternative}
            onPickAlternative={onPickAlternative}
            onOptimizeChain={onOptimizeChain}
            onSetQualityMode={onSetQualityMode}
            onAddMore={onAddMore}
            onOpenCart={onOpenCart}
          />
        </div>
      </div>
    </div>
  );
}

export { ZiiplyMobileCompareView };
