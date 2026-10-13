"use client";
import { useEffect, useState } from "react";

export type ArvoPreferences = {
  householdSize: number;
  diets: string[];
  allergies: string;
  avoidedIngredients: string;
  dietEnabled: boolean;
  birthDate: string;
  sexForEquation: "" | "female" | "male";
  weightKg: string;
  weightMeasuredAt: string;
  heightCm: string;
  activity: "sedentary" | "light" | "moderate" | "active";
  goal: "maintain" | "lose" | "gain";
  targetWeightKg: string;
  manualKcal: string;
  specialSituation: "none" | "pregnancy" | "breastfeeding" | "other";
  purchaseTracking: boolean;
  mealTimes: { breakfast: string; lunch: string; dinner: string; evening: string };
  mealRemindersEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  weekendSuggestions: boolean;
  celebrationSuggestions: boolean;
  calendarSuggestions: boolean;
};
export const ARVO_STORAGE_KEY = "ziiply-arvo-preferences-v1";
export const ARVO_DIETS = [
  ["lactoseFree","Laktoositon","Ei laktoosia; maitoproteiinia voi silti olla."],
  ["dairyFree","Maidoton","Ei maitoperäisiä ainesosia; ei sama kuin laktoositon."],
  ["glutenFree","Gluteeniton","Ei gluteenia; muut viljat voivat sopia."],
  ["grainFree","Viljaton","Ei viljoja; eri rajaus kuin gluteeniton."],
  ["vegetarian","Kasvis","Ei lihaa eikä kalaa; muna ja maito voivat sopia."],
  ["vegan","Vegaaninen","Ei eläinperäisiä aineksia, mukaan lukien maito ja muna."],
  ["pescatarian","Kalaa sisältävä kasvisruokavalio","Kala sopii, liha ei."],
  ["eggFree","Kananmunaton","Ei kananmunaa."],
  ["soyFree","Soijaton","Ei soijaa."],
  ["nutFree","Pähkinätön","Ei pähkinöitä."]
] as const;
export const DEFAULT_ARVO_PREFERENCES: ArvoPreferences = {
  householdSize: 2, diets: [], allergies: "", avoidedIngredients: "", dietEnabled: false,
  birthDate: "", sexForEquation: "", weightKg: "", weightMeasuredAt: "",
  heightCm: "", activity: "light", goal: "maintain", targetWeightKg: "",
  manualKcal: "", specialSituation: "none", purchaseTracking: false,
  mealTimes: { breakfast: "08:00", lunch: "12:00", dinner: "17:00", evening: "20:00" },
  mealRemindersEnabled: false, quietHoursStart: "22:00", quietHoursEnd: "07:00",
  weekendSuggestions: false, celebrationSuggestions: false, calendarSuggestions: false
};
export function readArvoPreferences(): ArvoPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_ARVO_PREFERENCES };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ARVO_STORAGE_KEY) || "{}");
    return { ...DEFAULT_ARVO_PREFERENCES, ...parsed, mealTimes: { ...DEFAULT_ARVO_PREFERENCES.mealTimes, ...(parsed.mealTimes && typeof parsed.mealTimes === "object" ? parsed.mealTimes : {}) }, diets: Array.isArray(parsed.diets) ? parsed.diets.filter((d: unknown) => ARVO_DIETS.some(([key]) => key === d)) : [] };
  } catch { return { ...DEFAULT_ARVO_PREFERENCES }; }
}
export function effectiveArvoDiets(diets: string[]) {
  const values = new Set(diets);
  if (values.has("vegan")) { values.add("dairyFree"); values.add("eggFree"); values.add("vegetarian"); }
  if (values.has("dairyFree")) values.add("lactoseFree");
  // Viljaton ei yksin takaa gluteenittomuutta (esim. ristikontaminaatio).
  return [...values];
}
export function estimateArvoEnergy(p: ArvoPreferences) {
  if (!p.dietEnabled || p.specialSituation !== "none") return null;
  const kg = Number(p.weightKg), cm = Number(p.heightCm);
  const birth = /^\d{4}-\d{2}-\d{2}$/.test(p.birthDate) ? new Date(p.birthDate + "T12:00:00") : null;
  const today = new Date();
  const age = birth && !Number.isNaN(birth.getTime()) ? today.getFullYear() - birth.getFullYear() - (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) ? 1 : 0) : -1;
  if (!(kg > 0 && cm > 0 && age >= 18 && age <= 120 && (p.sexForEquation === "female" || p.sexForEquation === "male"))) return null;
  // Mifflin-St Jeor: estimate only; coefficient uses sex-specific population equations.
  const bmr = 10 * kg + 6.25 * cm - 5 * age + (p.sexForEquation === "male" ? 5 : -161);
  const factor = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 }[p.activity] || 1.375;
  const tdee = bmr * factor;
  const manual = Number(p.manualKcal);
  const target = p.manualKcal.trim() && manual > 0 ? manual : tdee + (p.goal === "lose" ? -300 : p.goal === "gain" ? 300 : 0);
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), target: Math.round(target), method: "Mifflin–St Jeor, aktiivisuuskerroin" };
}
export type ArvoPurchase = { id: string; ean?: string; name: string; quantity: number; purchasedAt: string };
export const ARVO_PURCHASES_KEY = "ziiply-arvo-confirmed-purchases-v1";
export function readArvoPurchases(): ArvoPurchase[] {
  if (typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(ARVO_PURCHASES_KEY) || "[]");
    return Array.isArray(value) ? value.filter((p): p is ArvoPurchase => Boolean(p && typeof p === "object" && typeof p.name === "string" && typeof p.purchasedAt === "string" && Number.isFinite(Number(p.quantity)))) : [];
  } catch { return []; }
}
export function arvoPurchaseSuggestions(purchases: ArvoPurchase[], today = new Date()) {
  const byProduct = new Map<string, ArvoPurchase[]>();
  for (const purchase of purchases) {
    const key = purchase.ean ? "ean:" + purchase.ean : "name:" + purchase.name.trim().toLocaleLowerCase("fi");
    if (!key || key === "name:" || !Number.isFinite(Date.parse(purchase.purchasedAt)) || !(purchase.quantity > 0)) continue;
    byProduct.set(key, [...(byProduct.get(key) || []), purchase]);
  }
  return [...byProduct.entries()].flatMap(([key, records]) => {
    const days = [...new Set(records.map(r => r.purchasedAt.slice(0, 10)))].sort();
    if (days.length < 3) return [];
    const intervals = days.slice(1).map((day, i) => (Date.parse(day + "T12:00:00Z") - Date.parse(days[i] + "T12:00:00Z")) / 86400000).filter(n => n > 0);
    if (intervals.length < 2) return [];
    const sorted = intervals.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    if (!(median >= 1 && median <= 180)) return [];
    const elapsed = (today.getTime() - Date.parse(days[days.length - 1] + "T12:00:00Z")) / 86400000;
    if (elapsed < median * 0.8 || elapsed < 0) return [];
    return [{ key, name: records[records.length - 1].name, intervalDays: median, elapsedDays: Math.max(0, Math.floor(elapsed)) }];
  });
}
export default function ArvoSettingsPanel({onClose}:{onClose?:()=>void}={}) {
  const [activeSection,setActiveSection]=useState<string|null>(null);
  const [householdPage,setHouseholdPage]=useState<"people"|"diets"|"allergies"|null>(null);
  const [p, setP] = useState<ArvoPreferences>(DEFAULT_ARVO_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  const [purchases,setPurchases]=useState<ArvoPurchase[]>([]);
  const [purchaseName,setPurchaseName]=useState("");
  const [purchaseQuantity,setPurchaseQuantity]=useState("1");
  const [dismissedSuggestions,setDismissedSuggestions]=useState<string[]>([]);
  useEffect(() => { setP(readArvoPreferences()); setPurchases(readArvoPurchases()); setLoaded(true); }, []);
  useEffect(() => { if (loaded) { try { window.localStorage.setItem(ARVO_STORAGE_KEY, JSON.stringify(p)); window.dispatchEvent(new Event("ziiply-arvo-preferences-updated")); } catch {} } }, [p, loaded]);
  const update = <K extends keyof ArvoPreferences>(key: K, value: ArvoPreferences[K]) => setP(prev => ({ ...prev, [key]: value }));
  const energy = estimateArvoEnergy(p);
  const mealLabels: { key: keyof ArvoPreferences["mealTimes"]; label: string }[] = [{key:"breakfast",label:"Aamiainen"},{key:"lunch",label:"Lounas"},{key:"dinner",label:"Päivällinen"},{key:"evening",label:"Iltapala"}];
  return <div className="relative h-full min-h-0 overflow-hidden px-2 py-4 text-[#173b2b]">
    <div className="mb-2 flex items-center justify-between"><p className="text-xs">Asetukset tallentuvat tähän selaimeen.</p>{onClose&&<button type="button" onClick={onClose} className="rounded border px-2 py-1">← Takaisin</button>}</div>
    <div className="grid gap-2">{[
      ["household","Kotitalous ja reseptit",p.householdSize+" henkilöä"+(p.diets.length?" · "+p.diets.length+" ruokavaliota":"")],
      ["energy","Henkilökohtainen dieetti",p.dietEnabled?"Käytössä":"Ei käytössä"],
      ["health","Terveystiedot","Yhteys ei vielä käytettävissä"],
      ["purchases","Ostohistoria ja kulutus",purchases.length+" vahvistettua ostoa"],
      ["reminders","Ruokailuajat ja muistutukset",p.mealRemindersEnabled?"Muistutustoive tallennettu":"Muistutukset eivät käytössä"]
    ].map(([id,title,summary])=><button key={id} type="button" className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#d9cfb9] bg-white/80 px-4 py-3 text-left shadow-sm hover:bg-white" onClick={()=>{setHouseholdPage(null);setActiveSection(id)}}><span><strong className="block">{title}</strong><span className="text-xs text-[#6d6a5c]">{summary}</span></span><span aria-hidden="true">›</span></button>)}</div>
    {activeSection&&<div role="dialog" aria-modal="true" aria-label="Arvon asetukset" className="absolute inset-0 z-20 flex min-h-0 flex-col rounded-xl bg-[#f8f5ed] shadow-xl">
      <div className="flex shrink-0 items-center gap-3 border-b bg-[#f8f5ed] px-3 py-3"><button type="button" className="rounded-lg border px-3 py-2 font-bold" onClick={()=>{if(activeSection==="household"&&householdPage)setHouseholdPage(null);else setActiveSection(null)}}>← Takaisin</button><strong>{({household:"Kotitalous ja reseptit",energy:"Henkilökohtainen dieetti",health:"Terveystiedot",purchases:"Ostohistoria ja kulutus",reminders:"Ruokailuajat ja muistutukset"} as Record<string,string>)[activeSection]}</strong></div>
      <div className="min-h-0 flex-1 overflow-hidden p-2">

      {activeSection==="household"&&<section className="h-full rounded-xl bg-white/75 p-3">
      {!householdPage&&<div className="grid gap-2">{[["people","Henkilömäärä",p.householdSize+" henkilöä"],["diets","Ruokavaliot",p.diets.length+" valintaa"],["allergies","Allergiat ja vältettävät",p.allergies||p.avoidedIngredients?"Rajauksia tallennettu":"Ei rajauksia"]].map(([id,title,summary])=><button key={id} type="button" className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-left" onClick={()=>setHouseholdPage(id as "people"|"diets"|"allergies")}><span><b className="block">{title}</b><small>{summary}</small></span>›</button>)}</div>}
      {householdPage==="people"&&<div className="flex flex-wrap items-center gap-4">      <label className="block">Henkilömäärä <input aria-label="Kotitalouden henkilömäärä" className="ml-3 w-20 rounded border p-2" type="number" min={1} max={50} value={p.householdSize} onChange={e=>update("householdSize",Math.min(50,Math.max(1,Number(e.target.value)||1)))} /></label>
      <p className="my-2 text-xs">Justiina varmistaa annosmäärän jokaisella reseptikerralla. Oma annoskoko on erillinen.</p>
</div>}
      {householdPage==="diets"&&<div className="text-sm">      <h4 className="mt-4 font-bold">Ruokavaliot (voit valita useita)</h4>
      <div className="mt-2 grid grid-cols-2 gap-1">{ARVO_DIETS.map(([key,label,description])=><label key={key} className="rounded-lg border bg-white px-2 py-1 text-xs"><input type="checkbox" checked={p.diets.includes(key)} onChange={e=>update("diets",e.target.checked?[...p.diets,key]:p.diets.filter(d=>d!==key))} /> <strong>{label}</strong><span className="sr-only">{description}</span></label>)}</div>
      <p className="mt-2 text-xs">Yhdistetyt rajaukset: {effectiveArvoDiets(p.diets).map(key=>ARVO_DIETS.find(([id])=>id===key)?.[1]).join(", ")||"Ei valintoja"}</p>
</div>}
      {householdPage==="allergies"&&<div className="grid grid-cols-2 gap-3">      <label className="block font-bold">Allergiat <textarea rows={3} className="mt-1 w-full rounded border p-2 font-normal" value={p.allergies} onChange={e=>update("allergies",e.target.value)} placeholder="Esim. seesami, äyriäiset" /></label>
      <label className="block font-bold">Muut vältettävät ainekset <textarea rows={3} className="mt-1 w-full rounded border p-2 font-normal" value={p.avoidedIngredients} onChange={e=>update("avoidedIngredients",e.target.value)} /></label>
      <p className="text-xs">Puutteellisten tuotetietojen perusteella ei voi varmistaa allergeeniturvallisuutta.</p>
</div>}
      </section>}
      {activeSection==="energy"&&(<>
    <section className="mb-5 rounded-xl bg-white/75 p-4">
      <h3 className="mb-2 text-xl font-bold">Henkilökohtainen dieetti</h3>
      <label><input type="checkbox" checked={p.dietEnabled} onChange={e=>update("dietEnabled",e.target.checked)} /> Käytä henkilökohtaista energiasuunnittelua</label>
      {p.dietEnabled&&<div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label>Syntymäaika <input type="date" className="block w-full rounded border p-2" value={p.birthDate} onChange={e=>update("birthDate",e.target.value)} /></label>
        <label>Laskentakaavan sukupuolikerroin <select className="block w-full rounded border p-2" value={p.sexForEquation} onChange={e=>update("sexForEquation",e.target.value as ArvoPreferences["sexForEquation"])}><option value="">Valitse</option><option value="female">Naisille johdettu kaava</option><option value="male">Miehille johdettu kaava</option></select><small>Käytetään vain energiankulutusarvion kaavakertoimeen.</small></label>
        <label>Paino (kg) <input type="number" min="1" step=".1" className="block w-full rounded border p-2" value={p.weightKg} onChange={e=>update("weightKg",e.target.value)} /></label>
        <label>Painon mittauspäivä <input type="date" className="block w-full rounded border p-2" value={p.weightMeasuredAt} onChange={e=>update("weightMeasuredAt",e.target.value)} /></label>
        <label>Pituus (cm) <input type="number" min="1" className="block w-full rounded border p-2" value={p.heightCm} onChange={e=>update("heightCm",e.target.value)} /></label>
        <label>Aktiivisuustaso <select className="block w-full rounded border p-2" value={p.activity} onChange={e=>update("activity",e.target.value as ArvoPreferences["activity"])}><option value="sedentary">Vähäinen</option><option value="light">Kevyt</option><option value="moderate">Kohtalainen</option><option value="active">Runsas</option></select></label>
        <label>Tavoite <select className="block w-full rounded border p-2" value={p.goal} onChange={e=>update("goal",e.target.value as ArvoPreferences["goal"])}><option value="maintain">Ylläpito</option><option value="lose">Pudotus</option><option value="gain">Nousu</option></select></label>
        <label>Tavoitepaino (kg, vapaaehtoinen) <input type="number" min="1" className="block w-full rounded border p-2" value={p.targetWeightKg} onChange={e=>update("targetWeightKg",e.target.value)} /></label>
        <label>Oma kcal-tavoite (vapaaehtoinen) <input type="number" min="1" className="block w-full rounded border p-2" value={p.manualKcal} onChange={e=>update("manualKcal",e.target.value)} /></label>
        <label>Erityistilanne <select className="block w-full rounded border p-2" value={p.specialSituation} onChange={e=>update("specialSituation",e.target.value as ArvoPreferences["specialSituation"])}><option value="none">Ei</option><option value="pregnancy">Raskaus</option><option value="breastfeeding">Imetys</option><option value="other">Muu</option></select></label>
      </div>}
      {p.dietEnabled&&(energy?<p className="mt-3 rounded-lg bg-[#e5eedf] p-3">Arvioitu perusaineenvaihdunta <b>{energy.bmr} kcal/vrk</b>, kokonaiskulutus <b>{energy.tdee} kcal/vrk</b>, syömisen tavoite <b>{energy.target} kcal/vrk</b>. Menetelmä: {energy.method}. Nämä eivät ole mittauksia. Liikuntadataa ei ole lisätty erikseen.</p>:<p className="mt-3 text-sm">Arviota ei lasketa ennen tarvittavia tietoja. Raskauden, imetyksen ja muun erityistilanteen aikana tavallista laskentaa ei käytetä.</p>)}
    </section>
      </>)}
      {activeSection==="health"&&(<>
    <section className="mb-5 rounded-xl bg-white/75 p-4"><h3 className="text-xl font-bold">Terveystiedot</h3><p className="text-sm">Salli terveystietojen käyttö mobiilistasi — ei vielä käytettävissä selainversiossa. Apple Health / Health Connect -yhteys ja oikeuksien peruminen toteutetaan vasta toimivalla integraatiolla. Terveystietoja ei haeta.</p></section>
      </>)}
      {activeSection==="purchases"&&(<>
    <section className="mb-5 rounded-xl bg-white/75 p-4">
      <h3 className="text-xl font-bold">Ostohistoria ja kulutus</h3>
      <label><input type="checkbox" checked={p.purchaseTracking} onChange={e=>update("purchaseTracking",e.target.checked)} /> Salli vahvistettujen ostosten perusteella tehtävät täydennysarviot</label>
      <p className="mt-2 text-sm">Vain itse vahvistetut ostokset lasketaan mukaan. Ostoskorin tuotteita ei kirjata automaattisesti ostetuiksi.</p>
      {p.purchaseTracking && <>
        <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={e=>{e.preventDefault();const name=purchaseName.trim();const quantity=Number(purchaseQuantity);if(!name||!(quantity>0))return;const next=[...purchases,{id:String(Date.now())+"-"+purchases.length,name,quantity,purchasedAt:new Date().toISOString()}];setPurchases(next);try{window.localStorage.setItem(ARVO_PURCHASES_KEY,JSON.stringify(next));}catch{}setPurchaseName("");setPurchaseQuantity("1");}}>
          <label className="text-sm">Ostettu tuote<input className="block rounded border p-2" required value={purchaseName} onChange={e=>setPurchaseName(e.target.value)} placeholder="Esim. maito 1 l" /></label>
          <label className="text-sm">Määrä<input className="block w-20 rounded border p-2" type="number" min="0.01" step="0.01" required value={purchaseQuantity} onChange={e=>setPurchaseQuantity(e.target.value)} /></label>
          <button type="submit" className="rounded-lg bg-[#24573e] px-4 py-2 font-bold text-white">Vahvista ostos</button>
        </form>
        <p className="mt-2 text-xs">Täydennysarvio vaatii vähintään kolme eri päivän ostoa samasta tuotteesta. Ostovälin mediaani on vain arvio, ei tieto kotona olevasta määrästä.</p>
        {arvoPurchaseSuggestions(purchases).filter(item=>!dismissedSuggestions.includes(item.key)).map(item=><div key={item.key} className="mt-2 rounded-lg border p-3 text-sm"><b>{item.name}</b> voi olla vähissä (ostoväli noin {item.intervalDays} vrk).<div className="mt-2 flex flex-wrap gap-2"><button type="button" className="rounded border px-2 py-1" onClick={()=>{window.dispatchEvent(new CustomEvent("ziiply-arvo-add-to-shopping-list",{detail:{name:item.name}}));setDismissedSuggestions(old=>[...old,item.key]);}}>Lisää ostettavaksi</button><button type="button" className="rounded border px-2 py-1" onClick={()=>setDismissedSuggestions(old=>[...old,item.key])}>Vielä on / muistuta myöhemmin</button></div></div>)}
        <p className="mt-2 text-xs">”Lisää ostettavaksi” lisää tuotteen desktopin ostoskoriin. Automaattiset ilmoitukset ovat vielä kesken.</p>
        <p className="mt-2 text-xs">Vahvistettuja ostotapahtumia: {purchases.length}</p>
        <button type="button" className="mt-2 rounded border px-3 py-1 text-sm" onClick={()=>{if(!window.confirm("Poistetaanko kaikki Arvon vahvistetut ostokset tältä selaimelta?"))return;setPurchases([]);window.localStorage.removeItem(ARVO_PURCHASES_KEY);}}>Poista ostohistoria</button>
      </>}
    </section>
      </>)}
      {activeSection==="reminders"&&(<>
    <section className="rounded-xl bg-white/75 p-4">
      <h3 className="text-xl font-bold">Ruokailuajat ja muistutukset</h3>
      <p className="mb-3 text-sm">Valitse haluamasi ruokailuajat. Ajat tallentuvat asetuksiin; selainilmoituksia ei vielä lähetetä.</p>
      <div className="grid gap-3 sm:grid-cols-2">{mealLabels.map(({key,label})=><label key={key} className="text-sm">{label}<input type="time" className="block w-full rounded border p-2" value={p.mealTimes[key]||""} onChange={e=>update("mealTimes",{...p.mealTimes,[key]:e.target.value})}/></label>)}</div>
      <label className="mt-4 block"><input type="checkbox" checked={p.mealRemindersEnabled} onChange={e=>update("mealRemindersEnabled",e.target.checked)} /> Haluan ruokailumuistutukset, kun toiminto on käytettävissä</label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-sm">Hiljainen aika alkaa<input type="time" className="block w-full rounded border p-2" value={p.quietHoursStart} onChange={e=>update("quietHoursStart",e.target.value)}/></label><label className="text-sm">Hiljainen aika päättyy<input type="time" className="block w-full rounded border p-2" value={p.quietHoursEnd} onChange={e=>update("quietHoursEnd",e.target.value)}/></label></div>
      <h4 className="mt-5 font-bold">Viikonloput, juhlat ja kalenteri</h4>
      <label className="mt-2 block"><input type="checkbox" checked={p.weekendSuggestions} onChange={e=>update("weekendSuggestions",e.target.checked)}/> Ehdota viikonloppuruokia perjantaisin, lauantaisin ja sunnuntaisin</label>
      <label className="mt-2 block"><input type="checkbox" checked={p.celebrationSuggestions} onChange={e=>update("celebrationSuggestions",e.target.checked)}/> Ehdota ruokia juhliin ja merkkipäiviin</label>
      <label className="mt-2 block"><input type="checkbox" checked={p.calendarSuggestions} onChange={e=>update("calendarSuggestions",e.target.checked)}/> Salli kalenteriin liittyvät ehdotukset, kun yhteys on toteutettu</label>
      <p className="mt-3 text-xs">Kalenteria ei lueta, eikä ilmoitus- tai sijaintilupia pyydetä. Taustamuistutukset ja kaupan lähestymisen tunnistus vaativat erilliset integraatiot.</p>
    </section>
      </>)}
      </div>
    </div>}
  </div>;
}
