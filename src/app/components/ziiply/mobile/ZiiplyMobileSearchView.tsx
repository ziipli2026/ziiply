"use client";

// ZIIPLY_MOBILE_SEARCH_VIEW_TS_STRICT_FIX: functional setInput callbacks typed.

import React from "react";

export type ZiiplyMobileSearchViewProps = {
  [key: string]: any;
};

/**
 * P394:stä irrotettu mobiilin Hae-näkymä.
 *
 * Huom:
 * - Tämä komponentti on tarkoituksella "props-driven".
 * - State, refs ja hakufunktiot jäävät tässä vaiheessa page.tsx:ään.
 * - Kun tämä toimii, vasta myöhemmin voidaan siirtää aivoja omiin core-tiedostoihin.
 */
export default function ZiiplyMobileSearchView(props: ZiiplyMobileSearchViewProps) {
  const {
    searchPanelOpen,
    closingPanels,
    setSearchCompareMode,
    setNormalResults,
    setSingleProductCompareResults,
    setSingleProductCompareTerm,
    setVisibleNormalCount,
    searchCompareMode,
    setInput,
    getSingleSearchTerm,
    pasteFromClipboardToSearch,
    searchInputRef,
    input,
    setSearchInputForMode,
    instantSearchSuggestions,
    applyInstantSearchSuggestion,
    hasSearchInput,
    loadingNormal,
    singleProductCompareLoading,
    isListening,
    startVoiceInput,
    keyboardOpenV320,
    normalSearchAttempted,
    normalResults,
    activeNormalSearchTerm,
    setActiveNormalSearchTerm,
    setNormalSearchAttempted,
    handleMainNormalSearch,
    handleMainOfferSearch,
    addInputToCart,
    setOffers,
    setHasSearchedOffers,
    loadingOffers,
    openEanModal,
    triggerHaptic,
  } = props;

  return (
    <>
      {searchPanelOpen && (
                <div
                  className={`fixed inset-0 z-40 flex items-end justify-center overflow-hidden overscroll-none bg-transparent px-2 pb-[calc(env(safe-area-inset-bottom)+6.45rem)] pt-[calc(env(safe-area-inset-top)+5.0rem)] sm:items-center sm:p-6 ${closingPanels.search ? "ziiply-soft-close" : "ziiply-soft-open"}`}
                >
                  <div className="h-[min(70dvh,650px)] w-full max-w-[28rem] overflow-visible overscroll-none rounded-[1.65rem] bg-white/90 p-2.5 shadow-2xl ring-1 ring-white/70 backdrop-blur-2xl">
                    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/95 p-3 shadow-[0_18px_55px_rgba(15,23,42,0.10)] ring-1 ring-slate-100 sm:rounded-[2rem] sm:p-4">
                      <div className="flex h-full min-h-0 flex-col">
                        <div className="shrink-0">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-green-50 text-xl shadow-sm ring-1 ring-green-100">
                              🔎
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-black uppercase tracking-[0.32em] text-green-700">
                                Haku
                              </p>
                              <h1 className="mt-0.5 text-[1.14rem] font-black leading-[1.05] tracking-tight text-slate-950 sm:text-[1.42rem]">
                                Mitä haluat ostaa?
                              </h1>
                              <p className="mt-0.5 text-[11px] font-bold leading-snug text-slate-500">
                                Kirjoita tuotteet ja valitse toiminto alta.
                              </p>
                            </div>
                          </div>

                          <div className="mt-1 rounded-[1.05rem] bg-slate-50/90 p-1 ring-1 ring-slate-100">
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setSearchCompareMode("cart");
                                  setNormalResults([]);
                                  setSingleProductCompareResults([]);
                                  setSingleProductCompareTerm("");
                                  setVisibleNormalCount(8);
                                }}
                                className={`min-h-[2.35rem] rounded-[0.9rem] px-3 py-1 text-sm font-black transition active:scale-[0.98] ${
                                  searchCompareMode === "cart"
                                    ? "bg-green-700 text-white shadow-md shadow-green-600/20 ring-1 ring-black/10"
                                    : "bg-white text-slate-700 ring-1 ring-slate-200"
                                }`}
                              >
                                <span className="flex h-full w-full items-center justify-center gap-2 whitespace-nowrap leading-none">
                                  <svg
                                    aria-hidden="true"
                                    viewBox="0 0 24 24"
                                    className="block h-[18px] w-[18px] shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.7"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M4 5h2.3l1.7 9.2a2 2 0 0 0 2 1.6h6.8a2 2 0 0 0 1.9-1.45L20 8H7.2" />
                                    <circle
                                      cx="10"
                                      cy="20"
                                      r="1.55"
                                      fill="currentColor"
                                      stroke="none"
                                    />
                                    <circle
                                      cx="17"
                                      cy="20"
                                      r="1.55"
                                      fill="currentColor"
                                      stroke="none"
                                    />
                                  </svg>
                                  <span className="block leading-none">
                                    Koko kori
                                  </span>
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSearchCompareMode("single");
                                  setInput((currentInput: string) =>
                                    getSingleSearchTerm(currentInput),
                                  );
                                  setNormalResults([]);
                                  setSingleProductCompareResults([]);
                                  setSingleProductCompareTerm("");
                                  setVisibleNormalCount(8);
                                }}
                                className={`min-h-[2.35rem] rounded-[0.9rem] px-3 py-1 text-sm font-black transition active:scale-[0.98] ${
                                  searchCompareMode === "single"
                                    ? "bg-green-700 text-white shadow-md shadow-green-600/20 ring-1 ring-black/10"
                                    : "bg-white text-slate-700 ring-1 ring-slate-200"
                                }`}
                              >
                                🔎 Yksi tuote
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="mt-1 shrink-0 rounded-[1.25rem] border border-green-100 bg-white p-2 shadow-inner shadow-green-50/60">
                          <div className="mb-1.5 flex items-center justify-between px-1">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                              Tuotteet
                            </p>
                            <button
                              type="button"
                              onPointerDown={(event) => event.preventDefault()}
                              onClick={() => void pasteFromClipboardToSearch()}
                              className="rounded-full bg-green-50 px-4 py-1.5 text-xs font-black text-green-700 ring-1 ring-green-200 active:scale-[0.98]"
                            >
                              Liitä
                            </button>
                          </div>
                          <textarea
                            ref={searchInputRef}
                            value={input}
                            onChange={(event) =>
                              setSearchInputForMode(event.target.value)
                            }
                            placeholder={
                              searchCompareMode === "single"
                                ? "Kirjoita yksi tuote, esim. maito"
                                : "Kirjoita tuotteet riveittäin tai pilkulla, esim. maito, kahvi, jauheliha"
                            }
                            className="h-[4.1rem] min-h-[4.1rem] max-h-[4.1rem] w-full resize-none rounded-[1.25rem] border-2 border-green-500/70 bg-white px-3.5 py-3 text-[16px] font-semibold leading-snug text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-green-600 focus:ring-4 focus:ring-green-100 sm:h-[5.2rem] sm:min-h-[5.2rem] sm:max-h-[5.2rem]"
                          />
                          {instantSearchSuggestions.length > 0 && (
                            <div
                              className="mt-1 flex h-8 w-full items-center gap-1.5 overflow-x-auto overflow-y-hidden px-1 pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                              aria-label="Hakuehdotukset"
                            >
                              <span className="shrink-0 rounded-full bg-slate-50 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-400 ring-1 ring-slate-100">
                                Ehdotukset
                              </span>
                              {instantSearchSuggestions.map((suggestion) => (
                                <button
                                  key={`${suggestion.hint}-${suggestion.label}`}
                                  type="button"
                                  onPointerDown={(event) => event.preventDefault()}
                                  onClick={() =>
                                    applyInstantSearchSuggestion(suggestion.label)
                                  }
                                  className="shrink-0 whitespace-nowrap rounded-full bg-green-50 px-2.5 py-1 text-xs font-black text-green-800 ring-1 ring-green-100 active:scale-[0.98]"
                                  title={suggestion.label}
                                >
                                  {suggestion.label}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="mt-1 flex h-7 items-center justify-between gap-2 px-1">
                            <p className="truncate text-[11px] font-bold text-slate-400">
                              {searchCompareMode === "single"
                                ? "Valitse tarkka tuote listasta ennen vertailua."
                                : "Max 8 tuotetta. Liitä muistilistasta."}
                            </p>
                            {hasSearchInput && (
                              <button
                                type="button"
                                onClick={() => {
                                  setInput("");
                                  setNormalResults([]);
                                  setSingleProductCompareResults([]);
                                  setSingleProductCompareTerm("");
                                  setVisibleNormalCount(8);
                                  setActiveNormalSearchTerm("");
                                  setNormalSearchAttempted(false);
                                  setHasSearchedOffers(false);
                                  setOffers([]);
                                  triggerHaptic();
                                  window.setTimeout(
                                    () => searchInputRef.current?.focus(),
                                    0,
                                  );
                                }}
                                className="shrink-0 rounded-full bg-slate-700 px-3 py-1.5 text-xs font-black text-white shadow-sm ring-1 ring-slate-600 active:scale-[0.98]"
                              >
                                Tyhjennä
                              </button>
                            )}
                          </div>

                          {!loadingNormal &&
                            normalSearchAttempted &&
                            activeNormalSearchTerm &&
                            normalResults.length === 0 && (
                              <div className="mt-2 shrink-0 rounded-[1.35rem] bg-slate-50 p-4 text-center shadow-sm ring-1 ring-slate-200 ziiply-soft-open-fast">
                                <div className="text-3xl">🔎</div>
                                <p className="mt-2 text-base font-black text-slate-900">
                                  Tuotteita ei löytynyt
                                </p>
                                <p className="mt-1 text-sm font-bold leading-snug text-slate-500">
                                  Haulle “{activeNormalSearchTerm}” ei löytynyt
                                  tuotteita. Kokeile tarkempaa hakusanaa tai lisää
                                  tuote käsin.
                                </p>
                              </div>
                            )}

                          {keyboardOpenV320 && (
                            <div className="mt-2 rounded-[1.1rem] bg-white/95 p-1.5 shadow-[0_10px_26px_rgba(15,23,42,0.10)] ring-1 ring-slate-100">
                              <div className="grid grid-cols-2 gap-2">
                                <button
                                  type="button"
                                  onPointerDown={(event) => event.preventDefault()}
                                  onClick={handleMainNormalSearch}
                                  disabled={
                                    !hasSearchInput ||
                                    loadingNormal ||
                                    singleProductCompareLoading
                                  }
                                  aria-disabled={
                                    !hasSearchInput ||
                                    loadingNormal ||
                                    singleProductCompareLoading
                                  }
                                  className={`min-h-[2.65rem] touch-manipulation rounded-[1rem] px-3 text-sm font-black transition ${
                                    !hasSearchInput ||
                                    loadingNormal ||
                                    singleProductCompareLoading
                                      ? "cursor-not-allowed bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                                      : "bg-green-700 text-white shadow-md shadow-green-600/20 ring-1 ring-black/10 active:scale-[0.98]"
                                  }`}
                                >
                                  {loadingNormal || singleProductCompareLoading ? (
                                    "Haetaan..."
                                  ) : (
                                    <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                                      🔎<span>Vertailu</span>
                                    </span>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onPointerDown={(event) => event.preventDefault()}
                                  onClick={openEanModal}
                                  className="flex min-h-[2.65rem] touch-manipulation items-center justify-center rounded-[1rem] bg-green-700 px-3 text-sm font-black text-white shadow-md shadow-green-600/20 ring-1 ring-black/10 transition active:scale-[0.98]"
                                >
                                  <span className="inline-flex h-full w-full items-center justify-center gap-2 whitespace-nowrap leading-none">
                                    <svg
                                      aria-hidden="true"
                                      viewBox="0 0 24 24"
                                      className="block h-5 w-5 shrink-0 text-white"
                                      fill="currentColor"
                                    >
                                      <rect
                                        x="3"
                                        y="5"
                                        width="2"
                                        height="14"
                                        rx=".4"
                                      />
                                      <rect
                                        x="7"
                                        y="5"
                                        width="1.2"
                                        height="14"
                                        rx=".35"
                                      />
                                      <rect
                                        x="10"
                                        y="5"
                                        width="2.6"
                                        height="14"
                                        rx=".4"
                                      />
                                      <rect
                                        x="15"
                                        y="5"
                                        width="1.2"
                                        height="14"
                                        rx=".35"
                                      />
                                      <rect
                                        x="18.5"
                                        y="5"
                                        width="2.5"
                                        height="14"
                                        rx=".4"
                                      />
                                    </svg>
                                    <span className="block leading-none">
                                      EAN / SKANNAA
                                    </span>
                                  </span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <div
                          className={`${keyboardOpenV320 ? "hidden" : ""} mt-1 shrink-0 rounded-[1.35rem] bg-white/95 p-2 shadow-[0_-8px_28px_rgba(15,23,42,0.07)] ring-1 ring-slate-100`}
                        >
                          <div className="grid grid-cols-3 gap-1.5">
                            <button
                              type="button"
                              onClick={() => startVoiceInput()}
                              className={`min-h-[2.35rem] touch-manipulation rounded-[0.85rem] px-2 text-xs font-black leading-tight shadow-sm transition active:scale-[0.98] ${
                                isListening
                                  ? "bg-red-600 text-white"
                                  : speechSupported
                                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-700/10"
                                    : "bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                              }`}
                            >
                              {isListening ? "🎙️ Kuuntelee" : "🎤 Sanele"}
                            </button>
                            <button
                              type="button"
                              onClick={handleMainOfferSearch}
                              disabled={!hasSearchInput || loadingOffers}
                              aria-disabled={!hasSearchInput || loadingOffers}
                              className={`min-h-[2.35rem] touch-manipulation rounded-[0.85rem] px-2 text-xs font-black leading-tight transition ${
                                !hasSearchInput || loadingOffers
                                  ? "cursor-not-allowed bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                                  : "bg-rose-100 text-rose-700 shadow-sm ring-1 ring-rose-200 active:scale-[0.98]"
                              }`}
                            >
                              {loadingOffers ? "Haetaan..." : "🔥 Hinnanhuojennukset"}
                            </button>
                            <button
                              type="button"
                              onClick={addInputToCart}
                              disabled={!hasSearchInput}
                              aria-disabled={!hasSearchInput}
                              className={`min-h-[2.35rem] touch-manipulation rounded-[0.85rem] px-2 text-xs font-black leading-tight transition ${
                                !hasSearchInput
                                  ? "cursor-not-allowed bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                                  : "bg-white text-slate-800 shadow-sm ring-1 ring-slate-200 active:scale-[0.98]"
                              }`}
                            >
                              Lisää koriin
                            </button>
                          </div>

                          <div className="mt-1.5 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={handleMainNormalSearch}
                              disabled={
                                !hasSearchInput ||
                                loadingNormal ||
                                singleProductCompareLoading
                              }
                              aria-disabled={
                                !hasSearchInput ||
                                loadingNormal ||
                                singleProductCompareLoading
                              }
                              className={`min-h-[2.65rem] touch-manipulation rounded-[1rem] px-3 text-sm font-black transition ${
                                !hasSearchInput ||
                                loadingNormal ||
                                singleProductCompareLoading
                                  ? "cursor-not-allowed bg-slate-100 text-slate-400 ring-1 ring-slate-200"
                                  : "bg-green-700 text-white shadow-md shadow-green-600/20 ring-1 ring-black/10 active:scale-[0.98]"
                              }`}
                            >
                              {loadingNormal || singleProductCompareLoading ? (
                                "Haetaan..."
                              ) : (
                                <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
                                  🔎<span>Vertailu</span>
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={openEanModal}
                              className="flex min-h-[2.65rem] touch-manipulation items-center justify-center rounded-[1rem] bg-green-700 px-3 text-sm font-black text-white shadow-md shadow-green-600/20 ring-1 ring-black/10 transition active:scale-[0.98]"
                            >
                              <span className="inline-flex h-full w-full items-center justify-center gap-2 whitespace-nowrap leading-none">
                                <svg
                                  aria-hidden="true"
                                  viewBox="0 0 24 24"
                                  className="block h-5 w-5 shrink-0 text-white"
                                  fill="currentColor"
                                >
                                  <rect x="3" y="5" width="2" height="14" rx=".4" />
                                  <rect
                                    x="7"
                                    y="5"
                                    width="1.2"
                                    height="14"
                                    rx=".35"
                                  />
                                  <rect
                                    x="10"
                                    y="5"
                                    width="2.6"
                                    height="14"
                                    rx=".4"
                                  />
                                  <rect
                                    x="15"
                                    y="5"
                                    width="1.2"
                                    height="14"
                                    rx=".35"
                                  />
                                  <rect
                                    x="18.5"
                                    y="5"
                                    width="2.5"
                                    height="14"
                                    rx=".4"
                                  />
                                </svg>
                                <span className="block leading-none">
                                  EAN / SKANNAA
                                </span>
                              </span>
                            </button>
                          </div>
                        </div>{" "}
                      </div>
                    </div>
                  </div>
                </div>
              )}

        
    </>
  );
}

export { ZiiplyMobileSearchView };
