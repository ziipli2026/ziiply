"use client";
import { useState } from "react";
import type { AccountDocument } from "@/lib/account/document";
import { prepareCartRestore, restoreActiveCart, type CartSurface } from "@/lib/account/restore";
export default function RestoreCartLab({document}:{document:AccountDocument}) {
  const [source,setSource]=useState<CartSurface>("mobile");
  const [target,setTarget]=useState<CartSurface>("mobile");
  const [preview,setPreview]=useState<{serialized:string;expected:string|null;count:number}|null>(null);
  const [message,setMessage]=useState("");
  function inspect() {
    setPreview(null);
    try {
      const prepared=prepareCartRestore(document.snapshot,source,target);
      const store=target==="mobile"?window.localStorage:window.sessionStorage;
      const key=target==="mobile"?"ziiply-cart-v1":"ziiply-desktop-current-cart-v1";
      setPreview({serialized:prepared.serialized,expected:store.getItem(key),count:prepared.items.length});
      setMessage("");
    } catch(error) {setMessage(error instanceof Error?error.message:"Koria ei voitu valmistella.");}
  }
  function restore() {
    if(!preview)return;
    try {
      restoreActiveCart(target==="mobile"?window.localStorage:window.sessionStorage,target,preview.serialized,preview.expected);
      setPreview(null);setMessage("Kori palautettu. Avaa sovellus uudelleen samassa välilehdessä. Tuotteiden hinnat tarkistetaan uudelleen. Vanha kori on varmuuskopioitu tällä laitteella.");
    }catch(error){setPreview(null);setMessage(error instanceof Error?error.message:"Palautus epäonnistui.");}
  }
  return <div className="space-y-3 border-t pt-3">
    <h3 className="font-bold">Palauta aktiivinen kori</h3>
    <label>Pilvikorin lähde <select value={source} onChange={event=>{setSource(event.target.value as CartSurface);setPreview(null);}}><option value="mobile">Mobiili</option><option value="desktop">Desktop</option></select></label>{" "}
    <label>Paikallinen kohde <select value={target} onChange={event=>{setTarget(event.target.value as CartSurface);setPreview(null);}}><option value="mobile">Mobiili</option><option value="desktop">Desktop</option></select></label>
    <p>Palautus korvaa vain aktiivisen korin. Tallennetut listat säilyvät. Mobiilin vanha hintavertailu ja keräilymerkinnät tyhjennetään. Desktop-näkymän kytkentä tähän kehityshaaraan on vielä kesken.</p>
    <button onClick={inspect}>Esikatsele palautusta</button>
    {preview&&<div><p>Palautetaan {preview.count} tuotetta ilman vanhoja hintoja. Nykyinen kori varmuuskopioidaan ennen korvaamista.</p><button onClick={restore}>Hyväksy paikallisen korin korvaaminen</button><button onClick={()=>setPreview(null)}>Peruuta</button></div>}
    <p role="status">{message}</p>
    <button onClick={()=>window.location.assign("/")}>Avaa mobiilisovellus samassa välilehdessä</button>
  </div>;
}
