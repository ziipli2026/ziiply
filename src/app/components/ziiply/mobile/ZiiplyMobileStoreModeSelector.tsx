"use client";

// V665_MODE_SELECTOR_PERSISTENT_PAIR_MISSING_NOTICE
// Korjaus: virheilmoitus ei saa hävitä animaation lopputilaan, jos pari puuttuu edelleen.
// Lisäksi Tavarataloparia-teksti näytetään vain Tavaratalot-tilassa; muulloin yleinen Vertailuparia ei löytynyt.

// V664_MODE_SELECTOR_PERSISTENT_NOTICE
// Korjaa hakutapa-notifikaation: se ei enää katoa 2,2 sekunnin jälkeen,
// jos virhetila on edelleen päällä.
// S/K-napit pysyvät poistettuina selectorista.

// V654_MODE_SELECTOR_REMOVE_CHAIN_BUTTONS
// S-ryhmä / K-ryhmä -napit poistettu StoreModeSelectorista.
// Ketjun sisäinen S/K-valinta tehdään vain kauppakorttialueen korteista.
// Ei state-, handler-, callback-, GPS- tai hakulogiikkamuutoksia.

// V649_MODE_SELECTOR_FINAL_COMPACT_RENDER_FIX
// Korjaa StoreModeSelectorin näkyvän renderin:
// - kaikki napit samaan matalaan korkeuteen
// - HAKUTAPA omalle keskitetylle riville
// - pehmeä vaalea paperi/rasteri
// - ei isoja blokkeja tai venynyttä layoutia
// - ei state-, callback-, handler-, props- tai hakulogiikkamuutoksia
// Tarkoitettu korvaamaan repositoryn:
// src/app/components/ziiply/mobile/ZiiplyMobileStoreModeSelector.tsx

// V646_MODE_SELECTOR_RENDER_FIX_COMPACT_2COL
// Korjaa render-vian: ylärow ei ole enää grid-cols-[1fr_auto_1fr], jossa HAKUTAPA kavensi Tavaratalot/Lähikaupat-napit.
// Uusi rakenne: 2 nappia omassa grid-cols-2 rivissä, HAKUTAPA omalla koko leveän keskikylttirivillä,
// ja Ketjujen väliltä / Ketjun sisältä omassa grid-cols-2 rivissä.
// Vain render-rakenne/ulkoasu. Ei state-, props-, callback-, handler-, haku-, GPS- tai valintalogiikkamuutoksia.
// Kopioi tämä sisältö oikeaan repo-polkuun:
// src/app/components/ziiply/mobile/ZiiplyMobileStoreModeSelector.tsx

// V642_MODE_SELECTOR_SOFT_PAPER_CHAIN_GRAPHICS_VISUAL_ONLY
// V641-pohjasta: vaalennettu paperipohja Hae-näkymän suuntaan, pehmennetty rasteri/pisteet,
// kevennetty ruskeat kehykset ja säädetty emaltti-/paperinappien kontrastia.
// Vain ulkoasu; ei props-, state-, callback-, render-rakenne- tai logiikkamuutoksia.

// V641_MODE_SELECTOR_VISUAL_ONLY
// Muutettu vain ulkoasu: paperitausta, retro-kehykset, emaltti-vihreät aktiivinapit ja lämmin beige passiivipinta.
// Ei muutoksia props-nimiin, stateihin, callbackeihin, valintalogiikkaan tai renderöintirakenteeseen.

import React, { useEffect, useState } from "react";

type StoreMode = "hyper" | "local";
type StoreCompareScope = "none" | "between_chains" | "within_chain";

type Props = {
  fuelMode?: boolean;
  fuelStationSide?: "traffic" | "both" | "cold";
  onFuelStationSideChange?: (side: "traffic" | "both" | "cold") => void;
  storeMode: StoreMode;
  storeModeChosen: boolean;
  storeCompareScope: StoreCompareScope;
  withinChain: "S" | "K" | null;
  selectedRealChainCount: number;
  betweenChainSelectionMode?: "one" | "many";
  missingStoresMessageVisible?: boolean;
  foundStoresCount?: number;
  hyperStorePairMissing?: boolean;
  onStoreModeChange: (mode: StoreMode) => void;
  onStoreCompareScopeChange: (scope: StoreCompareScope) => void;
  onBetweenChainSelectionModeChange?: (mode: "one" | "many") => void;
  onWithinChainChange?: (chain: "S" | "K" | null) => void;
  [key: string]: unknown;
};

