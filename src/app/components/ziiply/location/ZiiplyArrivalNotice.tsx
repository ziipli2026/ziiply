"use client";
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { arrivalNoticeReducer, type ArrivalNotice } from './ziiplyArrivalNotice';
import type { ZiiplyArrivalDecision } from './ziiplyArrivalSequence';
import { recordArrivalDiagnostic } from './ziiplyArrivalDiagnostics';

export function useZiiplyArrivalNotice(enabled:boolean) {
 const [notice,dispatch]=useReducer(arrivalNoticeReducer,null);
 const pending=useRef<{decision:ZiiplyArrivalDecision;at:number}|null>(null);
 const lastInteraction=useRef(0);
 const delivered=useRef(new Set<string>());
 const visible=()=>document.visibilityState==='visible'&&document.hasFocus()&&Date.now()-lastInteraction.current<15000;
 const update=useCallback((decision:ZiiplyArrivalDecision,at:number)=>{
   recordArrivalDiagnostic('arrival-decision',{status:decision.status,store:decision.store?.name??null,selected:decision.isSelectedStore,arrival:decision.showArrivalMessage,radar:decision.radar});
   window.dispatchEvent(new CustomEvent('ziiply-arrival-debug',{detail:{source:'main',status:decision.status,store:decision.store?.name??null,selected:decision.isSelectedStore,arrival:decision.showArrivalMessage,radar:decision.radar}}));
   if(decision.showArrivalMessage&&decision.store&&!delivered.current.has(decision.store.id)){
     if(visible()){delivered.current.add(decision.store.id);dispatch({type:'sample',decision,at});}
     else {pending.current={decision,at};recordArrivalDiagnostic('arrival-deferred',{store:decision.store.name});}
   }
   if(decision.status==='checking'&&!decision.state.arrivalStoreId){
     if(delivered.current.size) dispatch({type:'reset'});
     delivered.current.clear();pending.current=null;
   }
 },[]);
 useEffect(()=>{if(!enabled){dispatch({type:'reset'});pending.current=null;}},[enabled]);
 useEffect(()=>{
   const interaction=()=>{
     lastInteraction.current=Date.now();
     const p=pending.current;
     if(!p||document.visibilityState!=='visible'||!document.hasFocus())return;
     pending.current=null;
     if(p.decision.store&&!delivered.current.has(p.decision.store.id)){
       delivered.current.add(p.decision.store.id);
       dispatch({type:'sample',decision:p.decision,at:Date.now()});
       recordArrivalDiagnostic('arrival-resumed',{store:p.decision.store.name});
     }
   };
   document.addEventListener('pointerdown',interaction,true);
   document.addEventListener('keydown',interaction,true);
   return ()=>{document.removeEventListener('pointerdown',interaction,true);document.removeEventListener('keydown',interaction,true);};
 },[]);
 useEffect(()=>{window.dispatchEvent(new CustomEvent('ziiply-arrival-debug',{detail:{source:'main-ui',phase:enabled?notice?.phase??'none':'disabled',store:notice?.name??null}}));},[enabled,notice?.phase,notice?.name]);
 return {notice:enabled?notice:null,update,dismiss:()=>dispatch({type:'dismiss'}),skip:()=>dispatch({type:'skip',at:Date.now()})};
}
export default function ZiiplyArrivalNotice({notice,onDismiss,onSkip,onList,onRecipe,onOffers,onConfirm}:{
 notice:ArrivalNotice|null;onDismiss:()=>void;onSkip:()=>void;onList:()=>void;onRecipe:()=>void;onOffers:()=>void;onConfirm?:()=>void;
}) {
 const panel=useRef<HTMLDivElement>(null);
 const visible=!!notice&&notice.phase!=='done'&&notice.phase!=='waiting';
 useEffect(()=>{if(!visible)return;const previous=document.activeElement as HTMLElement|null;panel.current?.focus();return ()=>{if(previous?.isConnected)previous.focus();};},[visible]);
 if(!visible||!notice)return null;
 const button='rounded-xl border border-emerald-800 bg-white px-4 py-3 text-base font-bold text-emerald-950';
 return <div data-testid="gps-arrival-overlay" style={{position:'fixed',inset:0,zIndex:2147483646,display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'rgba(0,0,0,.40)'}}>
  <div ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Kauppaan saapuminen" onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();onDismiss();}}} style={{width:'100%',maxWidth:410,borderRadius:20,padding:24,color:'#103b25',background:'#e4f8e8',textAlign:'center'}}>
   <div className="mb-4 text-xl font-extrabold">Oletko kaupassa {notice.name}?</div>
   {!notice.selected&&<p className="mb-4 text-sm">Tämä ei ole valitsemasi kauppa. Kauppavalintaa ei muuteta automaattisesti.</p>}
   <div className="flex flex-wrap justify-center gap-3">
    <button type="button" className={button} onClick={()=>{onConfirm?.();onDismiss();}}>Kyllä, olen kaupassa</button>
    <button type="button" className={button} onClick={onDismiss}>En / Ei nyt</button>
   </div>
   <div className="mt-4 flex flex-wrap justify-center gap-2">
    <button type="button" className={button} onClick={onList}>Ostoslista</button>
    <button type="button" className={button} onClick={onRecipe}>Reseptit</button>
    <button type="button" className={button} onClick={onOffers}>Tarjoukset</button>
   </div>
  </div>
 </div>;
}
