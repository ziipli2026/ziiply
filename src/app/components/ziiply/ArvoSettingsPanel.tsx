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
  const [reminderPage,setReminderPage]=useState<"times"|"suggestions"|null>(null);
  const [energyPage,setEnergyPage]=useState<"measurements"|"goals"|null>(null);
  const [purchasePage,setPurchasePage]=useState<"record"|"suggestions"|"history"|null>(null);
  const [suggestionIndex,setSuggestionIndex]=useState(0);
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
  return <div className="flex h-full min-h-0 flex-col overflow-hidden px-1 py-1 text-[#173b2b]">
    <div className="relative mb-2 flex h-12 shrink-0 items-center"><h2 className="text-[26px] font-black text-[#14291f]">Arvo</h2><button type="button" className="absolute left-1/2 -translate-x-1/2 rounded-lg border border-[#173b2b] px-3 py-1 text-sm font-bold" onClick={()=>{if(activeSection==="reminders"&&reminderPage)setReminderPage(null);else if(activeSection==="energy"&&energyPage)setEnergyPage(null);else if(activeSection==="purchases"&&purchasePage)setPurchasePage(null);else if(activeSection)setActiveSection(null);else onClose?.()}}>← Takaisin</button></div>
    <div className="relative min-h-0 flex-1 overflow-hidden">
    {!activeSection&&<p className="mb-2 text-xs text-[#6d6a5c]">Asetukset tallentuvat tähän selaimeen.</p>}
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#d9cfb9] bg-white/80 px-3 py-2 shadow-sm">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={()=>{setActiveSection("household")}}><strong className="block">Kotitalous ja reseptit</strong><span className="text-xs text-[#6d6a5c]">Ruokavaliot ja allergiat ›</span></button>
        <label className="flex shrink-0 items-center gap-2 text-sm font-bold">Henkilöitä <input aria-label="Kotitalouden henkilömäärä suoraan Arvon päävalikossa" type="number" min={1} max={50} className="w-16 rounded-lg border p-2 text-center font-bold" value={p.householdSize} onChange={e=>update("householdSize",Math.min(50,Math.max(1,Number(e.target.value)||1)))}/></label>
      </div>
      {[

      ["reminders","Ruokailuajat ja muistutukset",p.mealRemindersEnabled?"Muistutustoive tallennettu":"Muistutukset eivät käytössä"],
      ["energy","Henkilökohtainen dieetti",p.dietEnabled?"Käytössä":"Ei käytössä"],
      ["health","Terveystiedot","Yhteys ei vielä käytettävissä"],
      ["purchases","Ostohistoria ja kulutus",purchases.length+" vahvistettua ostoa"]
    ].map(([id,title,summary])=><button key={id} type="button" className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#d9cfb9] bg-white/80 px-3 py-2 text-left shadow-sm hover:bg-white" onClick={()=>{setActiveSection(id)}}><span><strong className="block">{title}</strong><span className="text-xs text-[#6d6a5c]">{summary}</span></span><span aria-hidden="true">›</span></button>)}</div>
    {activeSection&&<div role="dialog" aria-modal="true" aria-label="Arvon asetukset" className="absolute inset-0 z-20 flex min-h-0 flex-col rounded-xl bg-[#f8f5ed] shadow-xl">
      <div className="flex shrink-0 items-center border-b bg-[#f8f5ed] px-2 py-1"><strong>{({household:"Kotitalous ja reseptit",energy:"Henkilökohtainen dieetti",health:"Terveystiedot",purchases:"Ostohistoria ja kulutus",reminders:"Ruokailuajat ja muistutukset"} as Record<string,string>)[activeSection]}</strong></div>
      <div className="min-h-0 flex-1 overflow-hidden p-1">

      {activeSection==="household"&&<section className="h-full rounded-xl bg-white/75 px-2 py-1">
        <div className="mb-2 flex items-center justify-between gap-2"><h3 className="font-bold">Ruokavaliot</h3><span className="text-xs text-[#6d6a5c]">Valitse tarvittaessa useita</span></div>
        <div className="grid grid-cols-2 gap-1.5">{ARVO_DIETS.map(([key,label,description])=><label key={key} title={description} className="flex min-h-8 items-center gap-2 rounded-lg border bg-white px-2 py-0.5 text-sm"><input type="checkbox" checked={p.diets.includes(key)} onChange={e=>update("diets",e.target.checked?[...p.diets,key]:p.diets.filter(d=>d!==key))}/><span className="font-semibold">{label}</span></label>)}</div>
        {p.diets.length>0&&<p className="mt-1 text-xs">Valitut: {effectiveArvoDiets(p.diets).map(key=>ARVO_DIETS.find(([id])=>id===key)?.[1]).join(", ")}</p>}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block text-sm font-bold">Allergiat<textarea rows={2} className="mt-1 w-full resize-none rounded-lg border bg-white p-1 font-normal" value={p.allergies} onChange={e=>update("allergies",e.target.value)} placeholder="Esim. seesami, äyriäiset"/></label>
          <label className="block text-sm font-bold">Muut vältettävät ainekset<textarea rows={2} className="mt-1 w-full resize-none rounded-lg border bg-white p-2 font-normal" value={p.avoidedIngredients} onChange={e=>update("avoidedIngredients",e.target.value)} placeholder="Esim. sipuli"/></label>
        </div>
        <p className="mt-2 text-xs text-[#6d6a5c]">Tuotetietojen puutteiden vuoksi allergeeniturvallisuutta ei voida taata. Maidoton ei ole sama kuin laktoositon; viljaton ei takaa gluteenittomuutta.</p>
      </section>}
      {activeSection==="energy"&&<section className="h-full rounded-xl bg-white/75 p-3 text-sm">
        <label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={p.dietEnabled} onChange={e=>update("dietEnabled",e.target.checked)}/> Henkilökohtainen energiasuunnittelu käytössä</label>
        {!energyPage&&<div className="mt-3 grid gap-2">
          <button type="button" className="flex items-center justify-between rounded-lg border bg-white px-3 py-3 text-left" onClick={()=>setEnergyPage("measurements")}><span><b className="block">Omat tiedot ja aktiivisuus</b><small>Syntymäaika, paino, pituus ja aktiivisuus</small></span>›</button>
          <button type="button" className="flex items-center justify-between rounded-lg border bg-white px-3 py-3 text-left" onClick={()=>setEnergyPage("goals")}><span><b className="block">Tavoitteet ja erityistilanteet</b><small>Painotavoite, kcal ja erityistilanteet</small></span>›</button>
          {p.dietEnabled&&(energy?<p className="rounded-lg bg-[#e5eedf] p-2 text-xs">Arvio: perusaineenvaihdunta <b>{energy.bmr}</b>, kulutus <b>{energy.tdee}</b>, tavoite <b>{energy.target} kcal/vrk</b>. Ei mittaustulos.</p>:<p className="text-xs">Energia-arvio edellyttää tarvittavia tietoja. Erityistilanteissa tavallista laskentaa ei käytetä.</p>)}
        </div>}
        {energyPage==="measurements"&&<div className="mt-2 grid grid-cols-2 gap-2">        <label>Syntymäaika <input type="date" className="block w-full rounded border px-2 py-1" value={p.birthDate} onChange={e=>update("birthDate",e.target.value)} /></label>
        <label>Laskentakaavan sukupuolikerroin <select className="block w-full rounded border px-2 py-1" value={p.sexForEquation} onChange={e=>update("sexForEquation",e.target.value as ArvoPreferences["sexForEquation"])}><option value="">Valitse</option><option value="female">Naisille johdettu kaava</option><option value="male">Miehille johdettu kaava</option></select><small>Käytetään vain energiankulutusarvion kaavakertoimeen.</small></label>
        <label>Paino (kg) <input type="number" min="1" step=".1" className="block w-full rounded border px-2 py-1" value={p.weightKg} onChange={e=>update("weightKg",e.target.value)} /></label>
        <label>Painon mittauspäivä <input type="date" className="block w-full rounded border px-2 py-1" value={p.weightMeasuredAt} onChange={e=>update("weightMeasuredAt",e.target.value)} /></label>
        <label>Pituus (cm) <input type="number" min="1" className="block w-full rounded border px-2 py-1" value={p.heightCm} onChange={e=>update("heightCm",e.target.value)} /></label>
        <label>Aktiivisuustaso <select className="block w-full rounded border px-2 py-1" value={p.activity} onChange={e=>update("activity",e.target.value as ArvoPreferences["activity"])}><option value="sedentary">Vähäinen</option><option value="light">Kevyt</option><option value="moderate">Kohtalainen</option><option value="active">Runsas</option></select></label>
</div>}
        {energyPage==="goals"&&<div className="mt-2 grid grid-cols-2 gap-2">        <label>Tavoite <select className="block w-full rounded border px-2 py-1" value={p.goal} onChange={e=>update("goal",e.target.value as ArvoPreferences["goal"])}><option value="maintain">Ylläpito</option><option value="lose">Pudotus</option><option value="gain">Nousu</option></select></label>
        <label>Tavoitepaino (kg, vapaaehtoinen) <input type="number" min="1" className="block w-full rounded border px-2 py-1" value={p.targetWeightKg} onChange={e=>update("targetWeightKg",e.target.value)} /></label>
        <label>Oma kcal-tavoite (vapaaehtoinen) <input type="number" min="1" className="block w-full rounded border px-2 py-1" value={p.manualKcal} onChange={e=>update("manualKcal",e.target.value)} /></label>
        <label>Erityistilanne <select className="block w-full rounded border px-2 py-1" value={p.specialSituation} onChange={e=>update("specialSituation",e.target.value as ArvoPreferences["specialSituation"])}><option value="none">Ei</option><option value="pregnancy">Raskaus</option><option value="breastfeeding">Imetys</option><option value="other">Muu</option></select></label>
</div>}
      </section>}

      {activeSection==="health"&&(<>
    <section className="mb-5 rounded-xl bg-white/75 p-4"><h3 className="text-xl font-bold">Terveystiedot</h3><p className="text-sm">Salli terveystietojen käyttö mobiilistasi — ei vielä käytettävissä selainversiossa. Apple Health / Health Connect -yhteys ja oikeuksien peruminen toteutetaan vasta toimivalla integraatiolla. Terveystietoja ei haeta.</p></section>
      </>)}
      {activeSection==="purchases"&&<section className="h-full rounded-xl bg-white/75 p-3 text-sm">
        <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={p.purchaseTracking} onChange={e=>update("purchaseTracking",e.target.checked)}/> Käytä vahvistettuja ostoksia täydennysarvioihin</label>
        <p className="mt-1 text-xs text-[#6d6a5c]">Ostoskorin tuotteita ei merkitä automaattisesti ostetuiksi.</p>
        {!purchasePage&&<div className="mt-3 grid gap-2">
          <button type="button" className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-left" onClick={()=>setPurchasePage("record")}><span><b className="block">Vahvista ostos</b><small>Kirjaa ostettu tuote ja määrä</small></span>›</button>
          <button type="button" className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-left" onClick={()=>{setSuggestionIndex(0);setPurchasePage("suggestions")}}><span><b className="block">Täydennysarviot</b><small>Vahvistetuista ostoksista lasketut arviot</small></span>›</button>
          <button type="button" className="flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-left" onClick={()=>setPurchasePage("history")}><span><b className="block">Ostohistoria</b><small>{purchases.length} vahvistettua ostotapahtumaa</small></span>›</button>
        </div>}
        {purchasePage==="record"&&<div className="mt-2"><h3 className="font-bold">Kirjaa vahvistettu ostos</h3>        <form className="mt-2 flex flex-wrap items-end gap-2" onSubmit={e=>{e.preventDefault();const name=purchaseName.trim();const quantity=Number(purchaseQuantity);if(!name||!(quantity>0))return;const next=[...purchases,{id:String(Date.now())+"-"+purchases.length,name,quantity,purchasedAt:new Date().toISOString()}];setPurchases(next);try{window.localStorage.setItem(ARVO_PURCHASES_KEY,JSON.stringify(next));}catch{}setPurchaseName("");setPurchaseQuantity("1");}}>
          <label className="text-sm">Ostettu tuote<input className="block rounded border p-2" required value={purchaseName} onChange={e=>setPurchaseName(e.target.value)} placeholder="Esim. maito 1 l" /></label>
          <label className="text-sm">Määrä<input className="block w-20 rounded border p-2" type="number" min="0.01" step="0.01" required value={purchaseQuantity} onChange={e=>setPurchaseQuantity(e.target.value)} /></label>
          <button type="submit" className="rounded-lg bg-[#24573e] px-4 py-2 font-bold text-white">Vahvista ostos</button>
        </form>
<p className="mt-2 text-xs">Ostoksi lasketaan vain itse vahvistamasi tapahtuma.</p></div>}
        {purchasePage==="suggestions"&&<div className="mt-2"><h3 className="font-bold">Täydennysarviot</h3><p className="mt-1 text-xs">Arvio edellyttää vähintään kolmea eri ostopäivää. Ostoväli ei kerro kotona olevaa määrää.</p>{(()=>{const items=arvoPurchaseSuggestions(purchases).filter(item=>!dismissedSuggestions.includes(item.key));const item=items[Math.min(suggestionIndex,Math.max(0,items.length-1))];return item?<><div className="mt-2 rounded-lg border bg-white p-2"><b>{item.name}</b> voi olla vähissä (ostoväli noin {item.intervalDays} vrk).<div className="mt-2 flex flex-wrap gap-2"><button type="button" className="rounded border px-2 py-1" onClick={()=>{window.dispatchEvent(new CustomEvent("ziiply-arvo-add-to-shopping-list",{detail:{name:item.name}}));setDismissedSuggestions(old=>[...old,item.key]);setSuggestionIndex(0)}}>Lisää ostettavaksi</button><button type="button" className="rounded border px-2 py-1" onClick={()=>{setDismissedSuggestions(old=>[...old,item.key]);setSuggestionIndex(0)}}>Vielä on / myöhemmin</button></div></div><div className="mt-2 flex items-center justify-between"><button type="button" disabled={suggestionIndex===0} onClick={()=>setSuggestionIndex(i=>Math.max(0,i-1))}>← Edellinen</button><span>{Math.min(suggestionIndex+1,items.length)} / {items.length}</span><button type="button" disabled={suggestionIndex>=items.length-1} onClick={()=>setSuggestionIndex(i=>Math.min(items.length-1,i+1))}>Seuraava →</button></div></>:<p className="mt-2">Ei täydennysarvioita.</p>})()}<p className="mt-2 text-xs">Lisää ostettavaksi -toiminto lisää tuotteen desktopin ostoskoriin. Automaattisia ilmoituksia ei lähetetä.</p></div>}
        {purchasePage==="history"&&<div className="mt-2"><h3 className="font-bold">Ostohistoria</h3><p className="mt-2">Vahvistettuja ostotapahtumia: <b>{purchases.length}</b></p>        <button type="button" className="mt-2 rounded border px-3 py-1 text-sm" onClick={()=>{if(!window.confirm("Poistetaanko kaikki Arvon vahvistetut ostokset tältä selaimelta?"))return;setPurchases([]);window.localStorage.removeItem(ARVO_PURCHASES_KEY);}}>Poista ostohistoria</button>
      </div>}
      </section>}

      {activeSection==="reminders"&&<section className="h-full rounded-xl bg-white/75 p-3">
        {!reminderPage&&<div className="grid gap-2">
          <button type="button" className="flex items-center justify-between rounded-lg border bg-white px-3 py-3 text-left" onClick={()=>setReminderPage("times")}><span><b className="block">Ruokailuajat ja hiljainen aika</b><small>Neljä ruokailuaikaa ja hiljainen aika</small></span>›</button>
          <button type="button" className="flex items-center justify-between rounded-lg border bg-white px-3 py-3 text-left" onClick={()=>setReminderPage("suggestions")}><span><b className="block">Viikonloput, juhlat ja kalenteri</b><small>Valitse haluamasi ehdotukset</small></span>›</button>
          <p className="text-xs">Valinnat tallentuvat, mutta automaattiset ilmoitukset ja kalenteriyhteys eivät vielä ole käytössä.</p>
        </div>}
        {reminderPage==="times"&&<div className="text-sm"><h3 className="mb-2 font-bold">Ruokailuajat</h3>      <div className="grid gap-2 grid-cols-2">{mealLabels.map(({key,label})=><label key={key} className="text-sm">{label}<input type="time" className="block w-full rounded border p-2" value={p.mealTimes[key]||""} onChange={e=>update("mealTimes",{...p.mealTimes,[key]:e.target.value})}/></label>)}</div>
      <label className="mt-2 block"><input type="checkbox" checked={p.mealRemindersEnabled} onChange={e=>update("mealRemindersEnabled",e.target.checked)} /> Haluan ruokailumuistutukset, kun toiminto on käytettävissä</label>
      <div className="mt-2 grid gap-2 grid-cols-2"><label className="text-sm">Hiljainen aika alkaa<input type="time" className="block w-full rounded border p-2" value={p.quietHoursStart} onChange={e=>update("quietHoursStart",e.target.value)}/></label><label className="text-sm">Hiljainen aika päättyy<input type="time" className="block w-full rounded border p-2" value={p.quietHoursEnd} onChange={e=>update("quietHoursEnd",e.target.value)}/></label></div>
<p className="mt-2 text-xs">Ajat tallennetaan. Selainilmoituksia ei vielä lähetetä.</p></div>}
        {reminderPage==="suggestions"&&<div className="text-sm">      <h4 className="mb-2 font-bold">Viikonloput, juhlat ja kalenteri</h4>
      <label className="mt-2 flex items-start gap-2"><input type="checkbox" checked={p.weekendSuggestions} onChange={e=>update("weekendSuggestions",e.target.checked)}/> Ehdota viikonloppuruokia perjantaisin, lauantaisin ja sunnuntaisin</label>
      <label className="mt-2 flex items-start gap-2"><input type="checkbox" checked={p.celebrationSuggestions} onChange={e=>update("celebrationSuggestions",e.target.checked)}/> Ehdota ruokia juhliin ja merkkipäiviin</label>
      <label className="mt-2 flex items-start gap-2"><input type="checkbox" checked={p.calendarSuggestions} onChange={e=>update("calendarSuggestions",e.target.checked)}/> Salli kalenteriin liittyvät ehdotukset, kun yhteys on toteutettu</label>
      <p className="mt-2 text-xs">Kalenteria ei lueta, eikä ilmoitus- tai sijaintilupia pyydetä. Taustamuistutukset ja kaupan lähestymisen tunnistus vaativat erilliset integraatiot.</p>
</div>}
      </section>}

      </div>
    </div>}
    </div>
  </div>;
}
