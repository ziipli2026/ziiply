/**
 * Experimental Digiroad GPS service: fetch small road geometry windows only
 * when necessary; reuse cached segments between fixes. No production wiring.
 */
import {fetchDigiroadNearFix,matchDigiroadFix} from './digiroad-speed-matching.mjs';
import {DigiroadSpeedTracker} from './digiroad-speed-tracker.mjs';
const rad=Math.PI/180;
function metres(a,b){
 const dy=(a.latitude-b.latitude)*111320;
 const dx=(a.longitude-b.longitude)*111320*Math.cos(a.latitude*rad);
 return Math.hypot(dx,dy);
}
export class DigiroadSpeedService {
 constructor({fetchFn=fetch,clock=()=>Date.now(),cacheRadiusMetres=85,maxCacheAgeMs=120000,minFetchIntervalMs=5000,trackerOptions}={}){
  this.fetchFn=fetchFn;this.clock=clock;this.cacheRadiusMetres=cacheRadiusMetres;
  this.maxCacheAgeMs=maxCacheAgeMs;this.minFetchIntervalMs=minFetchIntervalMs;
  this.tracker=new DigiroadSpeedTracker(trackerOptions);
  this.cache=null;this.lastFetchAt=null;this.inflight=null;
  this.unconfirmedSince=null;
 }
 async update(fix){
  const now=this.clock();
  const valid=Number.isFinite(fix?.latitude)&&Number.isFinite(fix?.longitude)&&Number.isFinite(fix?.accuracy)&&fix.accuracy<=40&&fix.accuracy>=0;
  if(!valid)return {...this.tracker.update({status:'unknown'},{timestamp:now}),source:'gps_unreliable'};
  if(!this.tracker.current)this.unconfirmedSince??=now;
  const prolongedSearch=this.unconfirmedSince!==null&&now-this.unconfirmedSince>=30000;
  const fetchInterval=prolongedSearch?3*this.minFetchIntervalMs:this.minFetchIntervalMs;
  const usable=this.cache&&now-this.cache.fetchedAt<=this.maxCacheAgeMs&&metres(fix,this.cache.center)<=this.cacheRadiusMetres;
  if(!usable&&(this.lastFetchAt===null||now-this.lastFetchAt>=fetchInterval)){
   if(!this.inflight){
    this.lastFetchAt=now;
    this.inflight=fetchDigiroadNearFix(fix,{fetchFn:this.fetchFn})
      .then(features=>{this.cache={center:{latitude:fix.latitude,longitude:fix.longitude},fetchedAt:this.clock(),features};return true})
      .catch(()=>false).finally(()=>{this.inflight=null});
   }
   await this.inflight;
  }
  const available=this.cache&&now-this.cache.fetchedAt<=this.maxCacheAgeMs&&metres(fix,this.cache.center)<=this.cacheRadiusMetres;
  const match=available?matchDigiroadFix(fix,this.cache.features,{previousLink:this.tracker.current?.linkId}):{status:'unknown'};
  const result=this.tracker.update(match,{timestamp:now});
  if(result.status==='confirmed')this.unconfirmedSince=null;
  return {...result,source:available?'digiroad_cached':'unavailable'};
 }
 reset(){this.cache=null;this.lastFetchAt=null;this.unconfirmedSince=null;this.tracker.reset()}
}
