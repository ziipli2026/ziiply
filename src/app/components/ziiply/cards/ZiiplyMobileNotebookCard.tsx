"use client";

// ZIIPLY_MOBILE_NOTEBOOK_CARD_V4_FIT_ABOVE_BOTTOM_NAV_AND_HEADER_RIGHT
// Ostelusvihko-näkymä tallennetuille ostoslistoille.
// - Avaa CartCardin vasemman yläkulman vihko-symbolista tai Hae-kortin Ostelusvihko-painikkeesta.
// - Listat näytetään vanhan kauppiaan vihkon riveinä.
// - Ei modernia listamodaalia: sama paperi/nahka/retro-linja kuin Tavarainkeruu-kortissa.
// - Vasen yläkulma: nahkainen takaisin-nuoli.
// - Oikea yläkulma: sulje.
// - Alareuna: tallenna nykyinen kori.
// - Riviltä voi avata listan koriin. Pieni poistomerkki poistaa tallennetun listan.

import React, { useEffect, useMemo, useState } from "react";
import { parseRecipeText, scaleIngredients, classifyRecipeIngredient } from "../justiina/recipeCore";
import { readArvoPreferences } from "../ArvoSettingsPanel";
import { correctSearchQuery } from "../search/searchIntentAI";

export type ZiiplyNotebookItem = {
  id?: string | number;
  ean?: string | number;
  name?: string;
  title?: string;
  productName?: string;
  brandName?: string;
  quantity?: number;
  amount?: number;
  price?: number | string;
  [key: string]: any;
};

export type ZiiplySavedShoppingList = {
  id: string;
  name?: string;
  title?: string;
  createdAt?: string | number | Date;
  updatedAt?: string | number | Date;
  items?: ZiiplyNotebookItem[];
  totalPrice?: number;
  itemCount?: number;
  [key: string]: any;
};

export type ZiiplyMobileNotebookCardProps = {
  open?: boolean;
  lists?: ZiiplySavedShoppingList[];
  currentCartItems?: ZiiplyNotebookItem[];
  onBack?: () => void;
  onClose?: () => void;
  onSaveCurrentCart?: (name?: string) => void;
  onOpenList?: (list: ZiiplySavedShoppingList) => void;
  onDeleteList?: (list: ZiiplySavedShoppingList) => void;
  onSearchIngredients?: (terms: string[]) => void;
  className?: string;
};

