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
  manualKcal: "", specialSituation: "none", purchaseTracking: false
};
export function readArvoPreferences(): ArvoPreferences {
  if (typeof window === "undefined") return { ...DEFAULT_ARVO_PREFERENCES };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(ARVO_STORAGE_KEY) || "{}");
    return { ...DEFAULT_ARVO_PREFERENCES, ...parsed, diets: Array.isArray(parsed.diets) ? parsed.diets.filter((d: unknown) => ARVO_DIETS.some(([key]) => key === d)) : [] };
  } catch { return { ...DEFAULT_ARVO_PREFERENCES }; }
}
export function effectiveArvoDiets(diets: string[]) {
  const values = new Set(diets);
  if (values.has("vegan")) { values.add("dairyFree"); values.add("eggFree"); values.add("vegetarian"); }
  if (values.has("dairyFree")) values.add("lactoseFree");
  if (values.has("grainFree")) values.add("glutenFree");
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
export default function ArvoSettingsPanel() {
  const [p, setP] = useState<ArvoPreferences>(DEFAULT_ARVO_PREFERENCES);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { setP(readArvoPreferences()); setLoaded(true); }, []);
  useEffect(() => { if (loaded) { try { window.localStorage.setItem(ARVO_STORAGE_KEY, JSON.stringify(p)); window.dispatchEvent(new Event("ziiply-arvo-preferences-updated")); } catch {} } }, [p, loaded]);
  const update = <K extends keyof ArvoPreferences>(key: K, value: ArvoPreferences[K]) => setP(prev => ({ ...prev, [key]: value }));
  const energy = estimateArvoEnergy(p);
  return <div className="h-full overflow-y-auto px-2 py-4 text-[#173b2b]">
    <p className="mb-4 text-sm">Asetukset tallentuvat tähän selaimeen. Eivät vielä synkronoidu eri laitteiden välillä.</p>
    <section className="mb-5 rounded-xl bg-white/75 p-4">
      <h3 className="mb-2 text-xl font-bold">Kotitalous ja reseptit</h3>
      <label className="block">Henkilömäärä <input aria-label="Kotitalouden henkilömäärä" className="ml-3 w-20 rounded border p-2" type="number" min={1} max={50} value={p.householdSize} onChange={e=>update("householdSize",Math.min(50,Math.max(1,Number(e.target.value)||1)))} /></label>
      <p className="my-2 text-xs">Justiina varmistaa annosmäärän jokaisella reseptikerralla. Oma annoskoko on erillinen.</p>
      <h4 className="mt-4 font-bold">Ruokavaliot (voit valita useita)</h4>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">{ARVO_DIETS.map(([key,label,description])=><label key={key} className="rounded-lg border bg-white p-2 text-sm"><input type="checkbox" checked={p.diets.includes(key)} onChange={e=>update("diets",e.target.checked?[...p.diets,key]:p.diets.filter(d=>d!==key))} /> <strong>{label}</strong><span className="block text-xs">{description}</span></label>)}</div>
      <p className="mt-2 text-xs">Yhdistetyt rajaukset: {effectiveArvoDiets(p.diets).map(key=>ARVO_DIETS.find(([id])=>id===key)?.[1]).join(", ")||"Ei valintoja"}</p>
      <label className="mt-3 block font-bold">Allergiat <textarea className="mt-1 w-full rounded border p-2 font-normal" value={p.allergies} onChange={e=>update("allergies",e.target.value)} placeholder="Esim. seesami, äyriäiset" /></label>
      <label className="mt-3 block font-bold">Muut vältettävät ainekset <textarea className="mt-1 w-full rounded border p-2 font-normal" value={p.avoidedIngredients} onChange={e=>update("avoidedIngredients",e.target.value)} /></label>
      <p className="text-xs">Puutteellisten tuotetietojen perusteella ei voi varmistaa allergeeniturvallisuutta.</p>
    </section>
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
    <section className="mb-5 rounded-xl bg-white/75 p-4"><h3 className="text-xl font-bold">Terveystiedot</h3><p className="text-sm">Salli terveystietojen käyttö mobiilistasi — ei vielä käytettävissä selainversiossa. Apple Health / Health Connect -yhteys ja oikeuksien peruminen toteutetaan vasta toimivalla integraatiolla. Terveystietoja ei haeta.</p></section>
    <section className="mb-5 rounded-xl bg-white/75 p-4"><h3 className="text-xl font-bold">Ostohistoria ja kulutus</h3><label><input type="checkbox" checked={p.purchaseTracking} onChange={e=>update("purchaseTracking",e.target.checked)} /> Salli vahvistettujen ostosten perusteella tehtävät täydennysarviot</label><p className="text-sm">Ostotapahtumien vahvistus, ostorytmin laskenta ja muistutukset eivät ole vielä käytössä. Pelkkää ostoslistalle lisäämistä ei kirjata ostokseksi.</p></section>
    <section className="rounded-xl bg-white/75 p-4"><h3 className="text-xl font-bold">Muistutukset ja sijainti</h3><p className="text-sm">Ruokailu-, kalenteri- ja sijaintimuistutukset tulevat myöhemmässä vaiheessa. Taustasijaintia tai ilmoituslupia ei pyydetä.</p></section>
  </div>;
}