function buttonClass(active: boolean, disabled = false) {
  return [
    "relative min-h-[38px] overflow-hidden rounded-[1.25rem] border-[2px] px-3 py-[0.48rem] text-[14px] font-black leading-tight transition active:scale-[0.985]",
    "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.45),transparent_58%)]",
    disabled ? "cursor-not-allowed opacity-60" : "",
    active
      ? "border-[#07502c] bg-gradient-to-b from-[#13864a] via-[#0a6d39] to-[#07502b] text-[#fff4d4] shadow-[0_4px_0_#064123,0_9px_16px_rgba(18,54,32,0.18),inset_0_0_0_2px_rgba(255,255,255,0.20)]"
      : "border-[#d2ad68] bg-gradient-to-b from-[#fff9e4] via-[#f8ebc1] to-[#edd49a] text-[#5a4424] shadow-[0_2px_0_rgba(113,82,38,0.16),inset_0_0_0_2px_rgba(255,255,255,0.58)]",
  ].join(" ");
}

export default function ZiiplyMobileStoreModeSelector({
  fuelMode = false,
  fuelStationSide = "traffic",
  onFuelStationSideChange,
  storeMode,
  storeModeChosen,
  storeCompareScope,
  withinChain,
  selectedRealChainCount,
  betweenChainSelectionMode = "many",
  missingStoresMessageVisible = false,
  foundStoresCount = 0,
  hyperStorePairMissing = false,
  onStoreModeChange,
  onStoreCompareScopeChange,
  onBetweenChainSelectionModeChange,
  onWithinChainChange,
}: Props) {
  const [hakutapaNoticeVisible, setHakutapaNoticeVisible] = useState(false);

  const hyperActive = fuelMode ? fuelStationSide !== "cold" : storeModeChosen && storeMode === "hyper";
  const localActive = fuelMode ? fuelStationSide !== "traffic" : storeModeChosen && storeMode === "local";
  const modeButtonsDisabled = !fuelMode && storeCompareScope === "within_chain";

  // V763: "Vertailuparia ei löytynyt" kuuluu vain Monta-tilaan.
  // Yksi-haussa ei etsitä vertailuparia, joten parin puuttuminen ei ole virhetila.
  const shouldShowHakutapaNotice =
    !fuelMode && storeModeChosen &&
    storeCompareScope === "between_chains" &&
    betweenChainSelectionMode === "many" &&
    selectedRealChainCount < 2;

  useEffect(() => {
    setHakutapaNoticeVisible(shouldShowHakutapaNotice);
  }, [shouldShowHakutapaNotice]);

  if (fuelMode) {
    return (
      <section aria-label="Asematyypin valinta" className="relative mx-auto w-full max-w-[390px] shrink-0 rounded-[1.5rem] border-[3px] border-[#b38a4a] bg-[#fcf5de] px-2 py-1.5 text-[#213224]">
        <div className="grid grid-cols-[minmax(0,1fr)_48px_minmax(0,1fr)] items-center gap-2">
          <button type="button" aria-pressed={hyperActive} onClick={() => onFuelStationSideChange?.("traffic")} className={`${buttonClass(hyperActive)} !min-h-[38px] !px-1 !py-1 !text-[11px]`}>
            Liikenneasemat
          </button>
          <div className="flex flex-col items-center gap-0.5">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[14px] w-[16px]" fill="none" stroke="#a32c28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 21V4a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v17M2 21h15M15 10h2a2 2 0 0 1 2 2v5a2 2 0 0 0 4 0V8l-4-4" />
              <path d="M7 5h5v5H7zM20 5v4h3" />
            </svg>
            <button type="button" aria-label={`Asematyyppi: ${fuelStationSide === "traffic" ? "Liikenneasemat" : fuelStationSide === "cold" ? "Kylmäasemat ja muut" : "Kaikki asemat"}. Vaihda asematyyppiä.`} onClick={() => onFuelStationSideChange?.(fuelStationSide === "traffic" ? "cold" : fuelStationSide === "cold" ? "both" : "traffic")} className="relative h-[20px] w-[44px] rounded-full border border-[#b99b62] bg-[#d8c69d]">
              <span aria-hidden="true" className={`absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow-sm transition-[left] ${fuelStationSide === "traffic" ? "left-[2px]" : fuelStationSide === "both" ? "left-[14px]" : "left-[26px]"}`} />
            </button>
            <span aria-hidden="true" className="text-[14px] font-black leading-[12px] text-[#1a2740]">{fuelStationSide === "traffic" ? "←" : fuelStationSide === "cold" ? "→" : "↔"}</span>
          </div>
          <button type="button" aria-pressed={localActive} onClick={() => onFuelStationSideChange?.("cold")} className={`${buttonClass(localActive)} !min-h-[38px] !px-1 !py-1 !text-[11px]`}>
            Kylmäasemat / muut
          </button>
        </div>
        <div className="mt-1 text-center text-[10px] font-black uppercase leading-[12px] tracking-[0.12em] text-[#66543a]">Hakutapa</div>
      </section>
    );
  }

  return (
    <section className={`relative mx-auto w-full min-w-0 max-w-[390px] overflow-hidden ${fuelMode ? "shrink-0 !px-2 !pt-2 !pb-2" : ""} rounded-[1.9rem] border-[3px] border-[#b38a4a] bg-[#fcf5de] px-4 pb-2 pt-1.5 text-[#213224] shadow-[0_5px_0_rgba(105,72,28,0.14),0_14px_24px_rgba(46,32,12,0.10),inset_0_0_0_2px_rgba(255,255,255,0.48)]`}>
      <style>{`
        @keyframes ziiplyNoticePop {
          0% {
            opacity: 0;
            transform: scale(0.92);
          }
          12% {
            opacity: 1;
            transform: scale(1);
          }
          82% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.96);
          }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 opacity-24 [background-image:radial-gradient(#c9ad6b_0.9px,transparent_0.9px)] [background-size:17px_17px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.64),transparent_60%)]" />

      <div className={`relative z-10 ${fuelMode ? "grid grid-cols-[minmax(0,1fr)_52px_minmax(0,1fr)] items-center gap-x-2"  : "grid grid-cols-[minmax(0,1fr)_40px_minmax(0,1fr)] items-center gap-x-1"}`}>
<button
          type="button"
          disabled={modeButtonsDisabled}
          onClick={() => fuelMode ? onFuelStationSideChange?.("traffic") : onStoreModeChange("hyper")}
          className={`${buttonClass(hyperActive, modeButtonsDisabled)} ${fuelMode ? "!min-h-[44px] w-full !px-1 !py-1 !text-[11px]"  : "min-w-0 w-full !px-1"}`}
        >
          <span className="relative z-10">{fuelMode ? "⛽ Liikenneasemat" : "🏬 Tavaratalot"}</span>
        </button>
        {fuelMode ? (
          <div className="relative z-10 flex w-[52px] flex-col items-center gap-1 py-1">
            <img src="/fuel-icons/fuel-pump.png" alt="" className="h-[20px] w-[24px] object-contain" />
            <button type="button" aria-label="Asematyypin valinta" title={fuelStationSide === "traffic" ? "Liikenneasemat" : fuelStationSide === "cold" ? "Kylmäasemat ja muut" : "Kaikki asemat"} onClick={() => onFuelStationSideChange?.(fuelStationSide === "traffic" ? "cold" : fuelStationSide === "cold" ? "both" : "traffic")} className="relative h-[24px] w-[50px] shrink-0 rounded-full border border-[#b99b62] bg-[#d8c69d] shadow-sm">
              <span aria-hidden="true" className={`pointer-events-none absolute top-[3px] h-[16px] w-[16px] rounded-full bg-white shadow transition-[left] ${fuelStationSide === "traffic" ? "left-[3px]" : fuelStationSide === "both" ? "left-[16px]" : "left-[29px]"}`} />
            </button>
            <span aria-hidden="true" className="text-[17px] font-black leading-none text-[#1a2740]">{fuelStationSide === "traffic" ? "←" : fuelStationSide === "cold" ? "→" : "↔"}</span>
          </div>
        ) : (
          <div className={`relative z-30 flex w-full flex-col items-center justify-center ${storeCompareScope === "between_chains" && storeModeChosen ? "" : "invisible pointer-events-none"}`}>
            <span className="mb-0 text-[9px] font-black leading-none text-[#6a5330]">Yksi</span>
            <button type="button" role="switch" aria-checked={betweenChainSelectionMode === "many"} aria-label="Valitse yksi tai monta kauppaa" onClick={() => onBetweenChainSelectionModeChange?.(betweenChainSelectionMode === "one" ? "many" : "one")} className={`relative h-[34px] w-[18px] shrink-0 rounded-full border transition-colors ${betweenChainSelectionMode === "many" ? "border-[#07502c] bg-[#0a6d39]" : "border-[#b99b62] bg-[#d8c69d]"}`}>
              <span className={`absolute left-[2px] h-[12px] w-[12px] rounded-full bg-white shadow-sm transition-all ${betweenChainSelectionMode === "many" ? "top-[18px]" : "top-[2px]"}`} />
            </button>
            <span className="mt-0 text-[9px] font-black leading-none -translate-y-[2px] text-[#6a5330]">Monta</span>
          </div>
        )}
<button
          type="button"
          disabled={modeButtonsDisabled}
          onClick={() => fuelMode ? onFuelStationSideChange?.("cold") : onStoreModeChange("local")}
          className={`${buttonClass(localActive, modeButtonsDisabled)} ${fuelMode ? "!min-h-[44px] w-full !px-1 !py-1 !text-[11px]"  : "min-w-0 w-full !px-1"}`}
        >
          <span className="relative z-10">{fuelMode ? "⛽ Kylmäasemat / muut" : "🏪 Lähikaupat"}</span>
        </button>
      </div>

      {fuelMode && <div className="relative z-10 mt-2 text-center text-[12px] font-black uppercase tracking-[0.12em] text-[#66543a]">Hakutapa</div>}
      {!fuelMode && (
      <div className="relative z-0 my-1 flex h-7 items-center justify-center overflow-visible">
        <p
          className={[
            "relative z-0 whitespace-nowrap px-3.5 py-[0.35rem] text-center text-[12px] font-black uppercase leading-none tracking-[0.14em] transition-none",
            shouldShowHakutapaNotice
              ? "border-[#cda34a] bg-[#ffeaa0] text-[#634100] shadow-[0_3px_10px_rgba(180,119,0,0.14)]"
              : "border-[#d7b977] bg-[#fff8da] text-[#66543a]",
          ].join(" ")}
        >
          {shouldShowHakutapaNotice
            ? hyperStorePairMissing && storeMode === "hyper"
              ? "Tavarataloparia ei löytynyt"
              : "Vertailuparia ei löytynyt"
            : !storeModeChosen || storeCompareScope === "none"
              ? "Valitse hakutapa"
              : "Hakutapa"}
        </p>
      </div>
      )}

      <div className={`relative z-10 mt-[-2px] grid grid-cols-2 gap-3 ${fuelMode ? "hidden" : ""}`}>
        <button
          type="button"
          onClick={() => onStoreCompareScopeChange("between_chains")}
          className={`${buttonClass(storeCompareScope === "between_chains")} min-w-0`}
        >
          <span className="relative z-10">Ketjujen väliltä</span>
        </button>

        <button
          type="button"
          onClick={() => onStoreCompareScopeChange("within_chain")}
          className={`${buttonClass(storeCompareScope === "within_chain")} min-w-0`}
        >
          <span className="relative z-10">Ketjun sisältä</span>
        </button>
      </div>

    </section>
  );
}

export { ZiiplyMobileStoreModeSelector };
