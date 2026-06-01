"use client";

// V3_MOBILE_STORE_PICKER_MODAL_STORESEARCHITEM_COMPAT
// Irrotettu page.tsx:n renderStorePickerMenu-haarasta omaksi komponentiksi.
// Tarkoitus:
// - sama toiminnallinen rakenne kuin nykyisessä pickerissä
// - parempi kontrasti ja luettavuus mobiililla
// - S/K-valinnan värit hillitymmät, ei liian kirkas punainen/vihreä
// - ei riippuvuutta page.tsx:n sisäisiin tyyppeihin
// - id voi olla string tai number, koska page.tsx:n StoreSearchItem käyttää numero-id:tä
// - distance voi olla string tai number, koska page.tsx:n StoreSearchItem voi antaa numeron

import React from "react";
import { createPortal } from "react-dom";

export type MobileStorePickerChain = "S" | "K";

export type MobileStorePickerStore = {
  id?: string | number;
  name?: string;
  type?: string;
  chain?: string;
  city?: string;
  postalCode?: string;
  distance?: string | number;
  distanceLabel?: string | number;
};

export type MobileStorePickerModalProps = {
  open: boolean;
  chain: MobileStorePickerChain;
  title: string;
  stores: MobileStorePickerStore[];
  selectedId?: string | number | null;
  selectedName?: string | null;
  activeAreaLabel?: string;
  top: number;
  width: number;
  onClose: () => void;
  onSelectStore: (store: MobileStorePickerStore) => void;
  getDistanceLabel?: (store: MobileStorePickerStore) => string;
  getStoreKey?: (store: MobileStorePickerStore, index: number) => string;
};

function getDistance(store: MobileStorePickerStore, getDistanceLabel?: (store: MobileStorePickerStore) => string) {
  const value = getDistanceLabel?.(store) || store.distanceLabel || store.distance || "";
  return value == null ? "" : String(value);
}

function isSelectedStore(
  store: MobileStorePickerStore,
  selectedId?: string | null,
  selectedName?: string | null,
) {
  return Boolean(
    (selectedId != null && store.id != null && String(store.id) === String(selectedId)) ||
      (selectedName && store.name === selectedName),
  );
}

function chainStyles(chain: MobileStorePickerChain, selected: boolean) {
  if (!selected) {
    return {
      row:
        "border-[#ead9aa] bg-[linear-gradient(180deg,#fffdf6_0%,#f8f2df_100%)] text-[#263248] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_2px_6px_rgba(75,52,16,0.08)] active:bg-[#fff8df]",
      name: "text-[#24324a]",
      meta: "text-[#78684a]",
      pill: "border-[#ddca96] bg-[#fff4cf] text-[#6f5a2a]",
    };
  }

  if (chain === "S") {
    return {
      row:
        "border-[#0b6f35] bg-[linear-gradient(180deg,#0b9143_0%,#087237_100%)] text-white shadow-[0_6px_14px_rgba(8,114,55,0.22),inset_0_1px_0_rgba(255,255,255,0.24)]",
      name: "text-white",
      meta: "text-[#e7ffe9]",
      pill: "border-[#bdf1c9]/35 bg-white/18 text-white",
    };
  }

  return {
    row:
      "border-[#9d1f22] bg-[linear-gradient(180deg,#c8141d_0%,#a90813_100%)] text-white shadow-[0_6px_14px_rgba(150,19,26,0.22),inset_0_1px_0_rgba(255,255,255,0.24)]",
    name: "text-white",
    meta: "text-[#ffe7e7]",
    pill: "border-[#ffd1d1]/35 bg-white/18 text-white",
  };
}

export default function MobileStorePickerModal({
  open,
  chain,
  title,
  stores,
  selectedId,
  selectedName,
  activeAreaLabel,
  top,
  width,
  onClose,
  onSelectStore,
  getDistanceLabel,
  getStoreKey,
}: MobileStorePickerModalProps) {
  if (!open || typeof document === "undefined") return null;

  const portalContent = (
    <div
      className="fixed inset-0 z-[2147483647] bg-transparent ziiply-store-picker-fade"
      onClick={onClose}
      onTouchMove={(event) => {
        event.preventDefault();
      }}
    >
      <div
        className="fixed left-1/2 overflow-hidden rounded-[1.45rem] border-[2px] border-[#d7bd78] bg-[linear-gradient(180deg,#fff9df_0%,#fff3cd_100%)] p-2 text-left text-xs shadow-[0_18px_55px_rgba(45,31,9,0.30),inset_0_1px_0_rgba(255,255,255,0.84)] ring-1 ring-[#fff8da] ziiply-store-picker-panel-fade"
        style={{
          top: `${top}px`,
          width: `${width}px`,
          transform: "translateX(-50%)",
        }}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between gap-2 px-1">
          <p className="min-w-0 truncate text-[11.5px] font-black uppercase tracking-[0.075em] text-[#6e5a31] [text-shadow:0_1px_0_rgba(255,255,255,0.78)]">
            {title}
          </p>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }}
            className="shrink-0 rounded-full border border-[#d9e2ec] bg-[#f4f7fb] px-3 py-1.5 text-[10.5px] font-black text-[#34445c] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_2px_4px_rgba(15,23,42,0.06)] active:scale-[0.98]"
          >
            Sulje
          </button>
        </div>

        <div
          className="max-h-[38dvh] overflow-y-auto overscroll-contain pr-[1px] [-webkit-overflow-scrolling:touch] touch-pan-y"
          onTouchMove={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          {stores.length === 0 ? (
            <p className="rounded-xl border border-[#ead9aa] bg-[#fffdf6] px-3 py-3 text-[12px] font-black text-[#7b6a45]">
              Ei kauppoja valittavana. Hae alue uudelleen.
            </p>
          ) : (
            stores.map((store, index) => {
              const selected = isSelectedStore(store, selectedId, selectedName);
              const distanceLabel = getDistance(store, getDistanceLabel);
              const styles = chainStyles(chain, selected);
              const key =
                getStoreKey?.(store, index) ||
                `${store.type || store.chain || chain}-${store.id || index}-${store.name || "store"}`;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onSelectStore(store);
                  }}
                  className={`mb-2 flex w-full touch-manipulation items-center justify-between gap-2 rounded-[1rem] border px-3 py-2.5 text-left font-extrabold transition last:mb-0 active:scale-[0.99] ${styles.row}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[14px] font-black leading-tight ${styles.name}`}>
                      {store.name || "Kauppa"}
                    </span>
                    <span className={`mt-1 block truncate text-[11.5px] font-black leading-tight ${styles.meta}`}>
                      {[
                        store.city || activeAreaLabel || "",
                        store.postalCode || "",
                        distanceLabel,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>

                  {(selected || distanceLabel) && (
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 text-[10.5px] font-black leading-none ${styles.pill}`}
                    >
                      {selected ? "Valittu" : distanceLabel}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(portalContent, document.body);
}

export { MobileStorePickerModal };
