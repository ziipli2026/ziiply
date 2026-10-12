"use client";
import { useState } from "react";
import { parseRecipeText, scaleIngredients, ingredientSearchTerms, type RecipeDraft } from "./recipeCore";

export default function JustiinaRecipeEditor({ onSearchIngredients }: { onSearchIngredients?: (terms: string[]) => void }) {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [original, setOriginal] = useState("");
  const [target, setTarget] = useState("");
  const [notice, setNotice] = useState("");
  const importText = () => {
    if (!text.trim()) { setNotice("Liitä ensin reseptin teksti."); return; }
    const next = parseRecipeText(text);
    setDraft(next);
    setOriginal(next.servings ? String(next.servings) : "");
    setTarget(next.servings ? String(next.servings) : "");
    setNotice(next.ingredients.length ? "Tarkista ainekset ja määrät ennen hakua." : "Lisää reseptiin Ainekset:-otsikko ja ainesrivit.");
  };
  const ingredients = draft?.ingredients || [];
  const validServings = Number(original) > 0 && Number(target) > 0;
  const scaled = validServings ? scaleIngredients(ingredients, Number(original), Number(target)) : ingredients;
  const canSearch = validServings && ingredients.length > 0 && ingredients.every(x => !x.uncertain && x.name.trim() && x.amount !== null && x.unit);
  return <div className="mt-3 max-h-[55dvh] overflow-y-auto rounded-2xl border border-[#d0aa58] bg-[#fffdf5] p-3 text-left text-sm text-[#27412a]">
    <h3 className="font-black">Resepti tekstistä</h3>
    <p className="my-2 text-xs">Liitä resepti muodossa: nimi, annosmäärä, Ainekset:, ainesrivit ja Valmistus:. Kuvasta tunnistus lisätään myöhemmin.</p>
    <textarea aria-label="Reseptiteksti" value={text} onChange={e=>setText(e.target.value)} rows={4} placeholder={"Uunilohi\n4 annosta\nAinekset:\n600 g lohta\n1 tl suolaa\nValmistus:\nKypsennä uunissa."} className="w-full rounded-xl border p-2 text-sm" />
    <button type="button" onClick={importText} className="mt-2 rounded-xl bg-[#174c3a] px-4 py-2 font-bold text-white">Tuo resepti</button>
    {notice && <p role="status" className="my-2 text-xs">{notice}</p>}
    {draft && <div className="mt-3 space-y-3">
      <label className="block text-xs font-bold">Reseptin nimi<input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} className="mt-1 w-full rounded border p-2"/></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs font-bold">Alkuperäinen annosmäärä<input type="number" min="1" value={original} onChange={e=>setOriginal(e.target.value)} className="mt-1 w-full rounded border p-2"/></label>
        <label className="text-xs font-bold">Tehdään henkilölle<input type="number" min="1" value={target} onChange={e=>setTarget(e.target.value)} className="mt-1 w-full rounded border p-2"/></label>
      </div>
      {ingredients.map((item,i)=><div key={item.id} className="rounded-xl border p-2">
        <div className="grid grid-cols-[1fr_70px_65px] gap-1">
          <input aria-label={"Aines "+(i+1)} value={item.name} onChange={e=>setDraft({...draft,ingredients:ingredients.map(x=>x.id===item.id?{...x,name:e.target.value}:x)})} className="min-w-0 rounded border p-1"/>
          <input aria-label={"Määrä "+(i+1)} type="number" min="0" step="any" value={item.amount ?? ""} onChange={e=>setDraft({...draft,ingredients:ingredients.map(x=>x.id===item.id?{...x,amount:e.target.value===""?null:Number(e.target.value),uncertain:e.target.value===""}:x)})} className="min-w-0 rounded border p-1"/>
          <input aria-label={"Yksikkö "+(i+1)} value={item.unit ?? ""} onChange={e=>setDraft({...draft,ingredients:ingredients.map(x=>x.id===item.id?{...x,unit:e.target.value,uncertain:!e.target.value||x.amount===null}:x)})} className="min-w-0 rounded border p-1"/>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs"><label><input type="checkbox" checked={item.atHome} onChange={e=>setDraft({...draft,ingredients:ingredients.map(x=>x.id===item.id?{...x,atHome:e.target.checked}:x)})}/> On jo kotona</label><span>{validServings && !item.uncertain ? scaled[i].amount+" "+(item.unit||"") : "Tarkista määrä"}</span></div>
      </div>)}
      <label className="block text-xs font-bold">Valmistusohje<textarea rows={3} value={draft.instructions} onChange={e=>setDraft({...draft,instructions:e.target.value})} className="mt-1 w-full rounded border p-2"/></label>
      <button type="button" disabled={!canSearch || !onSearchIngredients} onClick={()=>onSearchIngredients?.(ingredientSearchTerms(ingredients))} className="rounded-xl bg-[#174c3a] px-4 py-2 font-black text-white disabled:opacity-40">Hae ainekset</button>
      {!onSearchIngredients && <p className="text-xs">Aineshaku kytketään seuraavassa vaiheessa nykyiseen tuotevalintaan.</p>}
    </div>}
  </div>;
}
