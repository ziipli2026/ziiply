"use client";

import React from "react";
import { ZiiplyBottomNav } from "../ziiplyComponents";

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

export default function ZiiplyMobileBottomNav(props: ZiiplyMobileBottomNavProps) {
  return <ZiiplyBottomNav {...props} />;
}

export { ZiiplyMobileBottomNav };
