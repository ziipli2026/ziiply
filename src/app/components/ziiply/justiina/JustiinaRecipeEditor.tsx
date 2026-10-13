"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { parseRecipeText, scaleIngredients, classifyRecipeIngredient, type RecipeDraft } from "./recipeCore";
import { correctSearchQuery } from "../search/searchIntentAI";

const STORAGE = "ziiply-justiina-recipe-draft-v1";
const EXAMPLE = "Uunilohi\n4 annosta\nAinekset:\n600 g lohta\n1 tl suolaa\nValmistus:\nKypsennä lohi uunissa.";

const EXAMPLES = [
  EXAMPLE,
  "Perunamuusi\n4 annosta\nAinekset:\n800 g perunaa\n2 dl maitoa\n50 g voita\nValmistus:\nKeitä perunat ja soseuta.",
  "Tomaattipasta\n4 annosta\nAinekset:\n400 g pastaa\n500 g tomaattia\n2 rkl oliiviöljyä\nValmistus:\nKeitä pasta ja tee tomaattikastike."
];
type SavedRecipe = {id:string;title:string;ingredients:string;instructions?:string};
const NOTEBOOK_KEY="ziiply-desktop-vihkonen-recipes-v1";
const toRecipeText=(r:SavedRecipe)=>[r.title,"4 annosta","Ainekset:",r.ingredients,"Valmistus:",r.instructions||""].join("\n");
const getSavedRecipes=():SavedRecipe[]=>{try{const v=JSON.parse(localStorage.getItem(NOTEBOOK_KEY)||"[]");return Array.isArray(v)?v.filter((r:SavedRecipe)=>r&&typeof r.title==="string"&&typeof r.ingredients==="string"&&r.ingredients.trim()):[]}catch{return []}};
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
  const [suggestionSource,setSuggestionSource]=useState<"oma"|"esimerkki">("esimerkki");
  const [suggestionNumber,setSuggestionNumber]=useState(0);
  useEffect(()=>{
    const own=getSavedRecipes();
    const options=own.length?own.map(toRecipeText):EXAMPLES;
    const selected=Math.floor(Math.random()*options.length);
    const source=options[selected],next=parseRecipeText(source),people=String(next.servings||4);
    setDraft(next);setText(source);setOriginal(people);setTarget(people);
    setSuggestionSource(own.length?"oma":"esimerkki");setSuggestionNumber(selected);
    setSavedRecipeId(own.length?own[selected].id:null);setHydrated(true);
  },[]);
  const persist=(next:RecipeDraft|null=draft,source=text,base=original,people=target)=>{
    try{sessionStorage.setItem(STORAGE,JSON.stringify({draft:next,text:source,original:base,target:people}))}catch{}
  };
  useEffect(()=>{if(hydrated)persist()},[hydrated,draft,text,original,target]);
  useEffect(()=>{const onSelect=(event:Event)=>{const detail=(event as CustomEvent<{id?:string;title?:string;ingredients?:string;instructions?:string}>).detail;if(!detail)return;const source=toRecipeText({id:detail.id||"",title:detail.title||"Resepti",ingredients:detail.ingredients||"",instructions:detail.instructions||""});load(source);setSavedRecipeId(detail.id||null);setSuggestionSource("oma")};window.addEventListener("ziiply-vihkonen-recipe-select",onSelect);return()=>window.removeEventListener("ziiply-vihkonen-recipe-select",onSelect)},[]);
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
    onSearchIngredients(classified.map(group=>correctSearchQuery(group!.searchTerm)),items);
  };
  const changeSuggestion=()=>{
    const own=getSavedRecipes(),options=own.length?own.map(toRecipeText):EXAMPLES;
    const nextIndex=options.length>1?(suggestionNumber+1+Math.floor(Math.random()*(options.length-1)))%options.length:0;
    load(options[nextIndex]);setSuggestionNumber(nextIndex);setSuggestionSource(own.length?"oma":"esimerkki");
    if(own.length)setSavedRecipeId(own[nextIndex].id);
  };
  const openNotebook=()=>{setEditing(false);window.dispatchEvent(new Event("ziiply-open-recipe-notebook"))};
  const ingredients=draft?.ingredients||[];
  const scaled=Number(original)>0&&Number(target)>0?scaleIngredients(ingredients,Number(original),Number(target)):ingredients;
  const update=(id:string,patch:Partial<RecipeDraft["ingredients"][number]>)=>{
    if(!draft)return;setDraft({...draft,ingredients:ingredients.map(item=>{
      if(item.id!==id)return item;const next={...item,...patch};
      return {...next,uncertain:!next.name.trim()||next.amount===null||!Number.isFinite(next.amount)||next.amount<=0||!next.unit?.trim()};
    })});
  };
  return <section aria-label="Justiinan resepti" className="mt-2 w-full min-w-0 shrink-0 rounded-xl border border-[#d0aa58] bg-[#fffdf5] p-2 text-left text-sm text-[#27412a]">
    {!draft?<div className="space-y-2"><p className="font-black">Reseptistä ostoksille</p>
      <button type="button" disabled={!onSearchIngredients} onClick={()=>{const next=load(EXAMPLE);startSearch(next,"4","4")}} className="w-full rounded-xl bg-[#174c3a] px-3 py-3 font-black text-white disabled:opacity-40">Uunilohi · 4 henkilölle — Hae ainekset</button>
      <button type="button" onClick={()=>{load(EXAMPLE)}} className="mr-3 text-xs font-bold underline">Katso tai muokkaa uunilohta</button>
      <button type="button" onClick={()=>setImporting(value=>!value)} className="text-xs font-bold underline">Liitä oma resepti</button>
    </div>:<div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-start gap-2">
      <div className="min-w-0 space-y-2">
        <div className="text-center text-[10px] font-semibold text-[#76684f]">{suggestionSource==="oma"?"Omasta Vihkosesta":"Esimerkiksi"}</div><strong className="block min-w-0 break-words text-center text-base leading-tight">{draft.title}</strong>
        <div className="grid min-w-0 grid-cols-2 gap-1">
          <button type="button" disabled={!onSearchIngredients} onClick={()=>startSearch()} className="flex h-8 w-full min-w-0 items-center justify-center rounded-md border border-[#174c3a] bg-[#174c3a] px-1 text-[10px] font-bold text-white disabled:opacity-40">Hae</button>
          <label className="flex h-8 w-full min-w-0 items-center justify-center gap-0.5 rounded-md border border-[#b89959] bg-[#fffdf5] px-0.5 text-[10px]"><input aria-label="Henkilömäärä" type="number" min="1" value={target} onChange={event=>setTarget(event.target.value)} className="w-8 min-w-0 bg-transparent text-center text-[10px] outline-none"/>hlö</label>
          <button type="button" aria-expanded={editing} onClick={()=>{setEditing(value=>!value);setImporting(false)}} className="flex h-8 w-full min-w-0 items-center justify-center rounded-md border border-[#b89959] bg-[#f7eed8] px-1 text-[10px] font-bold text-[#27412a]">{editing?"Sulje":"Muokkaa"}</button>
          <button type="button" onClick={openNotebook} className="flex h-8 w-full min-w-0 items-center justify-center rounded-md border border-[#b89959] bg-[#f7eed8] px-1 text-[10px] font-bold text-[#27412a]">Omat reseptit ↗</button>
        </div>
        <button type="button" onClick={changeSuggestion} className="w-full text-center text-[10px] font-bold underline text-[#174c3a]">Arvo toinen ehdotus ↻</button>
      </div>
      <div className="min-w-0 space-y-1 border-l border-[#d0aa58] pl-2 text-xs leading-relaxed">{scaled.filter(item=>!item.atHome).map((item,index)=><div key={`${item.name}-${index}`} className="break-words">{[item.amount,item.unit,item.name].filter(value=>value!==null&&value!=="").join(" ")}</div>)}</div>
    </div>}
    <p className="mt-2 text-[10px] leading-tight text-[#765f3f]">Tarkista aina itse tuotteiden ainesosat, allergeenit ja erityisruokavalioon sopivuus tuotepakkauksesta. Ziiply ei voi taata tuotteiden soveltuvuutta.</p>
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
  </section>;
}
