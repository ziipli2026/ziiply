"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { parseRecipeText, scaleIngredients, classifyRecipeIngredient, type RecipeDraft } from "./recipeCore";
import { correctSearchQuery } from "../search/searchIntentAI";

const STORAGE = "ziiply-justiina-recipe-draft-v1";
const EXAMPLE = "Uunilohi\n4 annosta\nAinekset:\n600 g lohta\n1 tl suolaa\nValmistus:\nKypsennä lohi uunissa.";
export default function JustiinaRecipeEditor({onSearchIngredients}:{onSearchIngredients?:(terms:string[])=>void}){
  const [draft,setDraft]=useState<RecipeDraft|null>(null);
  const [text,setText]=useState("");
  const [original,setOriginal]=useState("");
  const [target,setTarget]=useState("");
  const [editing,setEditing]=useState(false);
  const [importing,setImporting]=useState(false);
  const [savedRecipeId,setSavedRecipeId]=useState<string|null>(null);
  const [notice,setNotice]=useState("");
  const [hydrated,setHydrated]=useState(false);
  useEffect(()=>{try{
    const saved=JSON.parse(sessionStorage.getItem(STORAGE)||"null");
    if(saved?.draft&&Array.isArray(saved.draft.ingredients)){
      setDraft(saved.draft);setText(String(saved.text||""));
      setOriginal(String(saved.original||saved.draft.servings||""));setTarget(String(saved.target||saved.draft.servings||""));
    }
  }catch{}setHydrated(true)},[]);
  const persist=(next:RecipeDraft|null=draft,source=text,base=original,people=target)=>{
    try{sessionStorage.setItem(STORAGE,JSON.stringify({draft:next,text:source,original:base,target:people}))}catch{}
  };
  useEffect(()=>{if(hydrated)persist()},[hydrated,draft,text,original,target]);
  useEffect(()=>{const onSelect=(event:Event)=>{const detail=(event as CustomEvent<{id?:string;title?:string;ingredients?:string;instructions?:string}>).detail;if(!detail)return;const source=[detail.title||"Resepti","4 annosta","Ainekset:",detail.ingredients||"","Valmistus:",detail.instructions||""].join("\n");load(source);setSavedRecipeId(detail.id||null)};window.addEventListener("ziiply-vihkonen-recipe-select",onSelect);return()=>window.removeEventListener("ziiply-vihkonen-recipe-select",onSelect)},[]);
  const saveToNotebook=(asNew:boolean)=>{if(!draft)return;const key="ziiply-desktop-vihkonen-recipes-v1";try{const existing=JSON.parse(localStorage.getItem(key)||"[]");const recipes=Array.isArray(existing)?existing:[];const id=!asNew&&savedRecipeId?savedRecipeId:String(Date.now());const recipe={id,title:draft.title,ingredients:draft.ingredients.map(item=>[item.amount,item.unit,item.name].filter(value=>value!==null&&value!=="").join(" ")).join("\n"),instructions:draft.instructions,createdAt:new Date().toISOString()};localStorage.setItem(key,JSON.stringify([recipe,...recipes.filter((item:{id:string})=>item.id!==id)]));setSavedRecipeId(id);setNotice(asNew?"Tallennettu uutena Vihkoseen.":"Resepti tallennettu Vihkoseen.");window.dispatchEvent(new Event("ziiply-vihkonen-recipes-changed"));setEditing(false)}catch{setNotice("Reseptin tallennus epäonnistui.")}};
  const load=(source:string)=>{
    const next=parseRecipeText(source);const people=next.servings?String(next.servings):"";
    setSavedRecipeId(null);setText(source);setDraft(next);setOriginal(people);setTarget(people);setEditing(false);setImporting(false);
    setNotice(next.ingredients.length?"":"Ainesrivejä ei löytynyt. Lisää Ainekset:-otsikko tai muokkaa aineksia.");
    persist(next,source,people,people);return next;
  };
  const startSearch=(recipe:RecipeDraft|null=draft,base=original,people=target)=>{
    if(!recipe||!onSearchIngredients)return;
    if(!(Number(base)>0&&Number(people)>0)){setNotice("Anna alkuperäinen annosmäärä ja henkilömäärä ennen hakua.");setEditing(true);return}
    const items=scaleIngredients(recipe.ingredients,Number(base),Number(people)).filter(item=>!item.atHome&&item.name.trim());
    if(!items.length){setNotice("Ei haettavia aineksia. Kaikki ovat kotona tai lista on tyhjä.");return}
    if(items.some(item=>item.uncertain||item.amount===null||!Number.isFinite(item.amount)||item.amount<=0||!item.unit)){
      setNotice("Tarkista epäselvät ainesmäärät ennen hakua.");setEditing(true);return;
    }
    const classified = items.map(item => classifyRecipeIngredient(item.name));
    const unknown = items.filter((_, index) => !classified[index]);
    if (unknown.length) {
      setNotice("Tarkista ruoka-aineen ryhmä ennen hakua: " + unknown.map(item => item.name).join(", "));
      setEditing(true);
      return;
    }
    persist(recipe,recipe===draft?text:EXAMPLE,base,people);
    try{sessionStorage.setItem("ziiply-justiina-active-ingredients-v1",JSON.stringify({title:recipe.title,servings:Number(people),items}))}catch{}
    onSearchIngredients(classified.map(group=>correctSearchQuery(group!.searchTerm)));
  };
  const ingredients=draft?.ingredients||[];
  const scaled=Number(original)>0&&Number(target)>0?scaleIngredients(ingredients,Number(original),Number(target)):ingredients;
  const update=(id:string,patch:Partial<RecipeDraft["ingredients"][number]>)=>{
    if(!draft)return;setDraft({...draft,ingredients:ingredients.map(item=>{
      if(item.id!==id)return item;const next={...item,...patch};
      return {...next,uncertain:!next.name.trim()||next.amount===null||!Number.isFinite(next.amount)||next.amount<=0||!next.unit?.trim()};
    })});
  };
  return <section aria-label="Justiinan resepti" className="mt-2 w-full max-w-[270px] min-w-0 shrink-0 rounded-xl border border-[#d0aa58] bg-[#fffdf5] p-2 text-left text-sm text-[#27412a]">
    {!draft?<div className="space-y-2"><p className="font-black">Reseptistä ostoksille</p>
      <button type="button" disabled={!onSearchIngredients} onClick={()=>{const next=load(EXAMPLE);startSearch(next,"4","4")}} className="w-full rounded-xl bg-[#174c3a] px-3 py-3 font-black text-white disabled:opacity-40">Uunilohi · 4 henkilölle — Hae ainekset</button>
      <button type="button" onClick={()=>{load(EXAMPLE)}} className="mr-3 text-xs font-bold underline">Katso tai muokkaa uunilohta</button>
      <button type="button" onClick={()=>setImporting(value=>!value)} className="text-xs font-bold underline">Liitä oma resepti</button>
    </div>:<div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] items-start gap-1.5">
      <div className="min-w-0 space-y-1.5">
        <strong className="block text-center text-base leading-tight">{draft.title}</strong>
        <div className="flex flex-wrap items-center justify-center gap-1>
          <label className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs"><input aria-label="Henkilömäärä" type="number" min="1" value={target} onChange={event=>setTarget(event.target.value)} className="w-10 rounded border p-0.5"/> hlö</label>
          <button type="button" disabled={!onSearchIngredients} onClick={()=>startSearch()} className="rounded-lg bg-[#174c3a] px-2 py-1 text-xs font-bold text-white disabled:opacity-40">Hae</button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-1 text-[11px] font-bold">
          <button type="button" aria-expanded={editing} onClick={()=>{setEditing(value=>!value);setImporting(false)}} className="rounded-lg border border-[#b89959] bg-[#f7eed8] px-1.5 py-1 text-[#27412a] hover:bg-[#ecdfc0]">{editing?"Sulje":"✎ Muokkaa"}</button>
          <button type="button" onClick={()=>{setEditing(false);window.dispatchEvent(new Event("ziiply-open-recipe-notebook"))}} className="rounded-lg border border-[#b89959] bg-[#f7eed8] px-2.5 py-1.5 text-[#27412a] hover:bg-[#ecdfc0]">↻ Vaihda</button>
        </div>
      </div>
      <div className="min-w-0 border-l border-[#d0aa58] pl-3 text-xs leading-relaxed ">{scaled.filter(item=>!item.atHome).map(item=>[item.amount,item.unit,item.name].filter(value=>value!==null&&value!=="").join(" ")).join(" · ")}</div>
    </div>}
    {notice&&<p role="status" className="mt-2 text-xs font-bold">{notice}</p>}
    {hydrated && typeof document !== "undefined" && (importing||editing) && createPortal(<div className="fixed left-1/2 top-3 z-[9999] w-[min(520px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-y-auto -translate-x-1/2 rounded-2xl border-2 border-[#b89959] bg-[#fffdf5] p-3 text-[#27412a] shadow-2xl">
      <div className="mb-2 flex items-center justify-between gap-2"><strong className="text-sm">{editing?"Muokkaa reseptiä":importing?"Vaihda resepti":"Valmistusohje"}</strong><button type="button" onClick={()=>{setEditing(false);setImporting(false)}} className="rounded-lg border border-[#b89959] px-3 py-1 font-bold">Sulje ×</button></div>
    {importing&&<div className="space-y-2"><textarea aria-label="Reseptiteksti" rows={3} value={text} onChange={event=>setText(event.target.value)} placeholder="Liitä reseptin teksti" className="w-full rounded-lg border p-2"/><button type="button" onClick={()=>load(text)} className="rounded-lg border px-3 py-2 font-bold">Tuo resepti</button></div>}
    {editing&&draft&&<div className="grid grid-cols-1 gap-2 border-t pt-2 text-sm">
      <label className="block text-xs">Reseptin nimi<input value={draft.title} onChange={event=>setDraft({...draft,title:event.target.value})} className="w-full rounded border p-1"/></label>
      <label className="flex items-center gap-2 text-xs">Annoksia<input aria-label="Alkuperäinen annosmäärä" type="number" min="1" value={original} onChange={event=>setOriginal(event.target.value)} className="w-16 rounded border p-1"/></label>
      {ingredients.map((item,index)=><div key={item.id} className="rounded-lg border p-2">
        <div className="grid grid-cols-[minmax(0,1fr)_76px_54px] gap-1"><input aria-label={"Aines "+(index+1)} value={item.name} onChange={event=>update(item.id,{name:event.target.value})} className="min-w-0 rounded border p-1"/><input aria-label={"Määrä "+(index+1)} type="number" step="any" min="0" value={item.amount??""} onChange={event=>update(item.id,{amount:event.target.value===""?null:Number(event.target.value)})} className="min-w-0 rounded border p-1"/><input aria-label={"Yksikkö "+(index+1)} value={item.unit??""} onChange={event=>update(item.id,{unit:event.target.value})} className="min-w-0 rounded border p-1"/></div>
        <div className="mt-1 flex items-center justify-between text-xs"><label><input type="checkbox" checked={item.atHome} onChange={event=>update(item.id,{atHome:event.target.checked})}/> On jo kotona</label><button type="button" onClick={()=>setDraft({...draft,ingredients:ingredients.filter(value=>value.id!==item.id)})} className="underline">Poista</button></div>
      </div>)}
      <button type="button" onClick={()=>setDraft({...draft,ingredients:[...ingredients,{id:String(Date.now()),name:"",amount:null,unit:null,uncertain:true,atHome:false}]})} className="rounded border px-2 py-1 text-xs">+ Lisää aines</button>
      <textarea aria-label="Valmistusohje" rows={2} value={draft.instructions} onChange={event=>setDraft({...draft,instructions:event.target.value})} className="w-full rounded border p-2"/>
      <div className="flex flex-wrap items-center justify-center gap-2"><button type="button" onClick={()=>saveToNotebook(false)} className="rounded-lg bg-[#174c3a] px-3 py-2 font-bold text-white">Tallenna Vihkoseen</button><button type="button" onClick={()=>saveToNotebook(true)} className="rounded-lg border border-[#b89959] px-3 py-2 font-bold">Tallenna uutena</button></div>
    </div>}
    </div>, document.body)}
  </section>;
}
