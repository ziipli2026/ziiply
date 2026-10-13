"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { parseRecipeText, scaleIngredients, classifyRecipeIngredient, recipeProductSearchTerm, type RecipeDraft } from "./recipeCore";
import { correctSearchQuery } from "../search/searchIntentAI";

const STORAGE = "ziiply-justiina-recipe-draft-v1";
const EXAMPLE = "Uunilohi\n4 annosta\nAinekset:\n600 g lohta\n1 tl suolaa\nValmistus:\nKypsennä lohi uunissa.";
export default function JustiinaRecipeEditor({onSearchIngredients}:{onSearchIngredients?:(terms:string[],items:RecipeDraft["ingredients"])=>void}){
  const [draft,setDraft]=useState<RecipeDraft|null>(null);
  const [text,setText]=useState("");
  const [original,setOriginal]=useState("");
  const [target,setTarget]=useState("");
  const [editing,setEditing]=useState(false);
  const [importing,setImporting]=useState(false);
  const [savedRecipeId,setSavedRecipeId]=useState<string|null>(null);
  const [notice,setNotice]=useState("");
  const [hydrated,setHydrated]=useState(false);
  const [showSwitchHint,setShowSwitchHint]=useState(false);
  const dismissSwitchHint=()=>{setShowSwitchHint(false);try{sessionStorage.setItem("ziiply-recipe-switch-hint-seen-v1","1")}catch{}};
  useEffect(()=>{try{
    setShowSwitchHint(sessionStorage.getItem("ziiply-recipe-switch-hint-seen-v1")!=="1");
    const saved=JSON.parse(sessionStorage.getItem(STORAGE)||"null");
    if(saved?.draft&&Array.isArray(saved.draft.ingredients)){
      setDraft(saved.draft);setText(String(saved.text||""));
      setOriginal(String(saved.original||saved.draft.servings||""));setTarget(String(saved.target||saved.draft.servings||""));
    }else{
      // Always open the search card with a real recipe, prioritizing the user's notebook.
      const recipes=JSON.parse(localStorage.getItem("ziiply-desktop-vihkonen-recipes-v1")||"[]");
      const latest=Array.isArray(recipes)?recipes.find((item:any)=>item&&typeof item.ingredients==="string"&&item.ingredients.trim()):null;
      const source=latest?[String(latest.title||"Oma resepti"),"4 annosta","Ainekset:",latest.ingredients,"Valmistus:",String(latest.instructions||"")].join("\\n"):EXAMPLE;
      const parsed=parseRecipeText(source);
      const people=String(parsed.servings||4);
      setDraft(parsed);setText(source);setOriginal(people);setTarget(people);
      if(latest)setSavedRecipeId(String(latest.id||""));
    }
  }catch{
    const parsed=parseRecipeText(EXAMPLE);
    setDraft(parsed);setText(EXAMPLE);setOriginal(String(parsed.servings||4));setTarget(String(parsed.servings||4));
  }setHydrated(true)},[]);
  const persist=(next:RecipeDraft|null=draft,source=text,base=original,people=target)=>{
    try{sessionStorage.setItem(STORAGE,JSON.stringify({draft:next,text:source,original:base,target:people}))}catch{}
  };
  useEffect(()=>{if(hydrated)persist()},[hydrated,draft,text,original,target]);
  useEffect(()=>{const onSelect=(event:Event)=>{const detail=(event as CustomEvent<{id?:string;title?:string;ingredients?:string;instructions?:string}>).detail;if(!detail)return;const source=[detail.title||"Resepti","4 annosta","Ainekset:",detail.ingredients||"","Valmistus:",detail.instructions||""].join("\n");load(source);setSavedRecipeId(detail.id||null)};window.addEventListener("ziiply-vihkonen-recipe-select",onSelect);return()=>window.removeEventListener("ziiply-vihkonen-recipe-select",onSelect)},[]);
  const clearRecipe=()=>{
    setDraft(null);setText("");setOriginal("");setTarget("");setSavedRecipeId(null);
    setEditing(false);setImporting(false);setNotice("");
    try{sessionStorage.removeItem(STORAGE);sessionStorage.removeItem("ziiply-justiina-active-ingredients-v1")}catch{}
  };
  const saveToNotebook=(asNew:boolean)=>{if(!draft)return;const key="ziiply-desktop-vihkonen-recipes-v1";try{const existing=JSON.parse(localStorage.getItem(key)||"[]");const recipes=Array.isArray(existing)?existing:[];const id=!asNew&&savedRecipeId?savedRecipeId:String(Date.now());const recipe={id,title:draft.title,ingredients:draft.ingredients.map(item=>[item.amount,item.unit,item.name].filter(value=>value!==null&&value!=="").join(" ")).join("\n"),instructions:draft.instructions,createdAt:new Date().toISOString()};localStorage.setItem(key,JSON.stringify([recipe,...recipes.filter((item:{id:string})=>item.id!==id)]));setSavedRecipeId(id);setNotice(asNew?"Tallennettu uutena Vihkoseen.":"Resepti tallennettu Vihkoseen.");window.dispatchEvent(new Event("ziiply-vihkonen-recipes-changed"));setEditing(false)}catch{setNotice("Reseptin tallennus epäonnistui.")}};
  const load=(source:string)=>{
    const next=parseRecipeText(source);const people=next.servings?String(next.servings):"";
    setSavedRecipeId(null);setText(source);setDraft(next);setOriginal(people);setTarget(people);setEditing(false);setImporting(false);
    setNotice(next.ingredients.length?"":"Ainesrivejä ei löytynyt. Lisää Ainekset:-otsikko tai muokkaa aineksia.");
    persist(next,source,people,people);return next;
  };
  const startSearch=(recipe:RecipeDraft|null=draft,base=original,people=target)=>{
    if(!recipe||!onSearchIngredients)return;
    const originalServings=Number(base)>0?Number(base):1;const targetServings=Number(people)>0?Number(people):originalServings;
    const items=scaleIngredients(recipe.ingredients,originalServings,targetServings).filter(item=>!item.atHome&&item.name.trim());
    if(!items.length){setNotice("Ei haettavia aineksia. Kaikki ovat kotona tai lista on tyhjä.");return}
    // Missing or ambiguous quantities do not block product discovery.
    // Keep original recipe quantities available for later confirmation.
    const searchable=items.map(item=>({item,term:recipeProductSearchTerm(item.name)})).filter((entry):entry is {item:typeof items[number];term:string}=>Boolean(entry.term));
    if(!searchable.length){setNotice("Reseptissä ei ole ostettavia aineksia.");return;}
    // Combine repeated ingredients of the same kind before retail search.
    const merged:typeof searchable=[];
    for(const entry of searchable){
      const existing=merged.find(other=>other.term===entry.term && other.item.unit===entry.item.unit);
      if(existing){
        if(existing.item.amount!==null && entry.item.amount!==null)existing.item={...existing.item,amount:existing.item.amount+entry.item.amount};
      }else merged.push({...entry,item:{...entry.item}});
    }
    const classified=merged.map(({term})=>classifyRecipeIngredient(term));
    persist(recipe,recipe===draft?text:EXAMPLE,String(originalServings),String(targetServings));
    try{sessionStorage.setItem("ziiply-justiina-active-ingredients-v1",JSON.stringify({title:recipe.title,servings:targetServings,items:merged.map(entry=>entry.item)}))}catch{}
    onSearchIngredients(classified.map((group,index)=>correctSearchQuery(group?.searchTerm||merged[index].term)),merged.map(entry=>entry.item));
  };
  const ingredients=draft?.ingredients||[];
  const scaled=Number(original)>0&&Number(target)>0?scaleIngredients(ingredients,Number(original),Number(target)):ingredients;
  const update=(id:string,patch:Partial<RecipeDraft["ingredients"][number]>)=>{
    if(!draft)return;setDraft({...draft,ingredients:ingredients.map(item=>{
      if(item.id!==id)return item;const next={...item,...patch};
      return {...next,uncertain:!next.name.trim()||next.amount===null||!Number.isFinite(next.amount)||next.amount<=0||!next.unit?.trim()};
    })});
  };
  return <><style>{`@keyframes recipe-switch-nudge{0%,58%,100%{transform:translateX(0)}72%{transform:translateX(-12px)}86%{transform:translateX(0)}}`}</style><div className="relative mt-4 w-full min-w-0 shrink-0"><span className="absolute bottom-full left-2 mb-0.5 text-[10px] font-semibold leading-tight text-[#76684f]">{savedRecipeId?"Vihkosesta ehdotus":"Ehdotus"}</span><section aria-label="Justiinan resepti" onClickCapture={dismissSwitchHint} onChangeCapture={dismissSwitchHint} className="w-full min-w-0 rounded-xl border border-[#d0aa58] bg-[#fffdf5] p-2 text-left text-sm text-[#27412a]">
    {!draft?<div className="space-y-2"><p className="font-black">Reseptistä ostoksille</p>
      <button type="button" disabled={!onSearchIngredients} onClick={()=>{const next=load(EXAMPLE);startSearch(next,"4","4")}} className="w-full rounded-xl bg-[#174c3a] px-3 py-3 font-black text-white disabled:opacity-40">Uunilohi · 4 henkilölle — Hae ainekset</button>
      <button type="button" onClick={()=>{load(EXAMPLE)}} className="mr-3 text-xs font-bold underline">Katso tai muokkaa uunilohta</button>
      <button type="button" onClick={()=>setImporting(value=>!value)} className="text-xs font-bold underline">Liitä oma resepti</button>
    </div>:<div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-2">
      <div className="min-w-0 space-y-2">
        <div className="flex min-w-0 items-start justify-between gap-1"><strong className="min-w-0 flex-1 break-words text-center text-base leading-tight">{draft.title}</strong><button type="button" onClick={clearRecipe} aria-label="Tyhjennä resepti" title="Poista resepti hakunäkymästä (ei poista Vihkosesta)" className="shrink-0 rounded-md border border-[#a34c3d] bg-[#fffdf5] px-2 py-1 text-[10px] font-bold text-[#923c2f]">Tyhjennä ×</button></div>
        <div className="grid min-w-0 grid-cols-2 gap-1">
          <button type="button" disabled={!onSearchIngredients} onClick={()=>startSearch()} className="flex h-8 w-full min-w-0 items-center justify-center rounded-md border border-[#174c3a] bg-[#174c3a] px-1 text-[10px] font-bold text-white disabled:opacity-40">Hae</button>
          <label className="flex h-8 w-full min-w-0 items-center justify-center gap-0.5 rounded-md border border-[#b89959] bg-[#fffdf5] px-0.5 text-[10px]"><input aria-label="Henkilömäärä" type="number" min="1" value={target} onChange={event=>setTarget(event.target.value)} className="w-8 min-w-0 bg-transparent text-center text-[10px] outline-none"/>hlö</label>
          <button type="button" aria-expanded={editing} onClick={()=>{setEditing(value=>!value);setImporting(false)}} className="flex h-8 w-full min-w-0 items-center justify-center rounded-md border border-[#b89959] bg-[#f7eed8] px-1 text-[10px] font-bold text-[#27412a]">{editing?"Sulje":"Muokkaa"}</button>
          <div className="relative min-w-0"><button type="button" onClick={()=>{setEditing(false);window.dispatchEvent(new Event("ziiply-open-recipe-notebook"))}} className="flex h-8 w-full min-w-0 items-center justify-center rounded-md border border-[#b89959] bg-[#f7eed8] px-1 text-[10px] font-bold text-[#27412a]">Vaihda</button>{showSwitchHint&&<span aria-hidden="true" className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 z-10 flex h-8 -translate-y-1/2 items-center"><span className="block motion-safe:animate-[recipe-switch-nudge_2s_ease-in-out_infinite]"><svg viewBox="0 0 42 22" width="42" height="22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 11H40M2 11L12 2M2 11L12 20" stroke="#174c3a" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span></span>}</div>
        </div>
      </div>
      <div className="min-w-0 max-h-[190px] space-y-1 overflow-y-auto border-l border-[#d0aa58] pl-2 pr-1 text-xs leading-relaxed">{scaled.filter(item=>!item.atHome).map((item,index)=><div key={`${item.name}-${index}`} className="break-words">{[item.amount,item.unit,item.name].filter(value=>value!==null&&value!=="").join(" ")}</div>)}</div>
    </div>}
    {notice&&<p role="status" className="mt-2 text-xs font-bold">{notice}</p>}
    {hydrated && typeof document !== "undefined" && (importing||editing) && createPortal(<div className="fixed left-1/2 top-3 z-[9999] w-[min(520px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-y-auto -translate-x-1/2 rounded-2xl border-2 border-[#b89959] bg-[#fffdf5] p-3 text-[#27412a] shadow-2xl">
      <div className="mb-2 flex items-center justify-between gap-2"><strong className="text-sm">{editing?"Muokkaa reseptiä":importing?"Vaihda resepti":"Valmistusohje"}</strong><button type="button" onClick={()=>{setEditing(false);setImporting(false)}} className="rounded-lg border border-[#b89959] px-3 py-1 font-bold">Sulje ×</button></div>
    {importing&&<div className="space-y-2"><textarea aria-label="Reseptiteksti" rows={3} value={text} onChange={event=>setText(event.target.value)} placeholder="Liitä reseptin teksti" className="w-full rounded-lg border p-2"/><button type="button" onClick={()=>load(text)} className="rounded-lg border px-3 py-2 font-bold">Tuo resepti</button></div>}
    {editing&&draft&&<div className="space-y-3 border-t border-[#d0aa58] pt-3 text-sm">
      <div className="grid grid-cols-[minmax(0,1fr)_76px] items-end gap-3">
        <label className="block min-w-0 text-xs font-semibold">Ruoan nimi<input value={draft.title} onChange={event=>setDraft({...draft,title:event.target.value})} className="mt-1 w-full rounded-lg border border-[#b89959] bg-white p-2 text-sm"/></label>
        <label className="block text-xs font-semibold">Annoksia<input aria-label="Alkuperäinen annosmäärä" type="number" min="1" value={original} onChange={event=>setOriginal(event.target.value)} className="mt-1 w-full rounded-lg border border-[#b89959] bg-white p-2 text-sm"/></label>
      </div>
      <div>
        <strong className="text-xs">Ainekset</strong>
        <div className="mt-1 space-y-1">
          {ingredients.map((item,index)=><div key={item.id} className="grid grid-cols-[minmax(0,1fr)_64px_44px_28px] items-center gap-1">
            <input aria-label={"Aines "+(index+1)} placeholder="Aines" value={item.name} onChange={event=>update(item.id,{name:event.target.value})} className="min-w-0 rounded-md border border-[#d0c3a4] bg-white px-2 py-1.5 text-xs"/>
            <input aria-label={"Määrä "+(index+1)} type="number" step="any" min="0" value={item.amount??""} onChange={event=>update(item.id,{amount:event.target.value===""?null:Number(event.target.value)})} className="min-w-0 rounded-md border border-[#d0c3a4] bg-white px-1 py-1.5 text-xs"/>
            <input aria-label={"Yksikkö "+(index+1)} value={item.unit??""} onChange={event=>update(item.id,{unit:event.target.value})} className="min-w-0 rounded-md border border-[#d0c3a4] bg-white px-1 py-1.5 text-xs"/>
            <button type="button" aria-label={"Poista aines "+(index+1)} title="Poista aines" onClick={()=>setDraft({...draft,ingredients:ingredients.filter(value=>value.id!==item.id)})} className="text-lg text-[#934b3a]">×</button>
          </div>)}
        </div>
        <button type="button" onClick={()=>setDraft({...draft,ingredients:[...ingredients,{id:String(Date.now()),name:"",amount:null,unit:null,uncertain:true,atHome:false}]})} className="mt-2 rounded-md border border-[#b89959] px-3 py-1 text-xs font-semibold">+ Lisää aines</button>
      </div>
      <label className="block text-xs font-semibold">Valmistusohje<textarea aria-label="Valmistusohje" rows={3} value={draft.instructions} onChange={event=>setDraft({...draft,instructions:event.target.value})} className="mt-1 w-full rounded-lg border border-[#b89959] bg-white p-2 text-sm"/></label>
      <div className="grid grid-cols-3 gap-2 text-xs font-bold">
        <button type="button" onClick={()=>saveToNotebook(false)} className="rounded-lg bg-[#174c3a] px-1 py-2 text-white">Tallenna</button>
        <button type="button" onClick={()=>saveToNotebook(true)} className="rounded-lg border border-[#b89959] px-1 py-2">Tallenna uutena</button>
        <button type="button" onClick={()=>setEditing(false)} className="rounded-lg border border-[#b89959] px-1 py-2">Peruuta</button>
      </div>
    </div>}
    </div>, document.body)}
  </section></div></>;
}
