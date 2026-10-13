"use client";
import React from "react";
import { createPortal } from "react-dom";
import { useDesktopVoiceInput } from "../desktop/justiina/useDesktopVoiceInput";
type Item={title?:string;name?:string;quantity?:number;[key:string]:any};
export type DesktopSavedList={id:string;name:string;createdAt:string;items:Item[]};
type Recipe={id:string;title:string;ingredients:string;instructions:string;createdAt:string};
type Props={open:boolean;lists:DesktopSavedList[];currentCartCount:number;openedListId:string|null;onToggleList:(id:string)=>void;onSaveCurrentCart:()=>void;onRestoreList:(list:DesktopSavedList)=>void;onDeleteList:(id:string)=>void;onClose:()=>void};
export default function ZiiplyDesktopNotebookCard({open,lists,currentCartCount,openedListId,onToggleList,onSaveCurrentCart,onRestoreList,onDeleteList,onClose}:Props){
const [recipes,setRecipes]=React.useState<Recipe[]>([]);
const [recipeQuery,setRecipeQuery]=React.useState("");
const [focusRecipes,setFocusRecipes]=React.useState(false);
React.useEffect(()=>{const handler=()=>setFocusRecipes(true);window.addEventListener("ziiply-open-recipe-notebook",handler);return()=>window.removeEventListener("ziiply-open-recipe-notebook",handler)},[]);
React.useEffect(()=>{if(!open)setFocusRecipes(false)},[open]);
const [recipeTitle,setRecipeTitle]=React.useState("");
const [recipeIngredients,setRecipeIngredients]=React.useState("");
const [recipeInstructions,setRecipeInstructions]=React.useState("");
const [recipeEditing,setRecipeEditing]=React.useState(false);
const [recipeSaveNotice,setRecipeSaveNotice]=React.useState("");
const [recipeReadOpen,setRecipeReadOpen]=React.useState(false);
const [recipeListOpen,setRecipeListOpen]=React.useState(false);
React.useEffect(()=>{if(recipeReadOpen)setRecipeListOpen(false)},[recipeReadOpen]);
const [recipePhoto,setRecipePhoto]=React.useState<string|null>(null);
const [recipePhotoError,setRecipePhotoError]=React.useState("");
const recipeVoice=useDesktopVoiceInput((transcript)=>{
  const spoken=transcript.trim();
  if(!spoken)return;
  setRecipeIngredients(current=>[current,spoken].filter(Boolean).join("\n"));
  setRecipeEditing(true);
  setRecipeReadOpen(false);
  setRecipeSaveNotice("Sanelu lisättiin ainestekstiin. Tarkista nimi, määrät ja valmistusohje ennen tallennusta.");
});
const [recipeOcrBusy,setRecipeOcrBusy]=React.useState(false);
const [recipeOcrText,setRecipeOcrText]=React.useState("");
const readRecipeImage=async()=>{
  if(!recipePhoto)return;
  setRecipeOcrBusy(true);setRecipePhotoError("");
  try{
    const response=await fetch("/api/recipe/read-image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({image:recipePhoto})});
    const result=await response.json();
    if(!response.ok)throw Error(result.error||"Reseptin lukeminen epäonnistui.");
    const title=String(result.title||"").trim();
    const ingredients=String(result.ingredients||"").trim();
    const instructions=String(result.instructions||"").trim();
    const raw=String(result.rawText||"").trim();
    if(!title&&!ingredients&&!instructions&&!raw)throw Error("Kuvasta ei löytynyt luettavaa reseptiä.");
    setRecipeOcrText([title,ingredients&&"Ainekset:\n"+ingredients,instructions&&"Valmistus:\n"+instructions].filter(Boolean).join("\n\n")||raw);
    setRecipeTitle(title);setRecipeIngredients(ingredients);setRecipeInstructions(instructions);
  }catch(e){setRecipePhotoError(e instanceof Error?e.message:"Reseptin lukeminen epäonnistui.");}
  finally{setRecipeOcrBusy(false);}
};
const applyRecipeOcr=()=>{
  const lines=recipeOcrText.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!lines.length)return;
  const heading=lines.findIndex(x=>/^(ainekset|raaka-aineet|tarvikkeet)\s*:?$/i.test(x));
  const method=lines.findIndex(x=>/^(valmistus|valmistusohje|ohje|työvaiheet)\s*:?$/i.test(x));
  const ingredientLines=heading>=0?lines.slice(heading+1,method>heading?method:undefined):lines.slice(1,method>=0?method:undefined);
  setRecipeTitle(lines[0]||"");
  setRecipeIngredients(ingredientLines.join("\n"));
  setRecipeInstructions(method>=0?lines.slice(method+1).join("\n"):"");
  setRecipeEditing(true);setRecipeReadOpen(false);
  setRecipeSaveNotice("Kuvan teksti tuotu. Tarkista nimi, ainekset ja valmistusohje ennen tallennusta.");
};
const recipeCameraInput=React.useRef<HTMLInputElement>(null);
const recipeVideo=React.useRef<HTMLVideoElement>(null);
const recipeStream=React.useRef<MediaStream|null>(null);
const [recipeCameraLive,setRecipeCameraLive]=React.useState(false);
const [recipeCameraBusy,setRecipeCameraBusy]=React.useState(false);
const [recipeCountdown,setRecipeCountdown]=React.useState<number|null>(null);
const stopRecipeCamera=()=>{setRecipeCountdown(null);recipeStream.current?.getTracks().forEach(t=>t.stop());recipeStream.current=null;setRecipeCameraLive(false);};
const startRecipeCamera=async(autoCapture=false)=>{
  setRecipePhotoError("");setRecipeCameraBusy(true);stopRecipeCamera();
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw Error("Kamera ei ole käytettävissä tässä selaimessa.");
    let stream:MediaStream;
    try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});}
    catch{stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});}
    recipeStream.current=stream;setRecipeCameraLive(true);if(autoCapture)setRecipeCountdown(5);
  }catch(e){setRecipePhotoError(e instanceof Error?e.message:"Kameran avaus epäonnistui. Salli kamera selaimen asetuksista.");}
  finally{setRecipeCameraBusy(false);}
};
React.useEffect(()=>{if(recipeCameraLive&&recipeVideo.current&&recipeStream.current){recipeVideo.current.srcObject=recipeStream.current;void recipeVideo.current.play().catch(()=>setRecipePhotoError("Kameran toisto epäonnistui."));}},[recipeCameraLive]);
React.useEffect(()=>()=>{recipeStream.current?.getTracks().forEach(t=>t.stop());},[]);
const captureRecipeCamera=()=>{
  const video=recipeVideo.current;if(!video?.videoWidth)return;
  const canvas=document.createElement("canvas");canvas.width=video.videoWidth;canvas.height=video.videoHeight;
  canvas.getContext("2d")?.drawImage(video,0,0);
  setRecipePhoto(canvas.toDataURL("image/jpeg",0.88));stopRecipeCamera();
};
React.useEffect(()=>{
 if(recipeCountdown===null)return;
 if(!recipeCameraLive){setRecipeCountdown(null);return;}
 if(recipeCountdown===0){const video=recipeVideo.current;if(video?.videoWidth){captureRecipeCamera();}else{setRecipePhotoError("Kamerakuva ei ole vielä valmis. Kokeile uudelleen.");setRecipeCountdown(null);}return;}
 const timeout=window.setTimeout(()=>setRecipeCountdown(v=>v===null?null:v-1),1000);
 return()=>window.clearTimeout(timeout);
},[recipeCountdown,recipeCameraLive]);
const startTimedRecipeCapture=()=>{if(!recipeCameraLive||recipeCameraBusy)return;setRecipePhotoError("");setRecipeCountdown(5);};
const recipeFileInput=React.useRef<HTMLInputElement>(null);
const handleRecipePhoto=(file?:File)=>{
  if(!file)return;
  if(!file.type.startsWith("image/")){setRecipePhotoError("Valitse kuvatiedosto.");return;}
  if(file.size>12*1024*1024){setRecipePhotoError("Kuva on liian suuri (enintään 12 Mt).");return;}
  setRecipePhotoError("");
  const reader=new FileReader();
  reader.onload=()=>{setRecipePhoto(String(reader.result||""));setRecipeReadOpen(true);};
  reader.onerror=()=>setRecipePhotoError("Kuvan avaaminen epäonnistui.");
  reader.readAsDataURL(file);
};
const [expandedRecipe,setExpandedRecipe]=React.useState<string|null>(null);
const [activeRecipe,setActiveRecipe]=React.useState<{id:string|null;title:string}>({id:null,title:""});
React.useEffect(()=>{if(!open)return;try{const active=JSON.parse(sessionStorage.getItem("ziiply-justiina-recipe-draft-v1")||"null");const id=sessionStorage.getItem("ziiply-justiina-active-recipe-id-v1");setActiveRecipe({id:id||null,title:String(active?.draft?.title||"").trim()})}catch{}},[open]);
React.useEffect(()=>{const refresh=()=>{try{const stored=JSON.parse(localStorage.getItem("ziiply-desktop-vihkonen-recipes-v1")||"[]");if(Array.isArray(stored))setRecipes(stored)}catch{}};refresh();window.addEventListener("ziiply-vihkonen-recipes-changed",refresh);return()=>window.removeEventListener("ziiply-vihkonen-recipes-changed",refresh)},[]);
const saveRecipes=(next:Recipe[])=>{try{localStorage.setItem("ziiply-desktop-vihkonen-recipes-v1",JSON.stringify(next));setRecipes(next);window.dispatchEvent(new Event("ziiply-vihkonen-recipes-changed"));return true}catch{setRecipeSaveNotice("Tallennus epäonnistui. Tarkista selaimen tallennustila.");return false}};
const [cardBounds,setCardBounds]=React.useState<{top:number;bottom:number}|null>(null);
React.useLayoutEffect(()=>{if(!open)return;const update=()=>{const row=document.querySelector("[data-desktop-card-row]");if(!row)return;const box=row.getBoundingClientRect();const css=getComputedStyle(row);const top=Math.round(box.top+parseFloat(css.paddingTop||"0"));const bottom=Math.round(box.bottom-parseFloat(css.paddingBottom||"0"));setCardBounds({top,bottom});};update();window.addEventListener("resize",update);window.addEventListener("scroll",update,true);return()=>{window.removeEventListener("resize",update);window.removeEventListener("scroll",update,true)};},[open]);
if(!open)return null;
return <div className="fixed inset-0 z-[95] bg-[#17352a]/10">
<section role="dialog" aria-modal="true" aria-label="Vihkonen" style={cardBounds?{top:`${cardBounds.top}px`,height:`${Math.max(280,cardBounds.bottom-cardBounds.top)}px`,maxHeight:"none"}:undefined} className={`fixed left-1/2 top-[16vh] flex h-[min(76vh,760px)] ${focusRecipes?"w-[min(590px,calc(100vw-32px))]":"w-[min(1180px,calc(100vw-32px))]"} max-h-[calc(100dvh-48px)] max-w-[calc(100vw-32px)] -translate-x-1/2 flex-col overflow-visible rounded-[32px] border-[4px] border-[#76502e] bg-[#f8edd7] shadow-[0_30px_90px_rgba(20,40,31,.35)]`}>


