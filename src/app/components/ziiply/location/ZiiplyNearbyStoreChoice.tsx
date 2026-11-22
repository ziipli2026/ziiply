"use client";
import type { ZiiplyArrivalStore } from './ziiplyArrivalSequence';
export default function ZiiplyNearbyStoreChoice({stores,onSelect,onDecline}:{stores:ZiiplyArrivalStore[];onSelect:(store:ZiiplyArrivalStore)=>void;onDecline:()=>void}) {
 if(stores.length<2)return null;
 return <div role="dialog" aria-modal="true" aria-label="Valitse kauppa" data-testid="gps-nearby-store-choice" style={{position:'fixed',inset:0,zIndex:2147483647,display:'flex',alignItems:'center',justifyContent:'center',padding:20,background:'rgba(0,0,0,.4)'}}>
  <div style={{width:'100%',maxWidth:420,borderRadius:20,padding:24,background:'#e4f8e8',color:'#103b25'}}>
   <h2 style={{fontSize:20,fontWeight:800,marginBottom:8}}>Mihin kauppaan saavuit?</h2>
   <p style={{marginBottom:16}}>Lähellä on useita kauppoja. Valitse oikea kauppa.</p>
   <div style={{display:'flex',flexDirection:'column',gap:10}}>
    {stores.map(store=><button key={store.id} type="button" onClick={()=>onSelect(store)} style={{padding:14,borderRadius:12,border:'1px solid #166534',background:'white',fontWeight:700,textAlign:'left',color:'#103b25'}}>{store.name}</button>)}
    <button type="button" onClick={onDecline} style={{padding:14,borderRadius:12,border:'1px solid #166534',background:'white',fontWeight:700,color:'#103b25'}}>En kumpaankaan</button>
   </div>
  </div>
 </div>;
}
