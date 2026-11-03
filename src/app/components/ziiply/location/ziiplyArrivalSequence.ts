/**
 * Shared desktop/mobile GPS arrival decision engine.
 * Pure logic: the caller owns geolocation permission, polling, UI and persistence.
 * Never changes a store selection or a cart price by itself.
 */
export const ZIIPLY_STORE_RADIUS_METERS = 100;
export const ZIIPLY_APPROACH_RADIUS_METERS = 100;
export const ZIIPLY_PARKED_SAMPLE_MS = 5000;
const DEPARTURE_RADIUS_METERS = 200;
const DEPARTURE_SAMPLES = 3;
export type ZiiplyArrivalSample = { at:number; latitude:number; longitude:number; accuracyMeters:number; speedKmh:number|null };
export type ZiiplyArrivalStore = { id:string; name:string; latitude:number; longitude:number };
export type ZiiplyArrivalState = {
 tripStartedAt:number|null; stoppedAt:number|null; lastStationarySampleAt:number|null;
 lastStationaryPosition:{latitude:number;longitude:number}|null; tripConfirmed:boolean;
 arrivalStoreId:string|null; departureSamples?:number; recoveringFromBadGps?:boolean;
};
export type ZiiplyArrivalDecision = {
 state:ZiiplyArrivalState; status:'moving'|'checking'|'near-store'|'in-store'|'uncertain';
 store:ZiiplyArrivalStore|null; isSelectedStore:boolean; askStoreChange:boolean;
 showArrivalMessage:boolean; radar:'white'|'yellow'|'green';
};
export const initialZiiplyArrivalState=():ZiiplyArrivalState=>({
 tripStartedAt:null,stoppedAt:null,lastStationarySampleAt:null,lastStationaryPosition:null,
 tripConfirmed:false,arrivalStoreId:null,departureSamples:0,recoveringFromBadGps:false
});
const rad=(n:number)=>n*Math.PI/180;
export function ziiplyDistanceMeters(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number}) {
 const dLat=rad(b.latitude-a.latitude),dLon=rad(b.longitude-a.longitude);
 const h=Math.sin(dLat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dLon/2)**2;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
}
export function evaluateZiiplyArrival(previous:ZiiplyArrivalState,sample:ZiiplyArrivalSample,stores:ZiiplyArrivalStore[],selectedStoreIds:string[]):ZiiplyArrivalDecision {
 const state={...previous};
 const valid=Number.isFinite(sample.latitude)&&Number.isFinite(sample.longitude)
   &&Number.isFinite(sample.accuracyMeters)&&sample.accuracyMeters>0&&sample.accuracyMeters<=50;
 const candidates=valid?stores.map(store=>({store,distance:ziiplyDistanceMeters(sample,store)}))
   .filter(x=>x.distance<=ZIIPLY_APPROACH_RADIUS_METERS).sort((a,b)=>a.distance-b.distance):[];
 const ambiguous=candidates.length>1&&candidates[1].distance-candidates[0].distance<=sample.accuracyMeters;
 const candidate=ambiguous?null:candidates[0]?.store??null;
 const latched=state.arrivalStoreId?stores.find(s=>s.id===state.arrivalStoreId)??null:null;
 const moving=sample.speedKmh!==null&&Number.isFinite(sample.speedKmh)&&sample.speedKmh>3;
 const driving=sample.speedKmh!==null&&Number.isFinite(sample.speedKmh)&&sample.speedKmh>20;
 // Never confirm an arrival from a single stationary GPS fix or without observed travel.
 const observedTravel=state.tripConfirmed===false&&state.tripStartedAt!==null;
 if(valid&&!moving) {
   if(state.stoppedAt===null)state.stoppedAt=sample.at;
   state.lastStationarySampleAt=sample.at;
   state.lastStationaryPosition={latitude:sample.latitude,longitude:sample.longitude};
 } else if(valid&&moving) {state.stoppedAt=null;state.lastStationarySampleAt=null;state.lastStationaryPosition=null;}
 if(valid&&moving&&state.tripStartedAt===null)state.tripStartedAt=sample.at;
 const stable=valid&&!moving&&state.stoppedAt!==null&&sample.at-state.stoppedAt>=ZIIPLY_PARKED_SAMPLE_MS;
 // A confirmed visit is sticky across GPS loss and isolated outliers.
 if(latched&&valid) {
   const distance=ziiplyDistanceMeters(sample,latched);
   state.departureSamples=distance>DEPARTURE_RADIUS_METERS&&sample.accuracyMeters<=30
     ?(state.departureSamples??0)+1:0;
   if((state.departureSamples??0)>=DEPARTURE_SAMPLES) {
     state.arrivalStoreId=null;state.tripConfirmed=false;state.departureSamples=0;state.stoppedAt=null;
   }
 }
 const retained=state.arrivalStoreId?stores.find(s=>s.id===state.arrivalStoreId)??null:null;
 const arrivalConfirmed=!retained&&valid&&!ambiguous&&!!candidate
   &&candidates[0].distance<=ZIIPLY_STORE_RADIUS_METERS&&stable&&observedTravel;
 const showArrivalMessage=!!arrivalConfirmed;
 if(arrivalConfirmed){state.arrivalStoreId=candidate!.id;state.tripConfirmed=true;state.departureSamples=0;}
 const inStore=!!state.arrivalStoreId;
 const store=inStore?stores.find(s=>s.id===state.arrivalStoreId)??candidate:candidate;
 const isSelectedStore=!!store&&selectedStoreIds.includes(store.id);
 return {state,status:inStore?'in-store':!valid||ambiguous?'uncertain':candidate?(driving?'moving':'near-store'):'checking',
   store,isSelectedStore,askStoreChange:showArrivalMessage&&!isSelectedStore,
   showArrivalMessage,radar:inStore?'green':candidate?'yellow':'white'};
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
