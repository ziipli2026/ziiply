"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { parseRecipeText, scaleIngredients, prepareRecipeSearch, type RecipeDraft } from "./recipeCore";

import { startDesktopRecipeDebug, appendDesktopRecipeDebug } from "../desktop/justiina/DesktopRecipeSearchDebug";

const STORAGE = "ziiply-justiina-recipe-draft-v1";
const EXAMPLE = "Uunilohi\n4 annosta\nAinekset:\n600 g lohta\n1 tl suolaa\nValmistus:\nKypsennä lohi uunissa.";
export default function JustiinaRecipeEditor({onSearchIngredients}:{onSearchIngredients?:(terms:string[],items:RecipeDraft["ingredients"])=>void}){
  const [draft,setDraft]=useState<RecipeDraft|null>(null);
  const [text,setText]=useState("");
  const [original,setOriginal]=useState("");
  const [target,setTarget]=useState("");
  const [editing,setEditing]=useState(false);
  const [detailsOpen,setDetailsOpen]=useState(false);
  const [importing,setImporting]=useState(false);
  const [savedRecipeId,setSavedRecipeId]=useState<string|null>(null);
  const [notice,setNotice]=useState("");
  const [hydrated,setHydrated]=useState(false);
  const [showSwitchHint,setShowSwitchHint]=useState(false);
  const dismissSwitchHint=()=>{setShowSwitchHint(false);try{sessionStorage.setItem("ziiply-recipe-switch-hint-seen-v1","1")}catch{}};
  useEffect(()=>{try{
    setShowSwitchHint(sessionStorage.getItem("ziiply-recipe-switch-hint-seen-v1")!=="1");
    const selected=JSON.parse(sessionStorage.getItem(STORAGE)||"null");
    if(selected?.draft&&Array.isArray(selected.draft.ingredients)&&selected.text){
      setDraft(selected.draft);setText(String(selected.text));
      setOriginal(String(selected.original||selected.draft.servings||4));
      setTarget(String(selected.target||selected.draft.servings||4));
      setSavedRecipeId(sessionStorage.getItem("ziiply-justiina-active-recipe-id-v1"));
      setHydrated(true);return;
    }
    const stored=JSON.parse(localStorage.getItem("ziiply-desktop-vihkonen-recipes-v1")||"[]");
    const recipes=Array.isArray(stored)?stored.filter((item:any)=>item&&typeof item.ingredients==="string"&&item.ingredients.trim()):[];
    const suggestion=recipes.length?recipes[Math.floor(Math.random()*recipes.length)]:null;
    const source=suggestion?[String(suggestion.title||"Oma resepti"),"4 annosta","Ainekset:",suggestion.ingredients,"Valmistus:",String(suggestion.instructions||"")].join("\n").replace(/\\n/g,"\n"):EXAMPLE;
    const parsed=parseRecipeText(source);
    const people=String(parsed.servings||4);
    setDraft(parsed);setText(source);setOriginal(people);setTarget(people);
    setSavedRecipeId(suggestion?String(suggestion.id||""):null);
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
    if(!draft)return;
    const empty={...draft,title:"",ingredients:[],instructions:""};
    setDraft(empty);setText("");setSavedRecipeId(null);
    setEditing(false);setImporting(false);setNotice("");
    try{
      sessionStorage.setItem(STORAGE,JSON.stringify({draft:empty,text:"",original,target}));
      sessionStorage.removeItem("ziiply-justiina-active-ingredients-v1");
    }catch{}
    window.dispatchEvent(new Event("ziiply-clear-active-recipe"));
  };
  const saveToNotebook=(asNew:boolean)=>{if(!draft)return;const key="ziiply-desktop-vihkonen-recipes-v1";try{const existing=JSON.parse(localStorage.getItem(key)||"[]");const recipes=Array.isArray(existing)?existing:[];const id=!asNew&&savedRecipeId?savedRecipeId:String(Date.now());const recipe={id,title:draft.title,ingredients:draft.ingredients.map(item=>[item.amount,item.unit,item.name].filter(value=>value!==null&&value!=="").join(" ")).join("\n"),instructions:draft.instructions,createdAt:new Date().toISOString()};localStorage.setItem(key,JSON.stringify([recipe,...recipes.filter((item:{id:string})=>item.id!==id)]));setSavedRecipeId(id);setNotice(asNew?"Tallennettu uutena Vihkoseen.":"Resepti tallennettu Vihkoseen.");window.dispatchEvent(new Event("ziiply-vihkonen-recipes-changed"));setEditing(false)}catch{setNotice("Reseptin tallennus epäonnistui.")}};
  const load=(source:string)=>{
    const next=parseRecipeText(source);const people=next.servings?String(next.servings):"";
    setSavedRecipeId(null);setText(source);setDraft(next);setOriginal(people);setTarget(people);setEditing(false);setImporting(false);
    setNotice(next.ingredients.length?"":"Ainesrivejä ei löytynyt. Tarkista teksti tai lisää ainekset muokkaamalla.");
    persist(next,source,people,people);return next;
  };
  const startSearch=(recipe:RecipeDraft|null=draft,base=original,people=target)=>{
    startDesktopRecipeDebug({title:recipe?.title||null,sourceText:text,draft:recipe,originalServings:base,targetServings:people});
    if(!recipe||!recipe.ingredients.length||!onSearchIngredients)return;
    const originalServings=Number(base)>0?Number(base):1;const targetServings=Number(people)>0?Number(people):originalServings;
    const items=scaleIngredients(recipe.ingredients,originalServings,targetServings).filter(item=>!item.atHome&&item.name.trim());
    if(!items.length){setNotice("Ei haettavia aineksia. Kaikki ovat kotona tai lista on tyhjä.");return}
    const search=prepareRecipeSearch(items,recipe.instructions,recipe.title);
    appendDesktopRecipeDebug("recipe_search_plan",{originalServings,targetServings,scaledIngredients:items,searchTerms:search.terms,searchItems:search.items});
    if(!search.terms.length){setNotice("Reseptissä ei ole ostettavia aineksia.");return;}
    persist(recipe,recipe===draft?text:EXAMPLE,String(originalServings),String(targetServings));
    try{sessionStorage.setItem("ziiply-justiina-active-ingredients-v1",JSON.stringify({title:recipe.title,servings:targetServings,items:search.items}))}catch{}
    onSearchIngredients(search.terms,search.items);
  };
  const hasRecipe=Boolean(draft?.title.trim()||draft?.ingredients.length);
  const ingredients=draft?.ingredients||[];
  const scaled=Number(original)>0&&Number(target)>0?scaleIngredients(ingredients,Number(original),Number(target)):ingredients;
  const update=(id:string,patch:Partial<RecipeDraft["ingredients"][number]>)=>{
    if(!draft)return;setDraft({...draft,ingredients:ingredients.map(item=>{
      if(item.id!==id)return item;const next={...item,...patch,...(patch.name!==undefined?{sourceLine:undefined,proteinRequirement:undefined}: {})};
      return {...next,uncertain:!next.name.trim()||next.amount===null||!Number.isFinite(next.amount)||next.amount<=0||!next.unit?.trim()};
    })});
  };
  return <><style>{`@keyframes recipe-switch-nudge{0%,58%,100%{transform:translateX(0)}72%{transform:translateX(-12px)}86%{transform:translateX(0)}}`}</style><div className="relative mt-4 w-full min-w-0 shrink-0">{hasRecipe&&<div className="absolute bottom-full left-2 mb-0.5 flex items-center gap-1.5 whitespace-nowrap text-[10px] leading-tight"><span className="font-semibold text-[#76684f]">{savedRecipeId?"Vihkosesta ehdotus":"Ehdotus"}</span><button type="button" onClick={clearRecipe} aria-label="Tyhjennä resepti" title="Poista valittu resepti hakukortista" className="font-bold text-[#923c2f]">Tyhjennä ×</button></div>}<section aria-label="Justiinan resepti" onClickCapture={dismissSwitchHint} onChangeCapture={dismissSwitchHint} className="w-full min-w-0 rounded-xl border border-[#d0aa58] bg-[#fffdf5] p-2 text-left text-sm text-[#27412a]">
    {draft&&<div className="flex w-full min-w-0 flex-col gap-2">
      {hasRecipe?<div className="flex min-w-0 items-center gap-2 rounded-lg border border-[#e3c98f] bg-[#fff5d9] px-2 py-2">
        <label className="flex h-11 shrink-0 items-center gap-1 rounded-lg border-2 border-[#b89959] bg-[#fffdf5] px-2 text-[12px] font-bold text-[#174c3a]"><input aria-label="Reseptin henkilömäärä" type="number" min="1" value={target} onChange={event=>setTarget(event.target.value)} className="w-8 min-w-0 bg-transparent text-center text-[13px] font-bold outline-none"/>hlö</label>
        <button type="button" onClick={()=>setDetailsOpen(true)} title="Avaa koko resepti" aria-label={`Avaa resepti ${draft.title}`} className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md px-1 py-2 text-[#174c3a] transition hover:bg-[#ffedbc]">
          <strong className="min-w-0 break-words text-center font-serif text-[clamp(14px,1.25vw,19px)] font-black leading-tight">{draft.title}</strong>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 self-start" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>
        </button>
      </div>:<div className="min-h-[36px] px-1 py-2 text-[12px] text-[#333]">ei valittua reseptiä</div>}
      <div className="grid w-full min-w-0 grid-cols-3 gap-1.5">
        <button type="button" disabled={!onSearchIngredients} onClick={()=>startSearch()} className="flex h-9 min-w-0 items-center justify-center rounded-md border border-[#174c3a] bg-[#174c3a] px-2 text-[11px] font-bold text-white disabled:opacity-40">Hae</button>
        <button type="button" aria-expanded={editing} onClick={()=>{setEditing(value=>!value);setImporting(false)}} className="flex h-9 min-w-0 items-center justify-center rounded-md border border-[#b89959] bg-[#f7eed8] px-1 text-[11px] font-bold text-[#27412a]">{editing?"Sulje":hasRecipe?"Muokkaa":"Luo resepti"}</button>
        <button type="button" onClick={()=>{setEditing(false);window.dispatchEvent(new Event("ziiply-open-recipe-notebook"))}} className="flex h-9 min-w-0 items-center justify-center rounded-md border border-[#b89959] bg-[#f7eed8] px-1 text-[11px] font-bold text-[#27412a]">{hasRecipe?"Vaihda":"Lisää"}</button>
      </div>
    </div>}
    {detailsOpen&&draft&&typeof document!=="undefined"&&createPortal(<div className="fixed inset-0 z-[9998] flex items-center justify-center bg-[#17352a]/40 p-6" onClick={()=>setDetailsOpen(false)}>
      <section role="dialog" aria-modal="true" aria-label={`Resepti: ${draft.title}`} onClick={event=>event.stopPropagation()} className="flex max-h-[min(82vh,800px)] w-[min(760px,94vw)] flex-col overflow-hidden rounded-[24px] border-[3px] border-[#b89959] bg-[#fff9e8] text-[#27412a] shadow-[0_25px_80px_rgba(20,40,31,.35)]">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[#d0aa58] bg-[#f8ebc8] px-6 py-4"><div><div className="text-xs font-black uppercase tracking-widest text-[#8a6c3c]">Vihkosen resepti · {target||original||4} hlö</div><h2 className="font-serif text-3xl font-black italic text-[#174c3a]">{draft.title}</h2></div><button type="button" onClick={()=>setDetailsOpen(false)} aria-label="Sulje resepti" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-[#8e6739] bg-[#fffdf5] text-2xl font-black">×</button></header>
        <div className="min-h-0 overflow-y-auto p-6"><h3 className="mb-3 font-serif text-xl font-bold">Ainekset</h3><div className="grid gap-2 sm:grid-cols-2">{scaled.map((item,index)=><div key={`${item.id}-${index}`} className="rounded-lg border border-[#e0c99a] bg-white/70 px-3 py-2 text-sm">{[item.amount,item.unit,item.name].filter(value=>value!==null&&value!=="").join(" ")}{item.atHome&&<span className="ml-2 text-xs text-[#777]">(löytyy kotoa)</span>}</div>)}</div>{draft.instructions&&<><h3 className="mb-2 mt-6 font-serif text-xl font-bold">Valmistusohje</h3><p className="whitespace-pre-wrap text-sm leading-relaxed">{draft.instructions}</p></>}</div>
        <footer className="flex shrink-0 justify-end gap-3 border-t border-[#d0aa58] bg-[#f8ebc8] px-6 py-4"><button type="button" onClick={()=>{setDetailsOpen(false);setEditing(true)}} className="rounded-lg border border-[#b89959] px-5 py-2 font-bold">Muokkaa</button><button type="button" onClick={()=>setDetailsOpen(false)} className="rounded-lg bg-[#174c3a] px-6 py-2 font-bold text-white">Sulje</button></footer>
      </section>
    </div>,document.body)}
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
