"use client";
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { arrivalNoticeReducer, type ArrivalNotice } from './ziiplyArrivalNotice';
import type { ZiiplyArrivalDecision } from './ziiplyArrivalSequence';
import { getArrivalDiagnostics, recordArrivalDiagnostic } from './ziiplyArrivalDiagnostics';

export function useZiiplyArrivalNotice(enabled:boolean) {
 const [notice,dispatch]=useReducer(arrivalNoticeReducer,null);
 useEffect(()=>{
  const onDebugClick=(event:MouseEvent)=>{
   const target=event.target instanceof Element ? event.target : null;
   const button=target?.closest('button,[role="button"]');
   if(!button || !/GPS\\s*debug/i.test(button.textContent||''))return;
   event.preventDefault();
   event.stopPropagation();
   let panel=document.getElementById('ziiply-unified-gps-debug') as HTMLDivElement|null;
   if(panel){panel.remove();return;}
   panel=document.createElement('div');
   panel.id='ziiply-unified-gps-debug';
   panel.style.cssText='position:fixed;inset:8% 3% 9%;z-index:2147483647;background:#101614;color:#b8ffcb;border:2px solid white;border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:8px;font:12px/1.4 monospace;box-shadow:0 0 0 100vmax rgba(0,0,0,.5)';
   const toolbar=document.createElement('div');toolbar.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap';
   const title=document.createElement('strong');title.textContent='GPS DEBUG – kauppaan saapuminen + nopeusrajoitus';toolbar.appendChild(title);
   const makeButton=(label:string,action:()=>void)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='padding:8px;background:#fff;color:#111;border-radius:7px';b.onclick=action;toolbar.appendChild(b);return b;};
   const output=document.createElement('pre');output.style.cssText='white-space:pre-wrap;overflow-wrap:anywhere;overflow:auto;flex:1;margin:0';
   const collect=()=>{
    const arrival=getArrivalDiagnostics().map(e=>new Date(e.at).toLocaleTimeString('fi-FI')+' '+e.event+' '+JSON.stringify(e.detail)).join('\\n');
    const speed=document.getElementById('mobile-speed-limit-debug-history')?.textContent||'Ei nopeusrajoituslokia';
    return 'KAUPPAAN SAAPUMINEN\\n'+(arrival||'Ei saapumistapahtumia – tarkista että saapumisseuranta on käytössä')+'\\n\\nNOPEUSRAJOITUS\\n'+speed;
   };
   const refresh=()=>{output.textContent=collect();};
   makeButton('Päivitä',refresh);
   const copy=makeButton('Kopioi koko loki',()=>{void navigator.clipboard.writeText(collect()).then(()=>{copy.textContent='Kopioitu';}).catch(()=>{copy.textContent='Kopiointi epäonnistui';});});
   makeButton('Sulje',()=>panel?.remove());
   panel.append(toolbar,output);document.body.appendChild(panel);refresh();
  };
  // Keep the legacy speed logger collecting events, but never show its separate floating panel.
  // Its history remains available to the single GPS debug window.
  const hideLegacySpeedPanel=()=>{
   const legacy=document.getElementById('mobile-speed-limit-debug') as HTMLElement|null;
   if(legacy&&legacy.style.visibility!=='hidden'){
    legacy.style.visibility='hidden';
    legacy.style.pointerEvents='none';
   }
  };
  const legacyObserver=new MutationObserver(hideLegacySpeedPanel);
  legacyObserver.observe(document.body,{childList:true,subtree:true});
  hideLegacySpeedPanel();
  document.addEventListener('click',onDebugClick,true);
  return ()=>{legacyObserver.disconnect();document.removeEventListener('click',onDebugClick,true);};
 },[]);

 const pending=useRef<{decision:ZiiplyArrivalDecision;at:number}|null>(null);
 const [active,setActive]=useReducer((_:boolean,next:boolean)=>next,false);
 const activeRef=useRef(false);
 const lastInteraction=useRef(0);
 const delivered=useRef(new Set<string>());
 const visible=()=>activeRef.current&&document.visibilityState==='visible'&&document.hasFocus()&&Date.now()-lastInteraction.current<15000;
 const update=useCallback((decision:ZiiplyArrivalDecision,at:number)=>{
   recordArrivalDiagnostic('arrival-decision',{status:decision.status,store:decision.store?.name??null,storeId:decision.store?.id??null,selected:decision.isSelectedStore,arrival:decision.showArrivalMessage,mismatch:decision.askStoreChange,radar:decision.radar,confirmedStoreId:decision.state.arrivalStoreId,stationarySamples:decision.state.stationarySamples??0,candidateSamples:decision.state.candidateSamples??0,candidateStoreId:decision.state.candidateStoreId??null,departureSamples:decision.state.departureSamples??0,enabled,visible:visible()});
   window.dispatchEvent(new CustomEvent('ziiply-arrival-debug',{detail:{source:'main',status:decision.status,store:decision.store?.name??null,selected:decision.isSelectedStore,arrival:decision.showArrivalMessage,radar:decision.radar}}));
   if(enabled&&decision.showArrivalMessage&&decision.isSelectedStore&&decision.store&&!delivered.current.has(decision.store.id)){
     if(visible()){delivered.current.add(decision.store.id);recordArrivalDiagnostic('arrival-notification-start',{storeId:decision.store.id,store:decision.store.name,phase:'approach'});dispatch({type:'sample',decision,at});}
     else {pending.current={decision,at};recordArrivalDiagnostic('arrival-suppressed-inactive',{store:decision.store.name,storeId:decision.store.id,visibility:document.visibilityState,focused:document.hasFocus(),active:activeRef.current,interactionAgeMs:Date.now()-lastInteraction.current});}
   }
   if(decision.status==='checking'&&!decision.state.arrivalStoreId){
     if(delivered.current.size){recordArrivalDiagnostic('arrival-notification-reset',{reason:'outside-store',deliveredCount:delivered.current.size});dispatch({type:'reset'});}
     delivered.current.clear();pending.current=null;
   }
 },[enabled]);
 useEffect(()=>{if(!enabled){recordArrivalDiagnostic('arrival-notification-reset',{reason:'disabled'});dispatch({type:'reset'});pending.current=null;}},[enabled]);
 useEffect(()=>{
  const activity=()=>{if(document.visibilityState!=='visible'||!document.hasFocus())return;lastInteraction.current=Date.now();activeRef.current=true;setActive(true);recordArrivalDiagnostic('arrival-notification-resume',{reason:'user-activity'});dispatch({type:'resume',at:Date.now()});const queued=pending.current;if(queued&&enabled&&queued.decision.isSelectedStore&&queued.decision.store&&!delivered.current.has(queued.decision.store.id)){pending.current=null;delivered.current.add(queued.decision.store.id);recordArrivalDiagnostic('arrival-notification-start',{storeId:queued.decision.store.id,store:queued.decision.store.name,phase:'approach',reason:'resumed'});dispatch({type:'sample',decision:queued.decision,at:Date.now()});}};
  const inactive=()=>{recordArrivalDiagnostic('arrival-notification-pause',{visibility:document.visibilityState,focused:document.hasFocus()});dispatch({type:'pause',at:Date.now()});activeRef.current=false;setActive(false);};
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
   if(!visible()){recordArrivalDiagnostic('arrival-notification-pause',{reason:'inactive-timer',visibility:document.visibilityState,focused:document.hasFocus(),interactionAgeMs:Date.now()-lastInteraction.current});dispatch({type:'pause',at:Date.now()});activeRef.current=false;setActive(false);return;}
   dispatch({type:'tick',at:Date.now()});
  },250);
  return ()=>window.clearInterval(timer);
 },[enabled,active,notice]);
 useEffect(()=>{const phase=enabled?notice?.phase??'none':'disabled';recordArrivalDiagnostic('arrival-notification-phase',{phase,store:notice?.name??null,deadline:notice?.deadline??null,paused:!!notice&&notice.deadline===null&&notice.remainingMs!=null});window.dispatchEvent(new CustomEvent('ziiply-arrival-debug',{detail:{source:'main-ui',phase,store:notice?.name??null}}));},[enabled,notice?.phase,notice?.name]);
 return {notice:enabled&&active?notice:null,update,dismiss:()=>{recordArrivalDiagnostic('arrival-notification-dismiss',{phase:notice?.phase??null});dispatch({type:'dismiss'});},skip:()=>{recordArrivalDiagnostic('arrival-notification-skip',{phase:notice?.phase??null});dispatch({type:'skip',at:Date.now()});}};
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
