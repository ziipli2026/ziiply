/**
 * Shared desktop/mobile GPS arrival decision engine.
 * Pure logic: the caller owns geolocation permission, polling, UI and persistence.
 * Never changes a store selection or a cart price by itself.
 */
export const ZIIPLY_TRIP_SPEED_KMH = 20;
export const ZIIPLY_TRIP_CONFIRM_MS = 60_000;
export const ZIIPLY_STORE_RADIUS_METERS = 50;
export const ZIIPLY_PARKED_SPEED_KMH = 5;
export const ZIIPLY_PARKED_CONFIRM_MS = 10_000;
export const ZIIPLY_PARKED_SAMPLE_MS = 5_000;

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
  const speed=sample.speedKmh;
  const moving=valid&&speed!==null&&Number.isFinite(speed)&&speed>ZIIPLY_TRIP_SPEED_KMH;
  if(moving){
    state.tripStartedAt ??= sample.at;
    if(sample.at-state.tripStartedAt>=ZIIPLY_TRIP_CONFIRM_MS)state.tripConfirmed=true;
    state.stoppedAt=null;state.lastStationarySampleAt=null;state.lastStationaryPosition=null;
    // Keep a confirmed session until departure is independently established.
  }else if(valid && ((speed!==null && Number.isFinite(speed) && speed>=0 && speed<=ZIIPLY_PARKED_SPEED_KMH)
    // Safari may supply null speed even at rest. Require repeated stable fixes.
    || (speed===null && (!state.lastStationaryPosition
      || ziiplyDistanceMeters(state.lastStationaryPosition,sample)<=25)))){
    state.tripStartedAt=null;
    if(state.lastStationarySampleAt===null || sample.at-state.lastStationarySampleAt>=ZIIPLY_PARKED_SAMPLE_MS){
      const drift=state.lastStationaryPosition?ziiplyDistanceMeters(state.lastStationaryPosition,sample):0;
      if(drift>25)state.stoppedAt=sample.at;
      else state.stoppedAt ??= sample.at;
      state.lastStationaryPosition={latitude:sample.latitude,longitude:sample.longitude};
      state.lastStationarySampleAt=sample.at;
    }
  }else{
    state.tripStartedAt=null;state.stoppedAt=null;
    state.lastStationarySampleAt=null;state.lastStationaryPosition=null;
  }
  const candidates=valid?stores.map(store=>({store,distance:ziiplyDistanceMeters(sample,store)}))
    .filter(x=>x.distance<=ZIIPLY_STORE_RADIUS_METERS).sort((a,b)=>a.distance-b.distance):[];
  // GPS uncertainty: if two shops are indistinguishable within the accuracy radius,
  // do not claim a particular store.
  const ambiguous=candidates.length>1&&candidates[1].distance-candidates[0].distance<=sample.accuracyMeters;
  const store=ambiguous?null:candidates[0]?.store??null;
  // Arrival is mode-independent: walking and opening the app at a shop work too.
  // Multiple nearby reliable fixes confirm presence without a driving history.
  const parked=state.stoppedAt!==null&&sample.at-state.stoppedAt>=ZIIPLY_PARKED_CONFIRM_MS;
  const slowApproach=valid&&speed!==null&&speed>=0&&speed<=12;
  const nearbyStable=!!store&&state.lastStationarySampleAt!==null&&state.stoppedAt!==null
    &&sample.at-state.stoppedAt>=ZIIPLY_PARKED_CONFIRM_MS;
  // Store presence depends on reliable GPS inside the radius, not travel mode, speed or elapsed stationary time.
  const arrivalConfirmed=!!store&&valid;
  const inStore=!!store&&arrivalConfirmed&&valid;
  const showArrivalMessage=!!inStore&&state.arrivalStoreId!==store?.id;
  if(inStore)state.arrivalStoreId=store.id;
  const isSelectedStore=!!store&&selectedStoreIds.includes(store.id);
  return {
    state,status:!valid||ambiguous?'uncertain':inStore?'in-store':store?'near-store':moving?'moving':'checking',
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
