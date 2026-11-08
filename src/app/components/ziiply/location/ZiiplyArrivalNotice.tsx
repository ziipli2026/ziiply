"use client";
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { arrivalNoticeReducer, type ArrivalNotice } from './ziiplyArrivalNotice';
import type { ZiiplyArrivalDecision } from './ziiplyArrivalSequence';
import { getArrivalDiagnostics, recordArrivalDiagnostic } from './ziiplyArrivalDiagnostics';

export function useZiiplyArrivalNotice(enabled:boolean) {
 const [notice,dispatch]=useReducer(arrivalNoticeReducer,null);
 const [storePrompt,setStorePrompt]=useState<{id:string;name:string}[]|null>(null);
 const promptRef=useRef(false);
 const pendingStoreChange=useRef<{decision:ZiiplyArrivalDecision;at:number}|null>(null);
 const openStorePicker=()=>{
   const buttons=Array.from(document.querySelectorAll('button,[role="button"]')) as HTMLElement[];
   const trigger=buttons.find(b=>!b.closest('[data-store-prompt]')&&/^(kaupat|valitse kauppa|vaihda kauppaa|kaupan valinta)$/i.test((b.textContent||'').trim()));
   recordArrivalDiagnostic('arrival-store-picker-trigger',{found:!!trigger});
   trigger?.click();
   promptRef.current=false;setStorePrompt(null);
 };
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
   const toolbar=document.createElement('div');toolbar.style.cssText='display:flex;flex-direction:column;align-items:stretch;gap:10px;flex:0 0 auto;min-width:0';
   const actions=document.createElement('div');actions.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;width:100%';
   const title=document.createElement('strong');title.textContent='GPS DEBUG – kauppaan saapuminen + nopeusrajoitus';title.style.cssText='display:block;line-height:1.35;white-space:normal;overflow-wrap:anywhere';toolbar.appendChild(title);toolbar.appendChild(actions);
   const makeButton=(label:string,action:()=>void)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='display:block;min-width:0;min-height:44px;width:100%;padding:10px 8px;background:#fff;color:#111;border:1px solid #cbd5d1;border-radius:8px;font:600 13px/1.3 system-ui,sans-serif;white-space:normal;overflow-wrap:anywhere;text-align:center;cursor:pointer;touch-action:manipulation';b.onclick=action;actions.appendChild(b);return b;};
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
 const delivered=useRef(new Set<string>());
 const visible=()=>document.visibilityState==='visible'&&document.hasFocus();
 const deliver=(decision:ZiiplyArrivalDecision,at:number)=>{
   if(!decision.store||delivered.current.has(decision.store.id))return;
   delivered.current.add(decision.store.id);
   pending.current=null;
   recordArrivalDiagnostic('arrival-notification-start',{storeId:decision.store.id,store:decision.store.name,phase:'approach'});
   dispatch({type:'sample',decision:{...decision,showArrivalMessage:true},at:Date.now()});
 };
 const update=useCallback((decision:ZiiplyArrivalDecision,at:number)=>{
   recordArrivalDiagnostic('arrival-decision',{status:decision.status,store:decision.store?.name??null,storeId:decision.store?.id??null,selected:decision.isSelectedStore,arrival:decision.showArrivalMessage,mismatch:decision.askStoreChange,radar:decision.radar,confirmedStoreId:decision.state.arrivalStoreId,stationarySamples:decision.state.stationarySamples??0,candidateSamples:decision.state.candidateSamples??0,candidateStoreId:decision.state.candidateStoreId??null,departureSamples:decision.state.departureSamples??0,enabled,visible:visible()});
   window.dispatchEvent(new CustomEvent('ziiply-arrival-debug',{detail:{source:'main',status:decision.status,store:decision.store?.name??null,selected:decision.isSelectedStore,arrival:decision.showArrivalMessage,radar:decision.radar}}));
   if(enabled&&decision.askStoreChange&&!visible()){
     pendingStoreChange.current={decision,at};
     recordArrivalDiagnostic('arrival-store-change-queued',{store:decision.store?.name??null});
   }
   if(enabled&&decision.askStoreChange&&visible()){
     const choices=decision.nearbyStoreChoices?.length?decision.nearbyStoreChoices:decision.store?[decision.store]:[];
     recordArrivalDiagnostic('arrival-store-change-requested',{stores:JSON.stringify(choices.map(s=>({id:s.id,name:s.name}))),ambiguous:choices.length>1});
     window.dispatchEvent(new CustomEvent('ziiply-arrival-store-change-requested',{detail:{stores:choices,ambiguous:choices.length>1}}));
     pendingStoreChange.current=null;
     if(choices.length&&!promptRef.current){
       promptRef.current=true;setStorePrompt(choices.map(s=>({id:s.id,name:s.name})));
       const overlay=document.createElement('div');overlay.id='ziiply-gps-store-change-dialog';
       overlay.style.cssText='position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px';
       const dialog=document.createElement('div');dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-label','Vaihda kauppa');
       dialog.style.cssText='background:#e4f8e8;color:#103b25;border-radius:20px;padding:24px;max-width:420px;width:100%;text-align:center;font:16px system-ui';
       const heading=document.createElement('h2');heading.textContent='Oletko eri kaupassa?';heading.style.cssText='font-size:22px;font-weight:800;margin-bottom:14px';
       const info=document.createElement('p');info.textContent='GPS tunnisti kaupan: '+choices.map(s=>s.name).join(', ')+'. Vaihdetaanko valittu kauppa?';info.style.marginBottom='20px';
       const actions=document.createElement('div');actions.style.cssText='display:flex;gap:10px;justify-content:center;flex-wrap:wrap';
       const makeButton=(label:string,handler:()=>void,primary:boolean)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='padding:12px 16px;border-radius:12px;font-weight:700;background:'+(primary?'#146c43':'white')+';color:'+(primary?'white':'#103b25');b.onclick=handler;actions.appendChild(b);};
       const close=()=>{overlay.remove();promptRef.current=false;setStorePrompt(null);};
       makeButton('Vaihda kauppa',()=>{const buttons=Array.from(document.querySelectorAll('button,[role="button"]')) as HTMLElement[];const target=choices.length===1?choices[0]:null;
         const normalized=(value:string)=>value.toLocaleLowerCase('fi-FI').replace(/\\s+/g,' ').trim();
         const cards=Array.from(document.querySelectorAll('div,article,section,li')).filter(el=>!el.closest('#ziiply-gps-store-change-dialog'));
         const card=target?cards.filter(el=>normalized(el.textContent||'').includes(normalized(target.name))&&Array.from(el.querySelectorAll('button')).some(b=>/^vaihda$/i.test((b.textContent||'').trim()))).sort((a,b)=>(a.textContent||'').length-(b.textContent||'').length)[0]:null;
         const changeButton=card?Array.from(card.querySelectorAll('button')).find(b=>/^vaihda$/i.test((b.textContent||'').trim())):null;
         const trigger=buttons.find(b=>!b.closest('#ziiply-gps-store-change-dialog')&&/^(kaupat|valitse kauppa|vaihda kauppaa|kaupan valinta)$/i.test((b.textContent||'').trim()));
         recordArrivalDiagnostic('arrival-store-picker-trigger',{found:!!changeButton||!!trigger,store:target?.name??null,direct:!!changeButton});
         close();if(changeButton)changeButton.click();else trigger?.click();},true);
       makeButton('Pidä nykyinen',()=>{recordArrivalDiagnostic('arrival-store-change-declined',{});close();},false);
       dialog.append(heading,info,actions);overlay.appendChild(dialog);document.body.appendChild(overlay);
       recordArrivalDiagnostic('arrival-store-change-prompt-visible',{stores:choices.map(s=>s.name).join(', ')});
     }
   }
   // Arrival is a latched state: do not lose the one-shot event while Safari is backgrounded.
   const confirmed=decision.status==='in-store'&&decision.state.arrivalStoreId===decision.store?.id;
   if(enabled&&decision.isSelectedStore&&decision.store&&(decision.showArrivalMessage||confirmed)&&!delivered.current.has(decision.store.id)){
     if(visible())deliver(decision,at);
     else {pending.current=null;recordArrivalDiagnostic('arrival-suppressed-inactive',{store:decision.store.name,storeId:decision.store.id});}
   }
   if(decision.status==='checking'&&!decision.state.arrivalStoreId){
     if(delivered.current.size){recordArrivalDiagnostic('arrival-notification-reset',{reason:'outside-store',deliveredCount:delivered.current.size});dispatch({type:'reset'});}
     delivered.current.clear();pending.current=null;
   }
 },[enabled]);
 useEffect(()=>{if(!enabled){recordArrivalDiagnostic('arrival-notification-reset',{reason:'disabled'});dispatch({type:'reset'});pending.current=null;pendingStoreChange.current=null;promptRef.current=false;document.getElementById('ziiply-gps-store-change-dialog')?.remove();setStorePrompt(null);}},[enabled]);
 useEffect(()=>{
  const activity=()=>{if(document.visibilityState!=='visible'||!document.hasFocus())return;activeRef.current=true;setActive(true);pending.current=null;
    const queued=pendingStoreChange.current;
    if(queued){pendingStoreChange.current=null;recordArrivalDiagnostic('arrival-store-change-resume',{store:queued.decision.store?.name??null});update(queued.decision,Date.now());}
    recordArrivalDiagnostic('arrival-notification-resume',{reason:'user-activity'});dispatch({type:'resume',at:Date.now()});};
  const inactive=()=>{recordArrivalDiagnostic('arrival-notification-pause',{visibility:document.visibilityState,focused:document.hasFocus()});dispatch({type:'pause',at:Date.now()});activeRef.current=false;setActive(false);};
  const visibility=()=>{if(document.visibilityState!=='visible'||!document.hasFocus())inactive();else activity();};
  document.addEventListener('pointerdown',activity,true);
  document.addEventListener('touchstart',activity,true);
  document.addEventListener('keydown',activity,true);
  document.addEventListener('visibilitychange',visibility);
  window.addEventListener('blur',inactive);
  window.addEventListener('focus',visibility);
  return ()=>{
   document.removeEventListener('pointerdown',activity,true);
   document.removeEventListener('touchstart',activity,true);
   document.removeEventListener('keydown',activity,true);
   document.removeEventListener('visibilitychange',visibility);
   window.removeEventListener('blur',inactive);
   window.removeEventListener('focus',visibility);
  };
 },[enabled,update]);
 useEffect(()=>{
  if(!enabled||!active||!notice||notice.phase==='done')return;
  const timer=window.setInterval(()=>{
   if(!visible()){recordArrivalDiagnostic('arrival-notification-pause',{reason:'inactive-timer',visibility:document.visibilityState,focused:document.hasFocus()});dispatch({type:'pause',at:Date.now()});activeRef.current=false;setActive(false);return;}
   dispatch({type:'tick',at:Date.now()});
  },250);
  return ()=>window.clearInterval(timer);
 },[enabled,active,notice]);
 useEffect(()=>{const phase=enabled?notice?.phase??'none':'disabled';recordArrivalDiagnostic('arrival-notification-phase',{phase,store:notice?.name??null,deadline:notice?.deadline??null,paused:!!notice&&notice.deadline===null&&notice.remainingMs!=null});window.dispatchEvent(new CustomEvent('ziiply-arrival-debug',{detail:{source:'main-ui',phase,store:notice?.name??null}}));},[enabled,notice?.phase,notice?.name]);
 const storeChangePrompt=enabled&&active&&storePrompt?<div data-store-prompt="true" style={{position:'fixed',inset:0,zIndex:2147483647,background:'rgba(0,0,0,.55)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
  <div role="dialog" aria-modal="true" aria-label="Vaihda kauppa" style={{background:'#e4f8e8',color:'#103b25',borderRadius:20,padding:24,maxWidth:420,width:'100%',textAlign:'center'}}>
   <h2 style={{fontSize:22,fontWeight:800,marginBottom:14}}>Oletko eri kaupassa?</h2>
   <p style={{marginBottom:20}}>GPS tunnisti kaupan: {storePrompt.map(s=>s.name).join(', ')}. Vaihdetaanko valittu kauppa?</p>
   <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
    <button type="button" onClick={openStorePicker} style={{padding:'12px 16px',borderRadius:12,background:'#146c43',color:'white',fontWeight:700}}>Vaihda kauppa</button>
    <button type="button" onClick={()=>{recordArrivalDiagnostic('arrival-store-change-declined',{});promptRef.current=false;setStorePrompt(null);}} style={{padding:'12px 16px',borderRadius:12,background:'white',color:'#103b25',fontWeight:700}}>Pidä nykyinen</button>
   </div>
  </div>
 </div>:null;
 return {storeChangePrompt,notice:enabled&&active?notice:null,update,dismiss:()=>{recordArrivalDiagnostic('arrival-notification-dismiss',{phase:notice?.phase??null});dispatch({type:'dismiss'});},skip:()=>{recordArrivalDiagnostic('arrival-notification-skip',{phase:notice?.phase??null});dispatch({type:'skip',at:Date.now()});}};
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
