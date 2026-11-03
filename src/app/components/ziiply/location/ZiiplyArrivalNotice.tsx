"use client";
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { arrivalNoticeReducer, type ArrivalNotice } from './ziiplyArrivalNotice';
import type { ZiiplyArrivalDecision } from './ziiplyArrivalSequence';
import { recordArrivalDiagnostic } from './ziiplyArrivalDiagnostics';

export function useZiiplyArrivalNotice(enabled:boolean) {
 const [notice,dispatch]=useReducer(arrivalNoticeReducer,null);
 const pending=useRef<{decision:ZiiplyArrivalDecision;at:number}|null>(null);
 const [active,setActive]=useReducer((_:boolean,next:boolean)=>next,false);
 const activeRef=useRef(false);
 const lastInteraction=useRef(0);
 const delivered=useRef(new Set<string>());
 const visible=()=>activeRef.current&&document.visibilityState==='visible'&&document.hasFocus()&&Date.now()-lastInteraction.current<15000;
 const update=useCallback((decision:ZiiplyArrivalDecision,at:number)=>{
   recordArrivalDiagnostic('arrival-decision',{status:decision.status,store:decision.store?.name??null,selected:decision.isSelectedStore,arrival:decision.showArrivalMessage,radar:decision.radar});
   window.dispatchEvent(new CustomEvent('ziiply-arrival-debug',{detail:{source:'main',status:decision.status,store:decision.store?.name??null,selected:decision.isSelectedStore,arrival:decision.showArrivalMessage,radar:decision.radar}}));
   if(enabled&&decision.showArrivalMessage&&decision.isSelectedStore&&decision.store&&!delivered.current.has(decision.store.id)){
     if(visible()){delivered.current.add(decision.store.id);dispatch({type:'sample',decision,at});}
     else {pending.current=null;recordArrivalDiagnostic('arrival-suppressed-inactive',{store:decision.store.name});}
   }
   if(decision.status==='checking'&&!decision.state.arrivalStoreId){
     if(delivered.current.size) dispatch({type:'reset'});
     delivered.current.clear();pending.current=null;
   }
 },[enabled]);
 useEffect(()=>{if(!enabled){dispatch({type:'reset'});pending.current=null;}},[enabled]);
 useEffect(()=>{
  const activity=()=>{if(document.visibilityState!=='visible'||!document.hasFocus())return;lastInteraction.current=Date.now();activeRef.current=true;setActive(true);dispatch({type:'resume',at:Date.now()});};
  const inactive=()=>{dispatch({type:'pause',at:Date.now()});activeRef.current=false;setActive(false);pending.current=null;};
  const visibility=()=>{if(document.visibilityState!=='visible'||!document.hasFocus())inactive();};
  document.addEventListener('pointerdown',activity,true);
  document.addEventListener('keydown',activity,true);
  document.addEventListener('visibilitychange',visibility);
  window.addEventListener('blur',inactive);
  window.addEventListener('focus',visibility);
  return ()=>{
   document.removeEventListener('pointerdown',activity,true);
   document.removeEventListener('keydown',activity,true);
   document.removeEventListener('visibilitychange',visibility);
   window.removeEventListener('blur',inactive);
   window.removeEventListener('focus',visibility);
  };
 },[]);
 useEffect(()=>{
  if(!enabled||!active||!notice||notice.phase==='done')return;
  const timer=window.setInterval(()=>{
   if(!visible()){dispatch({type:'pause',at:Date.now()});activeRef.current=false;setActive(false);return;}
   dispatch({type:'tick',at:Date.now()});
  },250);
  return ()=>window.clearInterval(timer);
 },[enabled,active,notice]);
 useEffect(()=>{window.dispatchEvent(new CustomEvent('ziiply-arrival-debug',{detail:{source:'main-ui',phase:enabled?notice?.phase??'none':'disabled',store:notice?.name??null}}));},[enabled,notice?.phase,notice?.name]);
 return {notice:enabled&&active?notice:null,update,dismiss:()=>dispatch({type:'dismiss'}),skip:()=>dispatch({type:'skip',at:Date.now()})};
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
   {notice.phase==='approach'&&<div className="mb-4 text-xl font-extrabold">Olet saapumassa kauppaan {notice.name}</div>}
   {notice.phase==='list'&&<>
    <div className="mb-4 text-xl font-extrabold">Lisätäänkö reseptit tai ostoslistat?</div>
    <div className="flex flex-wrap justify-center gap-3">
     <button type="button" className={button} onClick={onRecipe}>Reseptit</button>
     <button type="button" className={button} onClick={onList}>Ostoslista</button>
    </div>
   </>}
   {notice.phase==='offers'&&<>
    <div className="mb-4 text-xl font-extrabold">Katsotaanko tarjoukset?</div>
    <button type="button" className={button} onClick={onOffers}>Näytä tarjoukset</button>
   </>}
  </div>
 </div>;
}
