"use client";
import { useState } from "react";
import { parseRecipeText, scaleIngredients, type RecipeDraft } from "./recipeCore";

export default function JustiinaRecipeEditor({ onSearchIngredients }: { onSearchIngredients?: (terms: string[]) => void }) {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [original, setOriginal] = useState("");
  const [target, setTarget] = useState("");
  const [notice, setNotice] = useState("");
  const [ingredientIndex, setIngredientIndex] = useState<number | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const importText = () => {
    if (!text.trim()) { setNotice("Liitä ensin reseptin teksti."); return; }
    const next = parseRecipeText(text);
    setDraft(next);
    setDone([]);
    setIngredientIndex(null);
    setOriginal(next.servings ? String(next.servings) : "");
    setTarget(next.servings ? String(next.servings) : "");
    setNotice(next.ingredients.length ? "Tarkista ainekset ja määrät ennen hakua." : "Lisää reseptiin Ainekset:-otsikko ja ainesrivit.");
  };
  const ingredients = draft?.ingredients || [];
  const validServings = Number(original) > 0 && Number(target) > 0;
  const scaled = validServings ? scaleIngredients(ingredients, Number(original), Number(target)) : ingredients;
  const pending = scaled.filter(x => !x.atHome && x.name.trim());
  const canSearch = validServings && ingredients.length > 0 && ingredients.every(x => x.atHome || (!x.uncertain && x.name.trim() && x.amount !== null && x.unit));
  return <div className="mt-3 max-h-[55dvh] overflow-y-auto rounded-2xl border border-[#d0aa58] bg-[#fffdf5] p-3 text-left text-sm text-[#27412a]">
    <h3 className="font-black">Resepti tekstistä</h3>
    <button type="button" className="my-2 rounded-lg border px-3 py-2 text-xs" onClick={()=>setText("Uunilohi\n4 annosta\nAinekset:\n600 g lohta\n1 tl suolaa\nValmistus:\nKypsennä lohi uunissa.")}>Kokeile esimerkkireseptiä: uunilohi</button>
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
      {ingredients.map((item,i)=><div key={item.id} className="rounded-xl border p-2"><div className="mb-1 flex justify-end"><button type="button" aria-label={"Poista aines "+item.name} onClick={()=>{setIngredientIndex(null);setDraft({...draft,ingredients:ingredients.filter(x=>x.id!==item.id)});}} className="rounded border px-2 py-1 text-xs">Poista aines</button></div>
        <div className="grid grid-cols-[1fr_70px_65px] gap-1">
          <input aria-label={"Aines "+(i+1)} value={item.name} onChange={e=>setDraft({...draft,ingredients:ingredients.map(x=>x.id===item.id?{...x,name:e.target.value}:x)})} className="min-w-0 rounded border p-1"/>
          <input aria-label={"Määrä "+(i+1)} type="number" min="0" step="any" value={item.amount ?? ""} onChange={e=>setDraft({...draft,ingredients:ingredients.map(x=>x.id===item.id?{...x,amount:e.target.value===""?null:Number(e.target.value),uncertain:e.target.value===""}:x)})} className="min-w-0 rounded border p-1"/>
          <input aria-label={"Yksikkö "+(i+1)} value={item.unit ?? ""} onChange={e=>setDraft({...draft,ingredients:ingredients.map(x=>x.id===item.id?{...x,unit:e.target.value,uncertain:!e.target.value||x.amount===null}:x)})} className="min-w-0 rounded border p-1"/>
        </div>
        <div className="mt-1 flex items-center justify-between text-xs"><label><input type="checkbox" checked={item.atHome} onChange={e=>setDraft({...draft,ingredients:ingredients.map(x=>x.id===item.id?{...x,atHome:e.target.checked}:x)})}/> On jo kotona</label><span>{validServings && !item.uncertain ? scaled[i].amount+" "+(item.unit||"") : "Tarkista määrä"}</span></div>
      </div>)}
      <button type="button" onClick={()=>{setIngredientIndex(null);setDraft({...draft,ingredients:[...ingredients,{id:String(Date.now())+"-"+ingredients.length,name:"",amount:null,unit:null,uncertain:true,atHome:false}]});}} className="rounded-lg border border-[#b99d62] bg-[#fff4d6] px-3 py-2 text-xs font-bold">+ Lisää aines</button>
      <p className="text-xs">Tarkista reseptin jokainen aines. Poistettuja aineksia ei haeta.</p>
      <label className="block text-xs font-bold">Valmistusohje<textarea rows={3} value={draft.instructions} onChange={e=>setDraft({...draft,instructions:e.target.value})} className="mt-1 w-full rounded border p-2"/></label>
      <div className="rounded-xl border p-2"><p className="font-bold">Ainesten seuranta: {done.filter(id=>pending.some(x=>x.id===id)).length}/{pending.length}</p>{pending.map(x=><label key={x.id} className="block text-xs"><input type="checkbox" checked={done.includes(x.id)} onChange={e=>setDone(prev=>e.target.checked?[...prev,x.id]:prev.filter(id=>id!==x.id))}/> {x.name} ({x.amount} {x.unit})</label>)}<p className="text-xs">Merkitse käsitellyksi vasta tuotteen lisäämisen jälkeen. Tämä ei muuta ostoskoria.</p></div>
      <button type="button" disabled={!canSearch || !onSearchIngredients || pending.length===0} onClick={()=>{setIngredientIndex(0);onSearchIngredients?.([pending[0].name]);setNotice("Valitse sopiva tuote nykyisestä tuotehausta. Justiina ei lisää sitä automaattisesti.");}} className="rounded-xl bg-[#174c3a] px-4 py-2 font-black text-white disabled:opacity-40">Hae ainekset</button>
      {ingredientIndex !== null && pending.length > 0 && <div className="mt-2 rounded-xl border border-[#b99d62] bg-[#fff4d6] p-2">
        <p className="font-black">Aines {Math.min(ingredientIndex+1,pending.length)} / {pending.length}</p>
        <p>Tarvitset: {pending[Math.min(ingredientIndex,pending.length-1)].name} · {pending[Math.min(ingredientIndex,pending.length-1)].amount} {pending[Math.min(ingredientIndex,pending.length-1)].unit}</p>
        <p className="text-xs">Valitse tuote tavallisesta hakutuloksesta ja lisää se koriin itse. Jatka seuraavaan aineeseen vasta sen jälkeen.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button type="button" disabled={ingredientIndex===0} onClick={()=>{const i=Math.max(0,ingredientIndex-1);setIngredientIndex(i);onSearchIngredients?.([pending[i].name]);}} className="rounded-lg border px-3 py-1 disabled:opacity-40">Edellinen</button>
          <button type="button" onClick={()=>{const i=ingredientIndex+1;if(i>=pending.length){setIngredientIndex(null);setNotice("Aineslista käsitelty. Tarkista ostoskori.");}else{setIngredientIndex(i);onSearchIngredients?.([pending[i].name]);}}} className="rounded-lg bg-[#174c3a] px-3 py-1 font-bold text-white">{ingredientIndex+1===pending.length?"Valmis":"Seuraava aines / ohita"}</button>
          <button type="button" onClick={()=>setIngredientIndex(null)} className="rounded-lg border px-3 py-1">Keskeytä</button>
        </div>
      </div>}
      {!onSearchIngredients && <p className="text-xs">Aineshaku kytketään seuraavassa vaiheessa nykyiseen tuotevalintaan.</p>}
    </div>}
  </div>;
}
