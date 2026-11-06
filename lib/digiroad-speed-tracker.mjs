/**
 * Stateful speed-limit display controller.
 * Initial value requires 3 consistent matches (2-4 configurable).
 * Subsequent road changes require 2 consistent matches.
 * Never fetches itself: feed it cached Digiroad map-matching results.
 */
export class DigiroadSpeedTracker {
 constructor({initialConfirmations=3,changeConfirmations=2,staleAfterMs=30000}={}){
  if(!Number.isInteger(initialConfirmations)||initialConfirmations<2||initialConfirmations>4)throw Error('initialConfirmations must be 2-4');
  if(!Number.isInteger(changeConfirmations)||changeConfirmations<1)throw Error('changeConfirmations invalid');
  this.initialConfirmations=initialConfirmations;
  this.changeConfirmations=changeConfirmations;
  this.staleAfterMs=staleAfterMs;
  this.current=null;this.pending=null;this.lastTrustedAt=null;
 }
 reset(){this.current=null;this.pending=null;this.lastTrustedAt=null}
 update(match,{timestamp=Date.now()}={}){
  if(this.lastTrustedAt!==null&&timestamp-this.lastTrustedAt>this.staleAfterMs)this.reset();
  if(match?.status!=='matched'||!Number.isInteger(match.speedLimit)||!match.linkId){
   this.pending=null;
   return this.snapshot();
  }
  this.lastTrustedAt=timestamp;
  const next={linkId:match.linkId,speedLimit:match.speedLimit};
  if(this.current&&this.current.speedLimit===next.speedLimit){
   this.current=next;this.pending=null;return this.snapshot();
  }
  const required=this.current?this.changeConfirmations:this.initialConfirmations;
  if(this.pending?.speedLimit===next.speedLimit&&this.pending?.linkId===next.linkId)
   this.pending.count++;
  else this.pending={...next,count:1};
  if(this.pending.count>=required){this.current=next;this.pending=null}
  return this.snapshot();
 }
 snapshot(){return {status:this.current?'confirmed':'unknown',speedLimit:this.current?.speedLimit??null,linkId:this.current?.linkId??null,pendingCount:this.pending?.count??0}}
}
