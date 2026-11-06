"use client";
import React from "react";
import {onlineRecipeTitleMatches, onlineRecipeSearchPlan, onlineRecipeDisplayIngredients} from "./onlineRecipe";

type Recipe = {title:string;url:string;content:string};
export default function JustiinaOnlineRecipes({onSearchIngredients}:{onSearchIngredients?:(terms:string[])=>void}) {
 const [query,setQuery]=React.useState("");
 const [results,setResults]=React.useState<Recipe[]>([]);
 const [loading,setLoading]=React.useState(false);
 const [error,setError]=React.useState("");
 const [opened,setOpened]=React.useState<string|null>(null);
 React.useEffect(()=>{
  const q=query.trim().replace(/\*/g,"");
  setResults([]);setOpened(null);setError("");
  if(!q){setLoading(false);return}
  const controller=new AbortController();
  const timer=setTimeout(async()=>{
   setLoading(true);setResults([]);setError("");
   try {
    const api="https://fi.wikibooks.org/w/api.php?";
    const search=await Promise.all([q,"intitle:"+q].map(async term=>{
     const response=await fetch(api+new URLSearchParams({action:"query",generator:"search",gsrsearch:term,gsrnamespace:"0",gsrlimit:"50",prop:"info",inprop:"url",format:"json",origin:"*"}),{signal:controller.signal});
     if(!response.ok)throw new Error("Reseptipalvelu ei vastaa");
     return response.json();
    }));
    const pages=new Map<string,{title:string;fullurl:string}>();
    for(const data of search)for(const page of Object.values(data.query?.pages||{}) as {title:string;fullurl:string}[]){
     if(page.title?.startsWith("Keittokirja/")&&page.fullurl)pages.set(page.title,page);
    }
    let continuation:string|undefined;
    for(let i=0;i<12;i++){
     const params=new URLSearchParams({action:"query",generator:"allpages",gapnamespace:"0",gapprefix:"Keittokirja/",gaplimit:"500",prop:"info",inprop:"url",format:"json",origin:"*"});
     if(continuation)params.set("gapcontinue",continuation);
     const response=await fetch(api+params,{signal:controller.signal});
     if(!response.ok)break;
     const data=await response.json();
     for(const page of Object.values(data.query?.pages||{}) as {title:string;fullurl:string}[]){
      if(page.title?.startsWith("Keittokirja/")&&page.fullurl)pages.set(page.title,page);
     }
     continuation=data.continue?.gapcontinue;
     if(!continuation)break;
    }
    const matches=[...pages.values()].filter(p=>onlineRecipeTitleMatches(p.title,query)).slice(0,40);
    const recipes=(await Promise.all(matches.map(async p=>{
     try {
      const response=await fetch(api+new URLSearchParams({action:"parse",page:p.title,prop:"text",format:"json",origin:"*"}),{signal:controller.signal});
      if(!response.ok)return null;
      const data=await response.json();
      const html=data.parse?.text?.["*"];
      if(typeof html!=="string")return null;
      const doc=new DOMParser().parseFromString(html,"text/html");
      doc.querySelectorAll("script,style,.mw-editsection,.reference,.reflist,.navbox,.metadata").forEach(el=>el.remove());
      const text=(doc.querySelector(".mw-parser-output")||doc.body).textContent?.replace(/\n{3,}/g,"\n\n").trim()||"";
      return text.length>35?{title:p.title.replace(/^Keittokirja\//,""),url:p.fullurl,content:text.slice(0,10000)}:null;
     }catch{return null}
    }))).filter((r):r is Recipe=>r!==null);
    if(!controller.signal.aborted)setResults(recipes.filter(recipe=>onlineRecipeTitleMatches(recipe.title,query)));
   }catch(e){if(!controller.signal.aborted)setError("Reseptipalvelu ei vastaa. Yritä uudelleen.");}
   finally{if(!controller.signal.aborted)setLoading(false)}
  },300);
  return()=>{clearTimeout(timer);controller.abort()};
 },[query]);
 const save=(recipe:Recipe)=>{
  try {
   const key="ziiply-desktop-vihkonen-recipes-v1";
   const old=JSON.parse(localStorage.getItem(key)||"[]");
   const id="external-"+encodeURIComponent(recipe.url);
   const parts=recipe.content.split(/\n(?:Valmistus|Ohje|Valmistusohje)\s*\n/i);
   const ingredients=onlineRecipeDisplayIngredients(recipe.content);
   const entry={id,title:recipe.title,ingredients:ingredients.map(item=>item.amount+" "+item.name).join("\n"),instructions:parts.length>1?parts.slice(1).join("\n"):recipe.content,source:"muualta",category:"muualta",sourceUrl:recipe.url,sourceName:"Wikikirjasto / Keittokirja",createdAt:new Date().toISOString()};
   localStorage.setItem(key,JSON.stringify([entry,...(Array.isArray(old)?old:[]).filter((x:{id:string})=>x.id!==id)]));
   window.dispatchEvent(new Event("ziiply-vihkonen-recipes-changed"));
   setError("Resepti tallennettu.");
  }catch{setError("Tallennus epäonnistui.");}
 };
 return <div className="space-y-3 p-3 text-[#174c3a]">
  <label htmlFor="justiina-online-query" className="block font-bold">Hae reseptejä Wikikirjastosta</label>
  <input id="justiina-online-query" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Esim. lihapullat, lohi, pasta" className="w-full rounded-xl border border-[#b99d62] bg-white p-3"/>
  {loading&&<p role="status">Haetaan reseptejä…</p>}
  {error&&<p role="status">{error}</p>}
  {!loading&&query.trim()&&!error&&<p>{results.length?results.length+" reseptiosumaa":"Ei reseptejä tällä nimellä."}</p>}
  {results.map(recipe=><article key={recipe.url} className="rounded-xl border border-[#b99d62] bg-white p-3">
   <button type="button" className="w-full text-left font-bold underline" onClick={()=>setOpened(v=>v===recipe.url?null:recipe.url)}>{recipe.title}</button>
   {opened===recipe.url&&<div className="mt-2 space-y-2">
    <p className="max-h-64 overflow-auto whitespace-pre-wrap text-sm">{recipe.content}</p>
    <div className="flex flex-wrap gap-2">
     <button type="button" className="rounded-lg border border-[#174c3a] px-3 py-2" onClick={()=>{const plan=onlineRecipeSearchPlan(recipe.content,recipe.title);if(!plan.items.length){setError("Reseptistä ei löytynyt haettavia ainesosia.");return;}try{sessionStorage.setItem("ziiply-justiina-active-ingredients-v1",JSON.stringify({title:recipe.title,items:plan.items}));}catch{}onSearchIngredients?.(plan.terms);}}>Hae ainesosat</button>
     <button type="button" className="rounded-lg bg-[#174c3a] px-3 py-2 text-white" onClick={()=>save(recipe)}>Tallenna resepti</button>
     <a href={recipe.url} target="_blank" rel="noopener noreferrer" className="rounded-lg border px-3 py-2">Alkuperäinen resepti</a>
    </div>
   </div>}
  </article>)}
 </div>;
}
