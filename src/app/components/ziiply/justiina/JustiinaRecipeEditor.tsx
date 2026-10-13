"use client";
import { useEffect, useRef, useState } from "react";
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
  const [instructionsOpen,setInstructionsOpen]=useState(false);
  const [notice,setNotice]=useState("");
  const [hydrated,setHydrated]=useState(false);
  const imageInputRef=useRef<HTMLInputElement|null>(null);
  const [imagePreview,setImagePreview]=useState("");
  const [readingImage,setReadingImage]=useState(false);
  const [cameraOpen,setCameraOpen]=useState(false);
  const [cameraShot,setCameraShot]=useState(false);
  const [cameraReview,setCameraReview]=useState(false);
  const [cameraError,setCameraError]=useState("");
  const [notebookOpen,setNotebookOpen]=useState(true);
  const [notebook,setNotebook]=useState<Array<{id:string;title:string;ingredients:string;instructions:string}>>([]);
  const [notebookFilter,setNotebookFilter]=useState("");
  const [savedId,setSavedId]=useState<string|null>(null);
  const cameraVideoRef=useRef<HTMLVideoElement|null>(null);
  const cameraStreamRef=useRef<MediaStream|null>(null);
  const capturedFileRef=useRef<File|null>(null);
  const refreshNotebook=()=>{try{const value=JSON.parse(localStorage.getItem("ziiply-desktop-vihkonen-recipes-v1")||"[]");setNotebook(Array.isArray(value)?value:[])}catch{setNotebook([])}};
  const stopCamera=()=>{cameraStreamRef.current?.getTracks().forEach(track=>track.stop());cameraStreamRef.current=null};
  const closeCamera=()=>{stopCamera();setCameraOpen(false);setCameraShot(false);setCameraReview(false);setCameraError("")};
  const startCamera=async()=>{
    setCameraOpen(true);setCameraShot(false);setCameraReview(false);setCameraError("");capturedFileRef.current=null;
    stopCamera();
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
      cameraStreamRef.current=stream;
      requestAnimationFrame(()=>{if(cameraVideoRef.current){cameraVideoRef.current.srcObject=stream;void cameraVideoRef.current.play().catch(()=>{})}});
    }catch{setCameraError("Kamera ei auennut. Voit liittää kuvan laitteen kuvista.");}
  };
  const takePicture=()=>{
    const video=cameraVideoRef.current;if(!video||!video.videoWidth)return;
    const canvas=document.createElement("canvas");canvas.width=video.videoWidth;canvas.height=video.videoHeight;
    canvas.getContext("2d")?.drawImage(video,0,0);
    canvas.toBlob(blob=>{if(!blob)return;capturedFileRef.current=new File([blob],"resepti.jpg",{type:"image/jpeg"});setImagePreview(old=>{if(old)URL.revokeObjectURL(old);return URL.createObjectURL(blob)});setCameraShot(true);stopCamera()},"image/jpeg",0.9);
  };
  const saveNotebook=(source:string)=>{
    const parsed=parseRecipeText(source);if(!parsed.title.trim()){setNotice("Anna reseptille nimi.");return}
    const key="ziiply-desktop-vihkonen-recipes-v1";
    try{const entries=JSON.parse(localStorage.getItem(key)||"[]");const list=Array.isArray(entries)?entries:[];const id=savedId||String(Date.now());const entry={id,title:parsed.title,ingredients:parsed.ingredients.map(item=>[item.amount,item.unit,item.name].filter(x=>x!==null&&x!=="").join(" ")).join("\n"),instructions:parsed.instructions,createdAt:new Date().toISOString()};localStorage.setItem(key,JSON.stringify([entry,...list.filter((item:{id:string})=>item.id!==id)]));setSavedId(id);refreshNotebook();load(source);setNotice("Resepti tallennettu.");window.dispatchEvent(new Event("ziiply-vihkonen-recipes-changed"));closeCamera()}catch{setNotice("Tallennus epäonnistui.")}
  };
  useEffect(()=>{refreshNotebook();return()=>{cameraStreamRef.current?.getTracks().forEach(track=>track.stop())}},[]);

  const readRecipeImage=async(file?:File)=>{
    if(!file)return;
    if(!file.type.startsWith("image/")){setNotice("Valitse kuva.");return}
    setImporting(true);setEditing(false);setReadingImage(true);
    const url=URL.createObjectURL(file);
    setImagePreview(old=>{if(old)URL.revokeObjectURL(old);return url});
    try{
      const TextDetector=(window as unknown as {TextDetector?:new()=>{detect:(image:HTMLImageElement)=>Promise<Array<{rawValue?:string;text?:string}>>}}).TextDetector;
      if(!TextDetector){setNotice("Tällä laitteella automaattinen tekstintunnistus ei ole käytettävissä. Voit kirjoittaa tai liittää tekstin.");setCameraReview(true);return}
      const image=new Image();image.src=url;await image.decode();
      const lines=await new TextDetector().detect(image);
      const recognized=lines.map(line=>line.rawValue||line.text||"").filter(Boolean).join("\n").trim();
      if(recognized){setText(recognized);setCameraReview(true);setNotice("Tarkista tunnistettu teksti ennen tallennusta.");}
      else setNotice("Tekstiä ei tunnistettu. Voit kirjoittaa sen kuvan alle.");
    }catch{setCameraReview(true);setNotice("Kuvan tekstinluku epäonnistui. Kirjoita tai liitä teksti kuvan alle.");}
    finally{setReadingImage(false)}
  };

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
  const load=(source:string)=>{
    const next=parseRecipeText(source);const people=next.servings?String(next.servings):"";
    setText(source);setDraft(next);setOriginal(people);setTarget(people);setEditing(false);setImporting(false);
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
  return <section aria-label="Justiinan resepti" className="mt-2 w-full min-w-0 shrink-0 rounded-xl border border-[#d0aa58] bg-[#fffdf5] p-3 text-left text-sm text-[#27412a]">
    {!draft?<div className="space-y-2"><p className="font-black">Reseptistä ostoksille</p>
      <button type="button" disabled={!onSearchIngredients} onClick={()=>{const next=load(EXAMPLE);startSearch(next,"4","4")}} className="w-full rounded-xl bg-[#174c3a] px-3 py-3 font-black text-white disabled:opacity-40">Uunilohi · 4 henkilölle — Hae ainekset</button>
      <button type="button" onClick={()=>{load(EXAMPLE)}} className="mr-3 text-xs font-bold underline">Katso tai muokkaa uunilohta</button>
      <button type="button" onClick={()=>setImporting(value=>!value)} className="text-xs font-bold underline">Liitä oma resepti</button>
    </div>:<div className="space-y-2">
      <div className="flex items-center justify-between gap-2"><strong className="min-w-0 break-words">{draft.title}</strong><label className="flex shrink-0 items-center gap-1 text-xs"><input aria-label="Henkilömäärä" type="number" min="1" value={target} onChange={event=>setTarget(event.target.value)} className="w-12 rounded border p-1"/> hlö</label></div>
      <p className="text-xs">{scaled.filter(item=>!item.atHome).map(item=>[item.amount,item.unit,item.name].filter(value=>value!==null&&value!=="").join(" ")).join(" · ")}</p>
      <button type="button" disabled={!onSearchIngredients} onClick={()=>startSearch()} className="w-full rounded-xl bg-[#174c3a] px-3 py-3 font-black text-white disabled:opacity-40">Hae ainekset · {target||"?"} henkilölle</button>
      <div className="flex flex-wrap gap-4 text-xs font-bold"><button type="button" aria-expanded={editing} onClick={()=>{setEditing(value=>!value);setImporting(false)}} className="underline">{editing?"Sulje muokkaus":"Muokkaa"}</button><button type="button" aria-expanded={instructionsOpen} onClick={()=>setInstructionsOpen(value=>!value)} className="underline">Valmistusohje</button><button type="button" onClick={()=>{setImporting(value=>!value);setEditing(false)}} className="underline">Vaihda resepti</button></div>
    </div>}
    <div className="mt-3 rounded-xl border border-[#b99d62] bg-[#fff5d8] p-2">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <button type="button" onClick={()=>setNotice("Äänitä-toiminto on käytettävissä hakukortissa.")} className="rounded-xl border-2 border-[#b99d62] bg-[#1b291f] p-1"><img src="/assets/voice-button.png" alt="Äänitä" className="mx-auto h-16 w-16 object-contain" onError={event=>{event.currentTarget.style.display="none"}}/><span className="block text-xs font-bold text-[#fff4d5]">Äänitä</span></button>
        <strong className="text-center font-serif text-2xl text-[#174c3a]">Reseptit</strong>
        <button type="button" onClick={()=>{void startCamera()}} className="rounded-xl border-2 border-[#b99d62] bg-[#1b291f] p-1"><span className="block text-3xl">📷</span><span className="block text-xs font-bold text-[#fff4d5]">Filmaa</span></button>
      </div>
      <div className="mt-2 flex gap-2"><input aria-label="Hae reseptiä omista" value={notebookFilter} onChange={event=>setNotebookFilter(event.target.value)} placeholder="Hae reseptiä omista..." className="min-w-0 flex-1 rounded-lg border border-[#b99d62] bg-white px-2 py-2"/><button type="button" onClick={()=>{setText("");setImporting(true);setEditing(false);setSavedId(null)}} className="shrink-0 rounded-lg bg-[#174c3a] px-3 text-xs font-bold text-white">Luo resepti</button></div>
      <div className="mt-2 max-h-[25dvh] space-y-1.5 overflow-y-auto overscroll-contain rounded-lg bg-[#fff9e9] p-1">
        {notebook.filter(item=>item.title?.toLowerCase().includes(notebookFilter.toLowerCase())).map(item=><div key={item.id} className="rounded-xl border border-[#b99d62] bg-[#fff5d8] p-2">
          <div className="flex items-center gap-1"><button type="button" className="min-w-0 flex-1 truncate text-left font-bold" onClick={()=>{const source=[item.title,"4 annosta","Ainekset:",item.ingredients,"Valmistus:",item.instructions].join("\n");load(source);setSavedId(item.id);setNotebookOpen(open=>!open)}}>{item.title} ▾</button><button type="button" onClick={()=>{const source=[item.title,"4 annosta","Ainekset:",item.ingredients,"Valmistus:",item.instructions].join("\n");load(source);setSavedId(item.id);setEditing(true)}} className="rounded-full bg-[#174c3a] px-2 py-1 text-xs font-bold text-white">Vaihda</button><button type="button" onClick={()=>{if(!window.confirm("Poistetaanko resepti?"))return;const next=notebook.filter(recipe=>recipe.id!==item.id);localStorage.setItem("ziiply-desktop-vihkonen-recipes-v1",JSON.stringify(next));setNotebook(next);window.dispatchEvent(new Event("ziiply-vihkonen-recipes-changed"))}} className="rounded-full border border-[#923c2f] px-2 py-1 text-xs text-[#923c2f]">Poista</button></div>
          {notebookOpen&&savedId===item.id&&<div className="mt-1 whitespace-pre-wrap text-xs">{item.ingredients}</div>}
        </div>)}
      </div>
    </div>
    {cameraOpen&&<div className="fixed inset-x-2 bottom-[calc(env(safe-area-inset-bottom)+92px)] top-[calc(env(safe-area-inset-top)+96px)] z-[200] flex items-start justify-center overflow-y-auto rounded-2xl border-[3px] border-[#b99d62] bg-[#14271e] p-3 text-[#fff7df] shadow-2xl">
      <div className="w-full max-w-[520px]">
        <div className="mb-3 flex items-center justify-between"><h3 className="font-serif text-xl font-bold">Kuvaa resepti {cameraReview&&<span className="text-sm font-sans">Tarkasta / muokkaa</span>}</h3><button type="button" aria-label="Sulje kamera" onClick={closeCamera} className="rounded-xl border border-[#b99d62] px-3 py-2">×</button></div>
        {!cameraReview&&<div className="flex h-[30dvh] items-center justify-center overflow-hidden rounded-xl bg-black">{cameraShot?<img src={imagePreview} alt="Otettu reseptikuva" className="h-full w-full object-contain"/>:<video ref={cameraVideoRef} autoPlay playsInline muted className="h-full w-full object-contain"/>}</div>}
        {cameraReview&&<textarea aria-label="Tarkasta reseptiteksti" value={text} onChange={event=>setText(event.target.value)} rows={9} className="h-[34dvh] w-full resize-none rounded-xl bg-[#fffdf5] p-3 text-[#183b2a]"/>}
        {cameraError&&<p className="mt-2 text-sm">{cameraError}</p>}
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {cameraReview?<><button type="button" onClick={()=>{setCameraReview(false);void startCamera()}} className="rounded-xl bg-[#e8d8a9] px-3 py-2 font-bold text-[#14271e]">Ota uusi</button><button type="button" onClick={closeCamera} className="rounded-xl border px-3 py-2">Peruuta</button><button type="button" onClick={()=>saveNotebook(text)} className="rounded-xl bg-[#e8d8a9] px-3 py-2 font-bold text-[#14271e]">Tallenna</button></>:<><button type="button" onClick={()=>{if(cameraShot){void startCamera()}else takePicture()}} className="rounded-xl bg-[#e8d8a9] px-3 py-2 font-bold text-[#14271e]">{cameraShot?"Ota uusi":"Ota kuva"}</button><button type="button" onClick={()=>{if(cameraShot){stopCamera();void readRecipeImage(capturedFileRef.current||undefined);setCameraReview(true)}else imageInputRef.current?.click()}} className="rounded-xl border px-3 py-2">{cameraShot?"Lue resepti":"Liitä kuva"}</button><button type="button" onClick={closeCamera} className="rounded-xl border px-3 py-2">Peruuta</button></>}
        </div>
      </div>
    </div>}
    <div className="mt-3 rounded-lg border border-[#d0aa58] bg-white p-2">
      <button type="button" onClick={()=>{setImporting(true);setEditing(false);imageInputRef.current?.click()}} className="w-full rounded-lg border border-[#174c3a] px-3 py-2 font-bold text-[#174c3a]">📷 Lue resepti</button>
      <input ref={imageInputRef} type="file" accept="image/*" capture="environment" aria-label="Ota kuva reseptistä tai valitse kuva" className="sr-only" onChange={event=>{void readRecipeImage(event.target.files?.[0]);event.target.value=""}}/>
      {readingImage&&<p role="status" className="mt-2 text-xs">Luetaan kuvaa…</p>}
      {imagePreview&&importing&&<img src={imagePreview} alt="Valittu reseptikuva" className="mt-2 max-h-44 w-full rounded object-contain"/>}
    </div>
    {notice&&<p role="status" className="mt-2 text-xs font-bold">{notice}</p>}
    {importing&&<div className="mt-3 space-y-2"><textarea aria-label="Reseptiteksti" rows={4} value={text} onChange={event=>setText(event.target.value)} placeholder="Liitä reseptin teksti" className="w-full rounded-lg border p-2"/><button type="button" onClick={()=>load(text)} className="rounded-lg border px-3 py-2 font-bold">Tuo resepti</button></div>}
    {instructionsOpen&&draft&&<p className="mt-3 whitespace-pre-wrap text-xs">{draft.instructions||"Valmistusohjetta ei ole vielä annettu."}</p>}
    {editing&&draft&&<div className="mt-3 max-h-[35dvh] space-y-2 overflow-y-auto overscroll-contain border-t pt-2">
      <label className="block text-xs">Reseptin nimi<input value={draft.title} onChange={event=>setDraft({...draft,title:event.target.value})} className="w-full rounded border p-1"/></label>
      <label className="flex items-center gap-2 text-xs">Alkuperäinen annosmäärä<input aria-label="Alkuperäinen annosmäärä" type="number" min="1" value={original} onChange={event=>setOriginal(event.target.value)} className="w-16 rounded border p-1"/></label>
      {ingredients.map((item,index)=><div key={item.id} className="rounded-lg border p-2">
        <div className="grid grid-cols-[minmax(0,1fr)_52px_44px] gap-1"><input aria-label={"Aines "+(index+1)} value={item.name} onChange={event=>update(item.id,{name:event.target.value})} className="min-w-0 rounded border p-1"/><input aria-label={"Määrä "+(index+1)} type="number" step="any" min="0" value={item.amount??""} onChange={event=>update(item.id,{amount:event.target.value===""?null:Number(event.target.value)})} className="min-w-0 rounded border p-1"/><input aria-label={"Yksikkö "+(index+1)} value={item.unit??""} onChange={event=>update(item.id,{unit:event.target.value})} className="min-w-0 rounded border p-1"/></div>
        <div className="mt-1 flex items-center justify-between text-xs"><label><input type="checkbox" checked={item.atHome} onChange={event=>update(item.id,{atHome:event.target.checked})}/> On jo kotona</label><button type="button" onClick={()=>setDraft({...draft,ingredients:ingredients.filter(value=>value.id!==item.id)})} className="underline">Poista</button></div>
      </div>)}
      <button type="button" onClick={()=>setDraft({...draft,ingredients:[...ingredients,{id:String(Date.now()),name:"",amount:null,unit:null,uncertain:true,atHome:false}]})} className="rounded border px-2 py-1 text-xs">+ Lisää aines</button>
      <textarea aria-label="Valmistusohje" rows={3} value={draft.instructions} onChange={event=>setDraft({...draft,instructions:event.target.value})} className="w-full rounded border p-2"/>
    </div>}
  </section>;
}
