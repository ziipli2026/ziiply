"use client";
import {useState} from "react";
const categories=[
 {key:"steps",label:"Askeleet",detail:"Päivän askelmäärä"},
 {key:"active_energy",label:"Aktiivisuusenergia",detail:"Liikunnasta ja aktiivisuudesta kulunut energia (kcal)"},
 {key:"resting_heart_rate",label:"Leposyke",detail:"Päivän leposyke"},
 {key:"hrv",label:"Sykevälivaihtelu (HRV)",detail:"Päivän HRV-arvo"},
 {key:"sleep_stages",label:"Uni ja univaiheet",detail:"Unen kokonaiskesto ja REM-, kevyt-, syvä- sekä valveillaolovaiheet"}
] as const;
export default function ArvoHealthPage(){
 const [selected,setSelected]=useState<string[]>([]);
 const [read,setRead]=useState(false);
 const [consent,setConsent]=useState(false);
 return <main className="mx-auto max-w-2xl space-y-5 px-4 py-8 text-slate-900">
  <a href="/arvo-tilastot" className="underline">← Arvon tilastot</a>
  <h1 className="text-3xl font-bold">Arvo – terveystietojen yhdistäminen</h1>
  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4" role="status">
   <strong>Yhteys ei ole vielä käytössä.</strong>
   <p>Apple Health- ja Android Health Connect -tietoja ei lueta eikä lähetetä tältä sivulta. Alla voit tutustua tulevaan lupamenettelyyn. Valinnat eivät tallennu eivätkä anna käsittelylupaa.</p>
  </div>
  <section className="space-y-3">
   <h2 className="text-xl font-bold">Mitä tietoja haluaisit yhdistää?</h2>
   <p>Valitse vain haluamasi tietoryhmät. Kaikki valinnat ovat aluksi pois päältä.</p>
   {categories.map(c=><label key={c.key} className="flex gap-3 rounded-lg border p-3">
    <input type="checkbox" checked={selected.includes(c.key)} onChange={e=>setSelected(s=>e.target.checked?[...s,c.key]:s.filter(x=>x!==c.key))}/>
    <span><strong className="block">{c.label}</strong><span className="text-sm">{c.detail}</span></span>
   </label>)}
  </section>
  <section className="space-y-2 rounded-xl border p-4">
   <h2 className="text-xl font-bold">Tietosuojatiedot – luonnos</h2>
   <p><strong>Käsittelyn tarkoitus:</strong> Arvon käyttäjäkohtaiset hyvinvointitilastot ja ravitsemuksen sekä aktiivisuuden vertailu. Terveystietoja ei käytetä mainonnan kohdentamiseen.</p>
   <p><strong>Rekisterinpitäjä:</strong> Ziiply Oy. Ennen käyttöönottoa julkaistaan täydellinen, versionumeroitu tietosuojaseloste yhteystietoineen, käsittelijöineen, säilytysaikoineen ja mahdollisine kansainvälisine siirtoineen.</p>
   <p><strong>Vapaaehtoisuus:</strong> Voit käyttää muita Ziiplyn toimintoja yhdistämättä terveystietoja. Tietoryhmät valitaan erikseen.</p>
   <p><strong>Peruuttaminen ja poistaminen:</strong> Valmiiseen palveluun toteutetaan suostumuksen peruutus, synkronoinnin pysäytys ja terveystietojen poistaminen.</p>
   <p><strong>Turvallisuus:</strong> Tietoja ei pidä tallentaa selaimen localStorageen, analytiikkaan tai osoiteriville. Käyttö edellyttää erillistä vahvistettua käyttäjätunnistusta.</p>
  </section>
  <section className="space-y-3 rounded-xl border p-4">
   <label className="flex gap-3"><input type="checkbox" checked={read} onChange={e=>setRead(e.target.checked)}/><span>Olen lukenut yllä olevat alustavat tietosuojatiedot.</span></label>
   <label className="flex gap-3"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>Haluan myöhemmin antaa nimenomaisen luvan valitsemieni terveystietojen käsittelyyn.</span></label>
   <button type="button" disabled className="w-full cursor-not-allowed rounded-lg bg-slate-300 p-3 font-semibold text-slate-600">Yhdistä terveystiedot – ei vielä käytettävissä</button>
   <p className="text-sm" role="status">Valinnat: {selected.length} tietoryhmää. {read&&consent?"Lupaa ei ole kirjattu; yhteys on edelleen pois käytöstä.":"Yhteyttä ei muodosteta."}</p>
  </section>
 </main>;
}
