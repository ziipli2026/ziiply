import type { ZiiplyArrivalDecision } from './ziiplyArrivalSequence';
export const APPROACH_NOTICE_MS = 4000;
export const ARRIVAL_CHOICE_MS = 5000;
export type ArrivalPhase='approach'|'waiting'|'list'|'offers'|'done';
export type ArrivalNotice={id:string;name:string;phase:ArrivalPhase;deadline:number|null;approachUntil:number;confirmed:boolean;selected:boolean};
export type ArrivalNoticeEvent=
 |{type:'sample';decision:ZiiplyArrivalDecision;at:number}
 |{type:'tick'|'skip'|'resume';at:number}
 |{type:'dismiss'}|{type:'reset'};
/** Informational only: a near-store sample never starts an overlay or an automatic sequence. */
export function arrivalNoticeReducer(state:ArrivalNotice|null,event:ArrivalNoticeEvent):ArrivalNotice|null {
 if(event.type==='reset')return null;
 if(event.type==='dismiss')return state?{...state,phase:'done',deadline:null}:null;
 if(event.type==='sample'){
   const d=event.decision;
   if(!d.showArrivalMessage||!d.store)return state;
   if(state?.id===d.store.id)return state;
   return {id:d.store.id,name:d.store.name,phase:'list',deadline:null,approachUntil:event.at,confirmed:true,selected:d.isSelectedStore};
 }
 if(!state)return null;
 if(event.type==='skip')return {...state,phase:'done',deadline:null};
 // Time, visibility changes and GPS uncertainty never advance the UI.
 return state;
}