type SavedRecipe = { id: string; title: string; ingredients: string; instructions: string; sourceText?: string; servings?: number | null };
const RECIPE_STORAGE = "ziiply-desktop-vihkonen-recipes-v1";
function readRecipes(): SavedRecipe[] {
  try { const entries = JSON.parse(localStorage.getItem(RECIPE_STORAGE) || "[]"); return Array.isArray(entries) ? entries : []; }
  catch { return []; }
}
function recipeText(recipe: SavedRecipe) {
  return recipe.sourceText || [recipe.title, recipe.servings ? recipe.servings + " annosta" : "", "Ainekset:", recipe.ingredients, "Valmistus:", recipe.instructions].filter(Boolean).join("\\n");
}
const cooperFont = '"Cooper Black", "Cooper Std Black", Georgia, serif';
const copperplateFont = '"Copperplate", "Baskerville", Georgia, serif';
const serifFont = '"Baskerville", Georgia, serif';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDate(value: unknown) {
  if (!value) return "ei päiväystä";

  const date = value instanceof Date ? value : new Date(value as any);
  if (Number.isNaN(date.getTime())) return "ei päiväystä";

  return date.toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

function formatDateForName(date = new Date()) {
  return date.toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

function getOstelusvihkoDefaultName(lists: ZiiplySavedShoppingList[]) {
  const today = formatDateForName();
  const todaySuffix = `Ostelusvihko ${today}`;

  const todayCount = lists.filter((list) => {
    const name = String(list.name || list.title || "");
    return name.includes(todaySuffix);
  }).length;

  // Juokseva numero nollautuu luonnostaan, kun päivä vaihtuu tai kaikki kyseisen päivän vihkot poistetaan.
  return `${todayCount + 1}. ${todaySuffix}`;
}

function normalizePrice(price: unknown) {
  if (typeof price === "number" && Number.isFinite(price)) {
    const euros = Math.abs(price) > 20 ? price / 100 : price;
    return `${euros.toLocaleString("fi-FI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} €`;
  }

  const text = String(price ?? "").trim();
  if (!text) return "";

  const numeric = Number(text.replace(/\s/g, "").replace("€", "").replace(",", "."));
  if (Number.isFinite(numeric)) {
    const euros = Math.abs(numeric) > 20 ? numeric / 100 : numeric;
    return `${euros.toLocaleString("fi-FI", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} €`;
  }

  return text.includes("€") ? text : `${text} €`;
}

function getItemName(item: ZiiplyNotebookItem) {
  return String(item.name || item.title || item.productName || item.brandName || "Tuote");
}

function getItemQuantity(item: ZiiplyNotebookItem) {
  const quantity = Number(item.quantity ?? item.amount ?? 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
}

function getListTitle(list: ZiiplySavedShoppingList, index: number) {
  return String(list.name || list.title || `Ostoslista ${index + 1}`);
}

function getListItemCount(list: ZiiplySavedShoppingList) {
  const explicitCount = Number(list.itemCount);
  if (Number.isFinite(explicitCount) && explicitCount >= 0) return explicitCount;

  return Array.isArray(list.items) ? list.items.length : 0;
}

function getListPreview(list: ZiiplySavedShoppingList) {
  const items = Array.isArray(list.items) ? list.items : [];
  if (!items.length) return "Ei tuotteita";

  return items
    .slice(0, 3)
    .map((item) => {
      const quantity = getItemQuantity(item);
      return `${getItemName(item)}${quantity > 1 ? ` × ${quantity}` : ""}`;
    })
    .join(" · ");
}

function LeatherBackButton({ onClick }: { onClick?: () => void }) {
  if (!onClick) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-[0.78rem] top-[0.88rem] z-[35] grid h-[2.62rem] w-[2.86rem] place-items-center rounded-l-[0.42rem] rounded-r-[0.8rem] border-[2px] border-[#2b1a0e] bg-[linear-gradient(225deg,#7a4c2d_0%,#3b2414_78%)] text-[#f7e7bd] shadow-[0_3px_8px_rgba(0,0,0,0.25),inset_0_0_0_1px_rgba(255,214,139,0.18)] active:translate-y-[1px]"
      aria-label="Takaisin"
      title="Takaisin"
    >
      <span className="grid h-[1.50rem] w-[1.50rem] place-items-center rounded-full border border-[#6b421f] bg-[radial-gradient(circle_at_35%_35%,#f6c46c_0%,#b0752a_52%,#65401f_100%)] text-[1.02rem] text-[#2b1a0e] shadow-[0_1px_2px_rgba(0,0,0,0.28)]">
        ←
      </span>
    </button>
  );
}

export default function ZiiplyMobileNotebookCard({
  open = true,
  lists = [],
  currentCartItems = [],
  onBack,
  onClose,
  onSaveCurrentCart,
  onOpenList,
  onDeleteList,
  onSearchIngredients,
  className = "",
}: ZiiplyMobileNotebookCardProps) {
  if (!open) return null;

  const [page, setPage] = useState<"lists" | "recipes">("lists");
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [recipeFilter, setRecipeFilter] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<SavedRecipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState(false);
  const [recipeDraft, setRecipeDraft] = useState("");
  const [deleteRecipe, setDeleteRecipe] = useState<SavedRecipe | null>(null);
  const [recipeError, setRecipeError] = useState("");
  const searchRecipe = (recipe: SavedRecipe) => {
                  const draft = parseRecipeText(recipeText(recipe));
                  const preferences = readArvoPreferences();
                  const servings = draft.servings || recipe.servings || preferences.householdSize;
                  const ingredients = (draft.servings && servings !== draft.servings ? scaleIngredients(draft.ingredients, draft.servings, servings) : draft.ingredients).filter(item => !item.atHome && item.name.trim());
                  if (!ingredients.length) { setRecipeError("Reseptistä ei löytynyt haettavia aineksia."); return; }
                  if (!(servings > 0) || ingredients.some(item => item.uncertain || !item.amount || !item.unit)) {
                    setRecipeError("Tarkista reseptin annosmäärä ja ainesmäärät ennen hakua."); return;
                  }
                  const classified = ingredients.map(item => classifyRecipeIngredient(item.name));
                  if (classified.some(group => !group)) { setRecipeError("Tarkista tunnistamattomat ruoka-aineryhmät Justiinan reseptieditorissa."); return; }
                  setRecipeError("");
                  try { sessionStorage.setItem("ziiply-justiina-active-ingredients-v1", JSON.stringify({title:draft.title, servings, items:ingredients})); } catch {}
                  onSearchIngredients?.(classified.map(group => correctSearchQuery(group!.searchTerm)));
  };
  const openRecipe = (recipe: SavedRecipe, edit = false) => {
    setSelectedRecipe(recipe); setRecipeDraft(recipeText(recipe)); setEditingRecipe(edit); setRecipeError("");
  };
  useEffect(() => {
    const refresh = () => setRecipes(readRecipes());
    refresh();
    window.addEventListener("ziiply-vihkonen-recipes-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => { window.removeEventListener("ziiply-vihkonen-recipes-changed", refresh); window.removeEventListener("storage", refresh); };
  }, []);
  const hasCurrentCartItems = currentCartItems.length > 0;
  const hasLists = lists.length > 0;
  const defaultSaveName = useMemo(() => getOstelusvihkoDefaultName(lists), [lists]);
  const [savePanelOpen, setSavePanelOpen] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [pendingDeleteList, setPendingDeleteList] = useState<ZiiplySavedShoppingList | null>(null);

  const effectiveDraftName = draftName.trim() || defaultSaveName;

  function handleSaveClick() {
    if (!hasCurrentCartItems || !onSaveCurrentCart) return;

    if (!savePanelOpen) {
      setDraftName(defaultSaveName);
      setSavePanelOpen(true);
      return;
    }

    onSaveCurrentCart(effectiveDraftName);
    setDraftName("");
    setSavePanelOpen(false);
  }

  return (
    <div
      className={`fixed inset-0 z-[93] flex items-start justify-center bg-[#eef7f2]/98 px-2 pb-[calc(env(safe-area-inset-bottom)+1.05rem)] pt-[calc(env(safe-area-inset-top)+0.45rem)] backdrop-blur-md sm:hidden ${className}`}
    >
      <section className="ziiply-notebook-pop relative flex h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-7.15rem)] max-h-[41.8rem] min-h-[29rem] w-full max-w-[28rem] flex-col overflow-hidden rounded-[2.1rem] border-[5px] border-[#3b2414] bg-[linear-gradient(135deg,#2a170e_0%,#5a3720_45%,#2a170e_100%)] shadow-[0_12px_0_rgba(35,23,13,0.28),0_24px_52px_rgba(0,0,0,0.30)]">
        <div
          className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[#f7edcf] bg-center bg-no-repeat opacity-100"
          style={{
            backgroundImage: "url('/ui/cart/vihkonen.webp')",
            backgroundSize: "142% 104%",
            backgroundPosition: "center top",
          }}
        />
        <div className="pointer-events-none absolute inset-[0.18rem] rounded-[1.82rem] bg-[linear-gradient(180deg,rgba(255,250,226,0.42),rgba(246,226,172,0.18)_34%,rgba(238,214,156,0.08))]" />
        <div className="pointer-events-none absolute inset-[0.42rem] rounded-[1.55rem] border border-dashed border-[#d6a861]/55 shadow-[inset_0_0_0_2px_rgba(27,17,9,0.20)]" />

        <LeatherBackButton onClick={onBack} />

        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-[0.78rem] top-[0.88rem] z-[35] grid h-[2.62rem] w-[2.86rem] place-items-center rounded-l-[0.8rem] rounded-r-[0.42rem] border-[2px] border-[#2b1a0e] bg-[linear-gradient(225deg,#7a4c2d_0%,#3b2414_78%)] text-[1.1rem] font-black leading-none text-[#f7e7bd] shadow-[0_3px_8px_rgba(0,0,0,0.25),inset_0_0_0_1px_rgba(255,214,139,0.18)] active:translate-y-[1px]"
            aria-label="Sulje ostelusvihko"
            title="Sulje ostelusvihko"
          >
            <span className="grid h-[1.50rem] w-[1.50rem] place-items-center rounded-full border border-[#6b421f] bg-[radial-gradient(circle_at_35%_35%,#f6c46c_0%,#b0752a_52%,#65401f_100%)] text-[0.92rem] text-[#2b1a0e] shadow-[0_1px_2px_rgba(0,0,0,0.28)]">
              ×
            </span>
          </button>
        ) : null}

        <header className="relative z-10 shrink-0 px-5 pb-1 pt-[8.35rem]">
          <div className="pl-[3.15rem] pr-[2.20rem]">
            <div
              className="text-[1.48rem] font-black italic leading-none text-[#28402a] drop-shadow-[0_1px_0_rgba(255,247,211,0.62)]"
              style={{ fontFamily: cooperFont }}
            >
              {page === "lists" ? "Ostelusvihko" : "Reseptit"}
            </div>
            <div className="mt-[0.16rem] text-[0.74rem] font-extrabold text-[#5f5034]">
              {page === "lists" ? "Tallennetut ostelusvihkot" : "Omat tallennetut reseptit"}
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(["lists", "recipes"] as const).map(tab => <button key={tab} type="button" onClick={() => { setPage(tab); setSelectedRecipe(null); setEditingRecipe(false); }} aria-pressed={page === tab} className={`rounded-lg border-2 border-[#795b2c] px-2 py-2 text-xs font-black ${page === tab ? "bg-[#285039] text-[#fff5d8]" : "bg-[#f6e3b8] text-[#49361e]"}`}>{tab === "lists" ? "Ostosvihko" : "Reseptit"}</button>)}
          </div>
        </header>

        <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-5 pb-[7.85rem] pt-[1.10rem] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {page === "recipes" ? (
            <div className="space-y-2">
              <input value={recipeFilter} onChange={event => setRecipeFilter(event.target.value)} aria-label="Hae tallennettuja reseptejä" placeholder="Hae reseptiä..." className="w-full rounded-lg border border-[#9a7a3d] bg-[#fff9e9] px-3 py-2 text-sm" />
              {recipes.filter(recipe => recipe.title.toLocaleLowerCase("fi-FI").includes(recipeFilter.toLocaleLowerCase("fi-FI"))).map(recipe => (
                <article key={recipe.id} className="flex items-center gap-2 rounded-xl border-2 border-[#9a7a3d] bg-[#fff4d8]/80 p-2">
                  <button type="button" onClick={() => openRecipe(recipe)} className="min-w-0 flex-1 break-words py-2 text-left text-[clamp(12px,3.2vw,16px)] font-bold leading-snug text-[#28402a] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">{recipe.title}</button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button type="button" onClick={() => searchRecipe(recipe)} aria-label={`Hae reseptin ${recipe.title} ainekset ostoskoriin`} title="Hae ainekset ostoskoriin" className="grid h-9 w-9 place-items-center rounded-lg border border-[#6b8b61] bg-[#edf3df] text-lg">🛒</button>
                    <button type="button" onClick={() => openRecipe(recipe, true)} aria-label={`Muokkaa reseptiä ${recipe.title}`} title="Muokkaa reseptiä" className="grid h-9 w-9 place-items-center rounded-lg border border-[#9a7a3d] bg-[#fff7dd] text-lg">✎</button>
                    <button type="button" onClick={() => setDeleteRecipe(recipe)} aria-label={`Poista ${recipe.title}`} title="Poista resepti" className="grid h-9 w-9 place-items-center rounded-lg border border-[#bca04c] bg-[#fff2b8] text-lg">🧽</button>
                  </div>
                </article>
              ))}
              {recipeError && !selectedRecipe && <p role="alert" className="rounded-lg bg-[#fff2d8] p-2 text-xs font-bold text-[#8b3c27]">{recipeError}</p>}
              {!recipes.length && <p className="py-6 text-center text-sm font-bold text-[#665338]">Ei vielä tallennettuja reseptejä.</p>}
              {selectedRecipe && <div className="rounded-xl border-2 border-[#9a7a3d] bg-[#fff9e9] p-3">
                <div className="mb-2 flex items-center justify-between gap-2"><strong className="text-[#28402a]">{selectedRecipe.title}</strong><button type="button" onClick={() => setSelectedRecipe(null)} aria-label="Sulje resepti">✕</button></div>
                {editingRecipe ? <textarea rows={9} className="w-full rounded-lg border p-2 text-sm" value={recipeDraft} onChange={event => setRecipeDraft(event.target.value)} /> : <div className="whitespace-pre-wrap text-sm">{recipeText(selectedRecipe)}</div>}
                {!editingRecipe && <button type="button" className="mb-2 w-full rounded-lg bg-[#285039] px-3 py-3 text-sm font-black text-white" onClick={() => {
                  searchRecipe(selectedRecipe);
                }}>Hae ainekset ostoskoriin</button>}
                {recipeError && <p role="alert" className="mb-2 text-xs font-bold text-[#8b3c27]">{recipeError}</p>}
                <div className="mt-3 flex gap-2">
                  <button type="button" className="flex-1 rounded-lg bg-[#285039] px-3 py-2 text-sm font-bold text-white" onClick={() => {
                    if (!editingRecipe) { setEditingRecipe(true); return; }
                    const source = recipeDraft.trim(); if (!source) return;
                    const lines = source.split(/\\r?\\n/); const title = lines.find(line => line.trim())?.trim() || selectedRecipe.title;
                    const updated = { ...selectedRecipe, title, sourceText: source };
                    const next = readRecipes().map(item => item.id === selectedRecipe.id ? updated : item);
                    localStorage.setItem(RECIPE_STORAGE, JSON.stringify(next)); setRecipes(next); setSelectedRecipe(updated); setEditingRecipe(false);
                    window.dispatchEvent(new Event("ziiply-vihkonen-recipes-changed"));
                  }}>{editingRecipe ? "Tallenna" : "Muokkaa"}</button>
                  {editingRecipe && <button type="button" className="rounded-lg border px-3 py-2 text-sm" onClick={() => setEditingRecipe(false)}>Peru</button>}
                </div>
              </div>}
            </div>
          ) : !hasLists ? (
            <div className="mt-2 rounded-[1.05rem] border-[2px] border-dashed border-[#9a7a3d] bg-[#fff4d4]/52 px-4 py-8 text-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
              <div className="text-[1.02rem] font-extrabold italic text-[#59401e]" style={{ fontFamily: serifFont }}>
                Ostelusvihko on vielä tyhjä
              </div>
              <div className="mt-2 text-[0.78rem] font-extrabold leading-snug text-[#8a7650]">
                Tallenna nykyinen kori, niin löydät sen myöhemmin tästä.
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {lists.map((list, index) => {
                const title = getListTitle(list, index);
                const count = getListItemCount(list);
                const total = normalizePrice(list.totalPrice);
                const date = formatDate(list.updatedAt || list.createdAt);
                const preview = getListPreview(list);

                return (
                  <article
                    key={String(list.id || index)}
                    className="relative overflow-hidden rounded-[1.05rem] border-[2px] border-[#7c663d]/78 bg-[#fff4d8]/76 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.30),0_6px_14px_rgba(72,51,22,0.10)]"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenList?.(list)}
                      className="block w-full px-3 py-2.5 pr-[3.1rem] text-left active:translate-y-[1px]"
                      aria-label={`Avaa ${title}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className="mt-[0.1rem] grid h-[2.15rem] w-[2.0rem] shrink-0 place-items-center rounded-b-[0.36rem] rounded-t-[0.22rem] border-[1.5px] border-[#7b5c2a] bg-[linear-gradient(180deg,#f5dfac_0%,#d6ad66_100%)] text-[1.0rem] text-[#604017] shadow-[0_2px_3px_rgba(50,31,13,0.18),inset_0_0_0_1px_rgba(255,250,224,0.42)]">
                          ☷
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[0.92rem] font-black leading-tight text-[#233020]">
                            {title}
                          </div>

                          <div className="mt-0.5 text-[0.56rem] font-black uppercase tracking-[0.08em] text-[#6e6d55]">
                            {date} · {count} tuotetta{total ? ` · ${total}` : ""}
                          </div>

                          <div className="mt-1 truncate text-[0.68rem] font-extrabold italic text-[#6b6048]" style={{ fontFamily: serifFont }}>
                            {preview}
                          </div>
                        </div>
                      </div>
                    </button>

                    {onDeleteList ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPendingDeleteList(list);
                        }}
                        className="absolute right-[0.56rem] top-1/2 grid h-[2.0rem] w-[2.0rem] -translate-y-1/2 place-items-center rounded-[0.45rem] border-[1.5px] border-[#8b3c27] bg-[#f3d4a1]/80 text-[0.82rem] font-black text-[#8d2718] shadow-[inset_0_0_0_1px_rgba(255,250,224,0.35)] active:translate-y-[calc(-50%+1px)]"
                        aria-label={`Poista ${title}`}
                        title="Poista lista"
                      >
                        ⌫
                      </button>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </main>

        {page === "lists" && <footer className="absolute bottom-[0.86rem] left-0 right-0 z-[40] px-5 pb-2 pt-2">
          <div className="relative min-h-[2.65rem]">
            {savePanelOpen ? (
              <div className="mx-auto max-w-[20rem] rounded-[0.82rem] border-[2px] border-[#8a6b32] bg-[#fff4d4]/90 px-3 py-2 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.46),0_4px_10px_rgba(62,43,20,0.16)]">
                <label
                  className="mb-1 block text-[0.54rem] font-black uppercase tracking-[0.12em] text-[#6e5a34]"
                  style={{ fontFamily: copperplateFont }}
                >
                  Vihkon nimi
                </label>

                <input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  placeholder={defaultSaveName}
                  className="block h-[2.05rem] w-full rounded-[0.48rem] border-[1.5px] border-[#b59654] bg-[#fffaf0] px-2 text-center text-[0.82rem] font-black italic text-[#244525] outline-none"
                  style={{ fontFamily: serifFont }}
                />

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSavePanelOpen(false);
                      setDraftName("");
                    }}
                    className="rounded-[0.50rem] border-[2px] border-[#7c663d] bg-[#efe1bd] px-3 py-[0.38rem] text-[0.68rem] font-black text-[#533819] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.42)] active:translate-y-[1px]"
                    style={{ fontFamily: cooperFont }}
                  >
                    Peru
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveClick}
                    className="rounded-[0.50rem] border-[2px] border-[#496443] bg-[linear-gradient(180deg,#f3e8cc_0%,#dfcfaa_100%)] px-3 py-[0.38rem] text-[0.68rem] font-black italic text-[#244525] shadow-[inset_0_0_0_1px_rgba(255,250,224,0.58)] active:translate-y-[1px]"
                    style={{ fontFamily: cooperFont }}
                  >
                    Tallenna
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSaveClick}
                disabled={!hasCurrentCartItems || !onSaveCurrentCart}
                className={cx(
                  "mx-auto block min-h-[2.34rem] rounded-[0.62rem] border-[2.5px] border-[#496443] bg-[linear-gradient(180deg,#f3e8cc_0%,#dfcfaa_100%)] px-5 py-[0.38rem] text-[0.80rem] font-black italic tracking-[0.03em] text-[#244525] shadow-[inset_0_0_0_1px_rgba(255,250,224,0.58),0_2px_4px_rgba(62,43,20,0.18)] active:translate-y-[1px]",
                  (!hasCurrentCartItems || !onSaveCurrentCart) && "cursor-not-allowed border-[#9b8d63] text-[#7a704e] opacity-70",
                )}
                style={{ fontFamily: cooperFont }}
              >
                {hasCurrentCartItems ? "Tallenna nykyinen kori" : "Kori tyhjä"}
              </button>
            )}
          </div>
        </footer>}

        <div className="pointer-events-none absolute -bottom-[0.72rem] left-[1.1rem] right-[1.1rem] h-[1.3rem] rounded-[50%] bg-[#cfaa61] opacity-55 blur-[1px]" />

        {deleteRecipe && <div className="absolute inset-0 z-[101] flex items-center justify-center bg-[#241b11]/65 px-4" role="dialog" aria-modal="true">
          <div className="w-full rounded-xl bg-[#fff4d8] p-5"><strong>Poistetaanko resepti {deleteRecipe.title}?</strong><div className="mt-4 flex gap-2">
            <button type="button" className="flex-1 rounded-lg border p-3" onClick={() => setDeleteRecipe(null)}>Peruuta</button>
            <button type="button" className="flex-1 rounded-lg bg-[#8b3c27] p-3 text-white" onClick={() => {
              const next = readRecipes().filter(item => item.id !== deleteRecipe.id);
              localStorage.setItem(RECIPE_STORAGE, JSON.stringify(next)); setRecipes(next); setSelectedRecipe(null); setDeleteRecipe(null);
              window.dispatchEvent(new Event("ziiply-vihkonen-recipes-changed"));
            }}>Poista</button>
          </div></div></div>}
        {pendingDeleteList && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#241b11]/65 px-4" role="dialog" aria-modal="true" aria-labelledby="delete-saved-list-title">
            <div className="w-full max-w-[23rem] rounded-[1.35rem] border-[3px] border-[#886635] bg-[#fff4d8] p-5 text-[#214b33] shadow-[0_12px_35px_rgba(28,19,8,0.35),inset_0_0_0_2px_#fff9e8]">
              <h2 id="delete-saved-list-title" className="text-center text-[1.3rem] font-black" style={{ fontFamily: cooperFont }}>Poistetaanko ostoslista?</h2>
              <p className="mt-3 text-center text-[0.92rem] font-bold text-[#655235]">{String(pendingDeleteList.name || pendingDeleteList.title || "Tallennettu lista")} ({getListItemCount(pendingDeleteList)} tuotetta). Tätä ei voi perua.</p>
              <div className="mt-5 flex gap-3">
                <button type="button" autoFocus onClick={() => setPendingDeleteList(null)} className="min-h-[2.9rem] flex-1 rounded-[0.75rem] border-2 border-[#8b713e] bg-[#fff9e8] font-black text-[#214b33]">Peruuta</button>
                <button type="button" onClick={() => { onDeleteList?.(pendingDeleteList); setPendingDeleteList(null); }} className="min-h-[2.9rem] flex-1 rounded-[0.75rem] border-2 border-[#74442c] bg-[linear-gradient(180deg,#e8b888,#c88958)] font-black text-[#422819]">Poista</button>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes ziiplyNotebookPop {
            0% {
              opacity: 0;
              transform: translateY(18px) scale(0.965) rotate(-0.4deg);
            }
            58% {
              opacity: 1;
              transform: translateY(-3px) scale(1.01) rotate(0.2deg);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1) rotate(0deg);
            }
          }

          .ziiply-notebook-pop {
            animation: ziiplyNotebookPop 420ms cubic-bezier(0.2, 0.9, 0.25, 1.2);
          }
        `}</style>
      </section>
    </div>
  );
}

export { ZiiplyMobileNotebookCard };
