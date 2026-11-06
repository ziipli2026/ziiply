/**
 * Shared desktop/mobile GPS arrival decision engine.
 * Pure logic: the caller owns geolocation permission, polling, UI and persistence.
 * Never changes a store selection or a cart price by itself.
 */
export const ZIIPLY_STORE_RADIUS_METERS = 50;
export const ZIIPLY_APPROACH_RADIUS_METERS = 100;
export const ZIIPLY_PARKED_SAMPLE_MS = 5000;
const DEPARTURE_RADIUS_METERS = 200;
const DEPARTURE_SAMPLES = 3;
export type ZiiplyArrivalSample = { at:number; latitude:number; longitude:number; accuracyMeters:number; speedKmh:number|null };
export type ZiiplyArrivalStore = { id:string; name:string; latitude:number; longitude:number; chain?:string };
export type ZiiplyArrivalState = {
 tripStartedAt:number|null; stoppedAt:number|null; lastStationarySampleAt:number|null;
 lastStationaryPosition:{latitude:number;longitude:number}|null; tripConfirmed:boolean; lastAcceptedSample?:ZiiplyArrivalSample|null; stationarySamples?:number;
 arrivalStoreId:string|null; confirmedStore?:ZiiplyArrivalStore|null; departureSamples?:number; recoveringFromBadGps?:boolean;
 candidateStoreId?:string|null; candidateSamples?:number; mismatchPromptedStoreId?:string|null;
};
export type ZiiplyArrivalDecision = {
 state:ZiiplyArrivalState; status:'moving'|'checking'|'near-store'|'in-store'|'uncertain';
 store:ZiiplyArrivalStore|null; isSelectedStore:boolean; askStoreChange:boolean; nearbyStoreChoices?:ZiiplyArrivalStore[];
 showArrivalMessage:boolean; radar:'white'|'yellow'|'green';
};
export const initialZiiplyArrivalState=():ZiiplyArrivalState=>({
 tripStartedAt:null,stoppedAt:null,lastStationarySampleAt:null,lastStationaryPosition:null,
 tripConfirmed:false,arrivalStoreId:null,confirmedStore:null,departureSamples:0,recoveringFromBadGps:false,lastAcceptedSample:null,stationarySamples:0,candidateStoreId:null,candidateSamples:0,mismatchPromptedStoreId:null
});
const rad=(n:number)=>n*Math.PI/180;
export function ziiplyDistanceMeters(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number}) {
 const dLat=rad(b.latitude-a.latitude),dLon=rad(b.longitude-a.longitude);
 const h=Math.sin(dLat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dLon/2)**2;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
}
export function evaluateZiiplyArrival(previous:ZiiplyArrivalState,sample:ZiiplyArrivalSample,stores:ZiiplyArrivalStore[],selectedStoreIds:string[]):ZiiplyArrivalDecision {
 const state={...previous};
 // A confirmed visit belongs to the selected store, never to a stale selection.
 if(state.arrivalStoreId&&selectedStoreIds.length>0&&!selectedStoreIds.includes(state.arrivalStoreId)){
  state.arrivalStoreId=null;state.confirmedStore=null;state.tripConfirmed=false;state.departureSamples=0;
  state.stoppedAt=null;state.stationarySamples=0;state.candidateStoreId=null;state.candidateSamples=0;
 }
 const finite=Number.isFinite(sample.latitude)&&Number.isFinite(sample.longitude)&&Math.abs(sample.latitude)<=90&&Math.abs(sample.longitude)<=180;
 const accurate=Number.isFinite(sample.accuracyMeters)&&sample.accuracyMeters>0&&sample.accuracyMeters<=30;
 const chronological=!state.lastAcceptedSample||sample.at>state.lastAcceptedSample.at;
 const dt=state.lastAcceptedSample?(sample.at-state.lastAcceptedSample.at)/1000:0;
 const displacement=state.lastAcceptedSample?ziiplyDistanceMeters(sample,state.lastAcceptedSample):0;
 // Reject impossible jumps and stale/duplicated timestamps; never infer arrival from missing GPS.
 const plausible=!state.lastAcceptedSample||(dt>0&&displacement/dt<=55+sample.accuracyMeters/dt);
 const valid=finite&&accurate&&chronological&&plausible&&Number.isFinite(sample.at);
 if(!valid){
  const held=state.arrivalStoreId?(stores.find(s=>s.id===state.arrivalStoreId)??state.confirmedStore??null):null;
  return {state,status:held?'in-store':'uncertain',store:held,isSelectedStore:!!held&&selectedStoreIds.includes(held.id),askStoreChange:false,showArrivalMessage:false,radar:held?'green':'white'};
 }
 if(dt>10){state.stoppedAt=null;state.stationarySamples=0;state.lastStationarySampleAt=null;state.candidateStoreId=null;state.candidateSamples=0;}
 state.lastAcceptedSample=sample;
 const candidates=valid?stores.map(store=>({store,distance:ziiplyDistanceMeters(sample,store)}))
   .filter(x=>x.distance<=ZIIPLY_APPROACH_RADIUS_METERS).sort((a,b)=>a.distance-b.distance):[];
 const ambiguous=candidates.length>1&&candidates[1].distance-candidates[0].distance<=sample.accuracyMeters;
 const candidate=ambiguous?null:candidates[0]?.store??null;
 const nearbyStoreChoices=ambiguous?candidates.filter(x=>x.distance-candidates[0].distance<=sample.accuracyMeters).map(x=>x.store):[];
 // No selection means no automatic arrival. A mismatched chain must never trigger a notice.
 const selectedStores=stores.filter(store=>selectedStoreIds.includes(store.id));
 const normalizedChain=(store:ZiiplyArrivalStore):string|null=>{
  const explicit=store.chain?.trim().toUpperCase();
  if(explicit==='K'||explicit==='S')return explicit;
  // Fail closed: never infer a chain from a name or a missing chain field.
  return null;
 };
 const selectedChains=new Set(selectedStores.map(normalizedChain).filter((chain):chain is string=>!!chain));
 const selectionExists=selectedStoreIds.length>0;
 const sameChain=!!candidate&&!!normalizedChain(candidate)&&selectedChains.has(normalizedChain(candidate)!);
 const selectedCandidate=!!candidate&&selectedStoreIds.includes(candidate.id);
 const eligibleCandidate=!!candidate&&selectionExists; // Any reliably detected nearby store can request a selection change; never auto-select it.
 // Cross-check three consecutive stationary fixes for the SAME physical store.
 // Driving and unknown speed must not contribute to stationary confirmation.
 const moving=sample.speedKmh===null||!Number.isFinite(sample.speedKmh)||sample.speedKmh>1.5;
 const driving=sample.speedKmh!==null&&Number.isFinite(sample.speedKmh)&&sample.speedKmh>20;
 if(moving||(!candidate&&!ambiguous)||(!eligibleCandidate&&!ambiguous)){state.candidateStoreId=null;state.candidateSamples=0;}
 else if(candidate&&state.candidateStoreId===candidate.id){state.candidateSamples=(state.candidateSamples??0)+1;}
 else if(candidate){state.candidateStoreId=candidate.id;state.candidateSamples=1;}
 else {state.candidateStoreId=null;state.candidateSamples=0;}
 // Keep the last prompt latched while nearby GPS alternates between adjacent shops.
 // Reset only after leaving the approach area, not on every ambiguous fix.
 if(candidates.length===0){state.mismatchPromptedStoreId=null;}
 const latched=state.arrivalStoreId?(stores.find(s=>s.id===state.arrivalStoreId)??state.confirmedStore??null):null;
 if(valid&&!moving) {
   if(state.stoppedAt===null)state.stoppedAt=sample.at;
   state.lastStationarySampleAt=sample.at;
   state.lastStationaryPosition={latitude:sample.latitude,longitude:sample.longitude};
   state.stationarySamples=(state.stationarySamples??0)+1;
 } else if(valid&&moving) {state.stoppedAt=null;state.lastStationarySampleAt=null;state.lastStationaryPosition=null;state.stationarySamples=0;}
 if(valid&&moving&&state.tripStartedAt===null)state.tripStartedAt=sample.at;
 const stable=!moving&&state.stoppedAt!==null&&sample.at-state.stoppedAt>=ZIIPLY_PARKED_SAMPLE_MS&&(state.stationarySamples??0)>=3&&dt<=10;
 // A confirmed visit is sticky across GPS loss and isolated outliers.
 if(latched&&valid) {
   const distance=ziiplyDistanceMeters(sample,latched);
   state.departureSamples=distance>DEPARTURE_RADIUS_METERS&&sample.accuracyMeters<=30
     ?(state.departureSamples??0)+1:0;
   if((state.departureSamples??0)>=DEPARTURE_SAMPLES) {
     state.arrivalStoreId=null;state.confirmedStore=null;state.tripConfirmed=false;state.departureSamples=0;state.stoppedAt=null;
   }
 }
 const retained=state.arrivalStoreId?(stores.find(s=>s.id===state.arrivalStoreId)??state.confirmedStore??null):null;
 const arrivalConfirmed=!retained&&valid&&!ambiguous&&eligibleCandidate
   &&candidates[0].distance<=ZIIPLY_STORE_RADIUS_METERS&&stable&&(state.candidateSamples??0)>=3;
 const showArrivalMessage=!!arrivalConfirmed&&selectedCandidate;
 const ambiguousPrompt=ambiguous&&selectionExists&&stable&&candidates[0].distance<=ZIIPLY_STORE_RADIUS_METERS&&nearbyStoreChoices.length>1&&state.mismatchPromptedStoreId!==nearbyStoreChoices.map(s=>s.id).sort().join('|');
 const askStoreChange=(!!arrivalConfirmed&&!selectedCandidate&&selectionExists&&state.mismatchPromptedStoreId!==candidate!.id)||ambiguousPrompt;
 if(askStoreChange)state.mismatchPromptedStoreId=ambiguousPrompt?nearbyStoreChoices.map(s=>s.id).sort().join('|'):candidate!.id;
 // A mismatch is only a question; it must never mark the user as present in an unselected shop.
 if(showArrivalMessage){state.arrivalStoreId=candidate!.id;state.confirmedStore=candidate;state.tripConfirmed=true;state.departureSamples=0;}
 const inStore=!!state.arrivalStoreId;
 const store=inStore?(stores.find(s=>s.id===state.arrivalStoreId)??state.confirmedStore??null):candidate;
 if(inStore&&store)state.confirmedStore=store;
 const isSelectedStore=!!store&&selectedStoreIds.includes(store.id);
 return {state,status:inStore?'in-store':!valid||ambiguous?'uncertain':candidate?(driving?'moving':'near-store'):'checking',
   store,isSelectedStore,askStoreChange,nearbyStoreChoices,
   showArrivalMessage,radar:inStore&&isSelectedStore?'green':candidate&&selectedCandidate&&!moving?'yellow':'white'};
}
export function confirmZiiplyStorePresence(previous:ZiiplyArrivalState,storeId:string):ZiiplyArrivalState {
 return {...previous,arrivalStoreId:storeId,tripConfirmed:true,departureSamples:0};
}
/** Opening the cart or a cache TTL expiring must never refresh existing prices. */
export function shouldFetchZiiplyCartPrice(input:{
  hasPrice:boolean;
  event:'cart-open'|'ttl-expired'|'new-item'|'confirmed-store-arrival'|'confirmed-store-change'|'manual-refresh';
  inStore:boolean;
  storeConfirmed:boolean;
  priceStoreId?:string|null;
  activeStoreId?:string|null;
}):boolean{
  if(input.event==='cart-open'||input.event==='ttl-expired')return false;
  if(input.event==='new-item')return !input.hasPrice;
  if(input.event==='manual-refresh')return true;
  return input.inStore&&input.storeConfirmed&&!!input.activeStoreId
    &&(!input.hasPrice||input.priceStoreId!==input.activeStoreId||input.event==='confirmed-store-arrival');
}
