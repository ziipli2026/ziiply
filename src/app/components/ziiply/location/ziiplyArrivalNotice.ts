import type { ZiiplyArrivalDecision } from './ziiplyArrivalSequence';
export const APPROACH_NOTICE_MS=4000;
export const ARRIVAL_CHOICE_MS=5000;
export type ArrivalPhase='approach'|'waiting'|'list'|'offers'|'done';
export type ArrivalNotice={id:string;name:string;phase:ArrivalPhase;deadline:number|null;approachUntil:number;confirmed:boolean;selected:boolean;remainingMs?:number|null};
export type ArrivalNoticeEvent=
 |{type:'sample';decision:ZiiplyArrivalDecision;at:number}
 |{type:'tick'|'skip'|'resume'|'pause';at:number}
 |{type:'dismiss'}|{type:'reset'};
export function arrivalNoticeReducer(state:ArrivalNotice|null,event:ArrivalNoticeEvent):ArrivalNotice|null {
 if(event.type==='reset')return null;
 if(event.type==='dismiss')return state?{...state,phase:'done',deadline:null}:null;
 if(event.type==='sample'){
  const d=event.decision;
  if(!d.showArrivalMessage||!d.isSelectedStore||!d.store||state?.id===d.store.id)return state;
  return {id:d.store.id,name:d.store.name,phase:'approach',deadline:event.at+APPROACH_NOTICE_MS,approachUntil:event.at+APPROACH_NOTICE_MS,confirmed:true,selected:true};
 }
 if(!state||state.phase==='done')return state;
 if(event.type==='pause')return state.deadline===null?state:{...state,remainingMs:Math.max(0,state.deadline-event.at),deadline:null};
 if(event.type==='resume')return state.deadline!==null||state.remainingMs==null?state:{...state,deadline:event.at+state.remainingMs,remainingMs:null};
 if(event.type==='skip'){
  if(state.phase==='approach')return {...state,phase:'list',deadline:event.at+ARRIVAL_CHOICE_MS};
  if(state.phase==='list')return {...state,phase:'offers',deadline:event.at+ARRIVAL_CHOICE_MS};
  return {...state,phase:'done',deadline:null};
 }
 if(event.type==='tick'&&state.deadline!==null&&event.at>=state.deadline){
  if(state.phase==='approach')return {...state,phase:'list',deadline:event.at+ARRIVAL_CHOICE_MS};
  if(state.phase==='list')return {...state,phase:'offers',deadline:event.at+ARRIVAL_CHOICE_MS};
  return {...state,phase:'done',deadline:null};
 }
 return state;
}