<header className="relative z-10 mx-7 shrink-0 border-b border-[#cbb583] px-5 pb-3 pt-5 text-center"><h2 className="font-serif text-[clamp(30px,3vw,46px)] font-black italic text-[#174c3a]">Vihkonen</h2></header>
<main className={`relative z-20 grid min-h-0 flex-1 gap-4 overflow-visible px-6 py-5 ${focusRecipes?"grid-cols-1":"grid-cols-2"}`}>
<section className={`${focusRecipes?"hidden":"flex"} min-h-0 flex-col rounded-2xl border-2 border-[#b89552] bg-[#fff6d9]/60 p-4`}><h3 className="mb-3 shrink-0 text-center font-serif text-2xl font-black text-[#174c3a]">Ostelusvihko</h3><div className="min-h-0 flex-1 space-y-3 overflow-y-auto">{lists.length===0?<p className="text-center text-sm text-[#76684f]">Ei vielä tallennettuja ostoslistoja.</p>:lists.map(list=><article key={list.id} className="rounded-xl border border-[#b89552] bg-[#fff6d9] p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="break-words font-black text-[#26352b]">{list.name}</div><div className="text-xs text-[#76684f]">{new Date(list.createdAt).toLocaleDateString("fi-FI")} · {list.items.length} tuotetta</div></div><button onClick={()=>onDeleteList(list.id)} className="rounded-full border border-[#9a4e3e] px-2 py-1 text-xs font-bold text-[#8b3d31]">Poista</button></div><button onClick={()=>onRestoreList(list)} className="mt-3 rounded-full border border-[#315d45] bg-[#dfead4] px-3 py-2 text-xs font-black text-[#174c3a]">Laita ostoskoriin</button></article>)}</div></section>
<section className="relative z-30 flex min-h-0 flex-col overflow-visible rounded-2xl border-2 border-[#b89552] bg-[#fff6d9]/60 p-4"><div className="mb-3 grid h-[clamp(76px,10vw,126px)] shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3"><div className="flex h-full min-w-0 items-center justify-center"><button type="button" onClick={()=>void recipeVoice.toggle()} disabled={recipeVoice.state==="processing"} aria-pressed={recipeVoice.state==="recording"} aria-label={recipeVoice.state==="recording"?"Lopeta reseptin sanelu":"Sanele resepti"} title="Sanele resepti" className="relative h-full w-full min-w-0 overflow-hidden rounded-[18px] border-2 border-[#c89b44] bg-gradient-to-b from-[#2f3326] to-[#0f140f] disabled:opacity-60"><img src={recipeVoice.state==="recording"?"/ui/voice/aanita-on.webp":recipeVoice.state==="processing"?"/ui/voice/aanita-search.webp":"/ui/voice/aanita-off.webp"} alt="" className="absolute inset-[4%] h-[92%] w-[92%] object-contain"/></button></div><h3 className="min-w-0 whitespace-nowrap text-center font-serif text-[clamp(24px,3vw,42px)] font-black text-[#174c3a]">Reseptit</h3><div className="flex h-full min-w-0 items-center justify-center"><button type="button" onClick={()=>{if(recipeReadOpen){stopRecipeCamera();setRecipeReadOpen(false);}else{setRecipePhoto(null);setRecipeOcrText("");setRecipeReadOpen(true);}}} aria-expanded={recipeReadOpen} aria-label="Lue resepti kuvasta" title="Lue resepti kuvasta" className="relative h-full w-full min-w-0 overflow-hidden rounded-[18px] border-2 border-[#c89b44] bg-gradient-to-b from-[#2f3326] to-[#0f140f]"><img src="/ui/scanner/scanner-idle.webp" alt="" className="absolute inset-[4%] h-[92%] w-[92%] object-contain"/></button></div></div>{focusRecipes&&<button type="button" onClick={()=>setFocusRecipes(false)} className="mb-2 self-start rounded-lg border border-[#b89552] px-3 py-1 text-xs font-bold">← Koko Vihkonen</button>}<div className="flex shrink-0 flex-wrap gap-2"><input aria-label="Hae resepti" value={recipeQuery} onChange={event=>setRecipeQuery(event.target.value)} placeholder="Hae reseptiä omista..." className="min-w-0 flex-1 rounded-lg border border-[#b89552] bg-white px-3 py-2 text-sm"/><button type="button" onClick={()=>{setRecipeSaveNotice("");if(recipeEditing){setRecipeEditing(false)}else{setRecipeTitle("");setRecipeIngredients("");setRecipeInstructions("");setRecipeEditing(true)}}} className="rounded-lg bg-[#174c3a] px-3 py-2 text-xs font-bold text-white">{recipeEditing?"Peruuta":"Luo resepti"}</button></div>
{!focusRecipes&&recipeVoice.message&&<p role="status" className="mt-2 text-xs font-bold text-[#174c3a]">{recipeVoice.message}</p>}
{recipeReadOpen&&<div role="dialog" aria-label="Reseptiskanneri" className="absolute inset-0 z-30 flex min-h-0 flex-col overflow-hidden rounded-2xl border-2 border-[#b89552] bg-[#14241c] p-3">
<div className="flex shrink-0 items-center justify-between"><div className="flex items-center gap-4"><h4 className="font-serif text-lg font-bold text-[#fff6d9]">Kuvaa resepti</h4>{recipeOcrText&&<span className="text-sm font-bold text-[#fff6d9]">Tarkasta / muokkaa</span>}</div><button type="button" onClick={()=>{stopRecipeCamera();setRecipeReadOpen(false);setRecipePhoto(null);setRecipeOcrText("");setRecipePhotoError("");}} aria-label="Sulje reseptiskanneri" className="rounded-lg border border-[#b89552] px-3 py-1 text-lg text-white">×</button></div>
<div className="my-2 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl bg-black">
{recipeOcrText?<div className="flex h-full w-full min-h-0 flex-col"><textarea aria-label="Tunnistettu reseptiteksti" value={recipeOcrText} onChange={e=>setRecipeOcrText(e.target.value)} spellCheck={false} className="h-full w-full resize-none overflow-y-auto rounded-xl border-0 bg-[#fffdf5] p-4 text-base leading-relaxed text-[#20392d] outline-none sm:text-lg"/></div>:recipeCameraLive?<div className="relative h-full w-full"><video ref={recipeVideo} autoPlay muted playsInline aria-label="Kameran suora kuva" className="h-full w-full object-contain"/>{recipeCountdown!==null&&<div aria-live="polite" className="absolute inset-0 flex items-center justify-center bg-black/30 text-[clamp(72px,12vw,150px)] font-black text-white">{recipeCountdown||"●"}</div>}</div>:recipePhoto?<img src={recipePhoto} alt="Otettu reseptikuva" className="h-full w-full object-contain"/>:null}
</div>

<div className="flex shrink-0 flex-wrap justify-center gap-3">
{recipePhoto?<><button type="button" onClick={()=>{setRecipePhoto(null);setRecipeOcrText("");void startRecipeCamera(true);}} className="rounded-lg bg-[#e4d6ac] px-5 py-2 text-sm font-bold text-[#14241c]">Ota uusi</button>{!recipeOcrText&&<button type="button" disabled={recipeOcrBusy} onClick={()=>void readRecipeImage()} className="rounded-lg border border-white px-5 py-2 text-sm font-bold text-white">{recipeOcrBusy?"Luetaan…":"Lue resepti"}</button>}<button type="button" onClick={()=>{stopRecipeCamera();setRecipeReadOpen(false);setRecipePhoto(null);setRecipeOcrText("");}} className="rounded-lg border border-white px-5 py-2 text-sm font-bold text-white">Peruuta</button>{recipeOcrText&&<button type="button" onClick={applyRecipeOcr} className="rounded-lg bg-[#e4d6ac] px-5 py-2 text-sm font-bold">Tallenna</button>}</>:<><button type="button" onClick={recipeCameraLive?startTimedRecipeCapture:()=>void startRecipeCamera(true)} disabled={recipeCameraBusy||recipeCountdown!==null} className="rounded-lg bg-[#e4d6ac] px-5 py-2 text-sm font-bold text-[#14241c]">Ota kuva</button><button type="button" onClick={()=>{stopRecipeCamera();recipeFileInput.current?.click();}} className="rounded-lg border border-white px-5 py-2 text-sm font-bold text-white">Liitä kuva</button><button type="button" onClick={()=>{stopRecipeCamera();setRecipeReadOpen(false);}} className="rounded-lg border border-white px-5 py-2 text-sm font-bold text-white">Peruuta</button></>}
</div>
<input ref={recipeFileInput} type="file" accept="image/*" aria-label="Liitä reseptikuva" className="hidden" onChange={e=>{stopRecipeCamera();handleRecipePhoto(e.target.files?.[0]);e.target.value="";}}/>
{recipePhotoError&&<p role="alert" className="shrink-0 text-xs text-red-300">{recipePhotoError}</p>}</div>}
{recipeSaveNotice&&<p role="status" className="mt-2 text-center text-xs font-bold text-[#174c3a]">{recipeSaveNotice}</p>}
{recipeEditing&&createPortal(<div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#17352a]/30 p-3"><form onSubmit={event=>{event.preventDefault();if(!recipeTitle.trim()||!recipeIngredients.trim()){setRecipeSaveNotice("Täytä nimi ja vähintään yksi aines.");return}const saved=saveRecipes([{id:String(Date.now()),title:recipeTitle.trim(),ingredients:recipeIngredients.trim(),instructions:recipeInstructions.trim(),createdAt:new Date().toISOString()},...recipes]);if(saved){setRecipeTitle("");setRecipeIngredients("");setRecipeInstructions("");setRecipeEditing(false);setRecipeSaveNotice("Resepti tallennettu Vihkoseen.")}}} className="flex w-full max-w-[540px] flex-col gap-3 rounded-2xl border-[3px] border-[#b89552] bg-[#fffdf5] p-4 shadow-2xl sm:p-5">
<label className="shrink-0 text-xs font-bold text-[#27412a]">Nimi<input autoFocus required placeholder="Esim. sköödi" value={recipeTitle} onChange={e=>setRecipeTitle(e.target.value)} className="mt-1 w-full rounded-lg border border-[#b89552] bg-white px-3 py-2 text-sm font-normal"/></label>
<label className="flex flex-col text-xs font-bold text-[#27412a]">Ainekset<textarea required placeholder={"Esim. 600 g lohta\\n1 tl suolaa"} value={recipeIngredients} onChange={e=>setRecipeIngredients(e.target.value)} rows={3} className="mt-1 min-h-[68px] w-full resize-none rounded-lg border border-[#b89552] bg-white px-3 py-2 text-sm font-normal"/></label>
<label className="flex flex-col text-xs font-bold text-[#27412a]">Valmistusohje (valinnainen)<textarea placeholder="Kirjoita valmistusohje tähän" value={recipeInstructions} onChange={e=>setRecipeInstructions(e.target.value)} rows={3} className="mt-1 min-h-[68px] w-full resize-none rounded-lg border border-[#b89552] bg-white px-3 py-2 text-sm font-normal"/></label>
<div className="flex shrink-0 items-center justify-center gap-2 pt-1"><button type="button" onClick={()=>setRecipeEditing(false)} className="rounded-lg border border-[#b89552] px-4 py-2 text-xs font-bold">Peruuta</button><button type="submit" disabled={!recipeTitle.trim()||!recipeIngredients.trim()} className="rounded-lg bg-[#174c3a] px-5 py-2 text-xs font-bold text-white disabled:opacity-40">Tallenna</button></div>
</form></div>,document.body)}

{!recipeEditing&&!recipeReadOpen&&<div onMouseEnter={()=>{if(!recipeReadOpen)setRecipeListOpen(true)}} onMouseLeave={()=>setRecipeListOpen(false)} className="group/recipes relative z-[60] mt-3 min-h-0 flex-1"><div className={`absolute inset-x-0 top-0 z-[70] space-y-2 overflow-y-auto rounded-xl bg-[#fff6d9] transition-[max-height,box-shadow] duration-150 ${recipeListOpen&&!recipeReadOpen?"max-h-[min(66vh,540px)] p-1 shadow-[0_14px_32px_rgba(20,40,31,.25)]":"max-h-full"}`} data-recipe-list="true">{recipes.filter(recipe=>[recipe.title,recipe.ingredients].join(" ").toLowerCase().includes(recipeQuery.toLowerCase())).map(recipe=><article key={recipe.id} className="rounded-xl border border-[#b89552] bg-[#fff6d9] p-3"><div className="flex items-center justify-between gap-2"><button onClick={()=>setExpandedRecipe(expandedRecipe===recipe.id?null:recipe.id)} className="min-w-0 text-left font-black text-[#26352b]">{recipe.title} {expandedRecipe===recipe.id?"▴":"▾"}</button><div className="flex shrink-0 items-center gap-2">{!(activeRecipe.id===recipe.id||(!activeRecipe.id&&activeRecipe.title.trim().toLowerCase()===recipe.title.trim().toLowerCase()))&&<button type="button" onClick={()=>{try{sessionStorage.setItem("ziiply-justiina-active-recipe-id-v1",recipe.id)}catch{};setActiveRecipe({id:recipe.id,title:recipe.title});onClose();window.dispatchEvent(new CustomEvent("ziiply-vihkonen-recipe-select",{detail:recipe}))}} className="rounded-full bg-[#174c3a] px-3 py-1 text-xs font-bold text-white">Vaihda</button>}<button onClick={()=>saveRecipes(recipes.filter(r=>r.id!==recipe.id))} className="rounded-full border border-[#9a4e3e] px-2 py-1 text-xs font-bold text-[#8b3d31]">Poista</button></div></div>{expandedRecipe===recipe.id&&<div className="mt-2 whitespace-pre-wrap text-sm"><strong>Ainekset</strong><p>{recipe.ingredients}</p>{recipe.instructions&&<><strong className="mt-2 block">Valmistusohje</strong><p>{recipe.instructions}</p></>}<button onClick={()=>{onClose();window.dispatchEvent(new CustomEvent("ziiply-vihkonen-recipe-select",{detail:recipe}))}} className="mt-3 rounded-full bg-[#174c3a] px-4 py-2 text-xs font-bold text-white">Valitse resepti</button></div>}</article>)}{recipes.length===0&&<p className="text-center text-sm text-[#76684f]">Ei vielä tallennettuja reseptejä.</p>}</div></div>}</section>
</main>
<footer className="relative z-10 flex shrink-0 items-center justify-center px-5 pb-[26px] pt-[10px]"><button aria-label="Sulje ostelusvihko" onClick={onClose} className="absolute left-5 top-[10px] grid h-[58px] w-[58px] place-items-center rounded-full border-[4px] border-[#643a22] bg-[#a56c34] text-[32px] font-black text-white">×</button><button onClick={onSaveCurrentCart} disabled={!currentCartCount} aria-label="Tallenna nykyinen kori" title="Tallenna nykyinen kori" className="rounded-full border-[3px] border-[#91a17d] bg-[#fff3d4]/80 px-9 py-3 text-[clamp(14px,1.2vw,18px)] font-black text-[#537459] disabled:cursor-not-allowed disabled:opacity-50"><svg aria-hidden="true" viewBox="0 0 72 64" className="h-[54px] w-[62px]" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="36" cy="56" rx="28" ry="5" fill="#a58b69" opacity=".35"/><path d="M34 7c-7 0-12 5-12 12 0 6 4 10 8 12v7h12v-7c4-2 8-6 8-12 0-7-5-12-12-12h-4Z" fill="#9A6338" stroke="#603D28" strokeWidth="3" strokeLinejoin="round"/><path d="M30 13c-2 2-3 5-3 8" stroke="#DAB486" strokeWidth="3" strokeLinecap="round"/><path d="M29 36h14l4 9H25l4-9Z" fill="#C18A50" stroke="#603D28" strokeWidth="3" strokeLinejoin="round"/><path d="M16 45h40c3 0 5 2 5 5v5H11v-5c0-3 2-5 5-5Z" fill="#B77B43" stroke="#603D28" strokeWidth="3" strokeLinejoin="round"/><path d="M17 50h38" stroke="#E3BA84" strokeWidth="2" strokeLinecap="round"/><path d="M14 55h44" stroke="#603D28" strokeWidth="3" strokeLinecap="round"/></svg></button></footer>
</section></div>;
}
