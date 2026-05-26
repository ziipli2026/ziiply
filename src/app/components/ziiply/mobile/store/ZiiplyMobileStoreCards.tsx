"use client";

import React from "react";
import ZiiplyMobileStoreCard from "./ZiiplyMobileStoreCard";

export type ZiiplyMobileStoreChainKey = "s" | "k" | "lidl" | "tokmanni";

export type ZiiplyMobileStoreCardItem = {
  key: ZiiplyMobileStoreChainKey;
  chainLabel: string;
  name: string;
  selected: boolean;
  comingSoon?: boolean;
  featured?: boolean;
  distance?: string;
};

export type ZiiplyMobileStoreCardsProps = {
  stores: ZiiplyMobileStoreCardItem[];
  onToggleChain: (key: ZiiplyMobileStoreChainKey) => void;
  renderPicker?: (key: ZiiplyMobileStoreChainKey) => React.ReactNode;
};

const logoSrcByKey: Record<ZiiplyMobileStoreChainKey, string> = {
  s: "/storelogos/s-group.png",
  k: "/storelogos/k-group.png",
  lidl: "/storelogos/lidl.png",
  tokmanni: "/storelogos/spar.png",
};

export default function ZiiplyMobileStoreCards({
  stores,
  onToggleChain,
  renderPicker,
}: ZiiplyMobileStoreCardsProps) {
  return (
    <section className="grid grid-cols-2 gap-2">
      {stores.map((store) => (
        <ZiiplyMobileStoreCard
          key={store.key}
          logoSrc={logoSrcByKey[store.key]}
          chainLabel={store.chainLabel}
          name={store.name}
          selected={store.selected}
          featured={store.featured}
          distance={store.distance}
          onClick={() => onToggleChain(store.key)}
        >
          {renderPicker?.(store.key)}
        </ZiiplyMobileStoreCard>
      ))}
    </section>
  );
}

export { ZiiplyMobileStoreCards };
