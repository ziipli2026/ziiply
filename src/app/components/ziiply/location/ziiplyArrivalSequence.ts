/**
 * Shared desktop/mobile GPS arrival decision engine.
 * Pure logic: the caller owns geolocation permission, polling, UI and persistence.
 * Never changes a store selection or a cart price by itself.
 */
export const ZIIPLY_STORE_RADIUS_METERS = 50;
export const ZIIPLY_APPROACH_RADIUS_METERS = 200;
// Compatibility export: no arrival delay is applied.
export const ZIIPLY_PARKED_SAMPLE_MS = 0;

export type ZiiplyArrivalSample = {
  at: number;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  speedKmh: number | null;
};
export type ZiiplyArrivalStore = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};
export type ZiiplyArrivalState = {
  tripStartedAt: number | null;
  stoppedAt: number | null;
  lastStationarySampleAt: number | null;
  lastStationaryPosition: { latitude: number; longitude: number } | null;
  tripConfirmed: boolean;
  arrivalStoreId: string | null;
};
export type ZiiplyArrivalDecision = {
  state: ZiiplyArrivalState;
  status: 'moving' | 'checking' | 'near-store' | 'in-store' | 'uncertain';
  store: ZiiplyArrivalStore | null;
  isSelectedStore: boolean;
  askStoreChange: boolean;
  showArrivalMessage: boolean;
  radar: 'white' | 'green';
};
export const initialZiiplyArrivalState = (): ZiiplyArrivalState => ({
  tripStartedAt: null, stoppedAt: null, lastStationarySampleAt: null,
  lastStationaryPosition: null, tripConfirmed: false, arrivalStoreId: null,
});
const rad = (n: number) => n * Math.PI / 180;
export function ziiplyDistanceMeters(a: {latitude:number;longitude:number}, b:{latitude:number;longitude:number}) {
  const dLat=rad(b.latitude-a.latitude), dLon=rad(b.longitude-a.longitude);
  const h=Math.sin(dLat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dLon/2)**2;
  return 12742000*Math.asin(Math.min(1,Math.sqrt(h)));
}
export function evaluateZiiplyArrival(
  previous: ZiiplyArrivalState,
  sample: ZiiplyArrivalSample,
  stores: ZiiplyArrivalStore[],
  selectedStoreIds: string[],
): ZiiplyArrivalDecision {
  const state={...previous};
  const valid=Number.isFinite(sample.latitude)&&Number.isFinite(sample.longitude)
    &&Number.isFinite(sample.accuracyMeters)&&sample.accuracyMeters>0
    &&sample.accuracyMeters<=50;
  const candidates=valid?stores.map(store=>({store,distance:ziiplyDistanceMeters(sample,store)}))
    .filter(x=>x.distance<=ZIIPLY_APPROACH_RADIUS_METERS).sort((a,b)=>a.distance-b.distance):[];
  // GPS uncertainty: if two shops are indistinguishable within the accuracy radius,
  // do not claim a particular store.
  const ambiguous=candidates.length>1&&candidates[1].distance-candidates[0].distance<=sample.accuracyMeters;
  const store=ambiguous?null:candidates[0]?.store??null;
  // GPS location alone determines store presence. No speed, travel history or time delays.
  // A mapped shop coordinate may be at the building centre rather than its entrance.
  // Only extend the arrival radius for the explicitly selected store after
  // 20 seconds of stable positioning; do not change selection automatically.
  const selectedNearby=!!store&&selectedStoreIds.includes(store.id)
    &&candidates[0].distance<=Math.min(130,ZIIPLY_STORE_RADIUS_METERS+Math.max(40,sample.accuracyMeters*2));
  const stationary=sample.speedKmh===null||sample.speedKmh<5;
  const anchor=state.lastStationaryPosition;
  const stable=!anchor||ziiplyDistanceMeters(anchor,sample)<=Math.max(35,sample.accuracyMeters*1.5);
  if(!valid||ambiguous||!selectedNearby||!stationary||!stable){
    state.stoppedAt=null;
    state.lastStationaryPosition=null;
  }else{
    if(state.stoppedAt===null)state.stoppedAt=sample.at;
    if(!anchor)state.lastStationaryPosition={latitude:sample.latitude,longitude:sample.longitude};
    state.lastStationarySampleAt=sample.at;
  }
  const stationaryArrival=selectedNearby&&state.stoppedAt!==null&&sample.at-state.stoppedAt>=20000;
  const arrivalConfirmed=!!store&&valid&&(candidates[0].distance<=ZIIPLY_STORE_RADIUS_METERS||stationaryArrival);
  // Once confirmed, tolerate indoor GPS drift while still near the selected shop.
  // Release only when the device is clearly outside the approach area.
  const retainedArrival=!!store&&valid&&state.arrivalStoreId===store.id
    &&selectedStoreIds.includes(store.id)&&candidates[0].distance<=ZIIPLY_APPROACH_RADIUS_METERS;
  const inStore=!!store&&valid&&(arrivalConfirmed||retainedArrival);
  const showArrivalMessage=!!inStore&&state.arrivalStoreId!==store?.id;
  if(inStore)state.arrivalStoreId=store.id;
  else if(valid&&!ambiguous&&!store)state.arrivalStoreId=null;
  const isSelectedStore=!!store&&selectedStoreIds.includes(store.id);
  return {
    state,status:!valid||ambiguous?'uncertain':inStore?'in-store':store?'near-store':'checking',
    store,isSelectedStore,askStoreChange:!!inStore&&!isSelectedStore&&showArrivalMessage,
    showArrivalMessage,radar:inStore?'green':'white',
  };
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
