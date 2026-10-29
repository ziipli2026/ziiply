"use client";
import {useEffect,useMemo,useState} from "react";
import {arvoDailyStatistics,arvoNutritionTotals,readArvoMeals,type ArvoMeal} from "../components/ziiply/arvo/arvoStatistics";

const metrics = [{key:"kcal",label:"Energia",unit:"kcal"},{key:"protein",label:"Proteiini",unit:"g"},{key:"carbs",label:"Hiilihydraatit",unit:"g"},{key:"fat",label:"Rasva",unit:"g"}] as const;
const format = (value:number)=>value.toLocaleString("fi-FI",{maximumFractionDigits:1});
export default function ArvoStatisticsPage() {
  const [meals,setMeals] = useState<ArvoMeal[]>([]);
  const [period,setPeriod] = useState<"day"|"week"|"month">("week");
  const [now,setNow] = useState<Date|null>(null);
  const refresh=()=>{setMeals(readArvoMeals(window.localStorage));setNow(new Date());};
  useEffect(()=>{
    refresh();
    window.addEventListener("storage",refresh);
    window.addEventListener("ziiply-arvo-meals-updated",refresh);
    return ()=>{window.removeEventListener("storage",refresh);window.removeEventListener("ziiply-arvo-meals-updated",refresh);};
  },[]);
  const selected=useMemo(()=>{
    if(!now)return [];
    const start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    if(period==="week")start.setDate(start.getDate()-6);
    if(period==="month")start.setDate(start.getDate()-29);
    return meals.filter(meal=>new Date(meal.timestamp)>=start&&new Date(meal.timestamp)<=now);
  },[meals,period,now]);
  const totals=useMemo(()=>arvoNutritionTotals(selected),[selected]);
  const daily=useMemo(()=>Object.entries(arvoDailyStatistics(selected)).sort(([a],[b])=>b.localeCompare(a)),[selected]);
  return <main className="min-h-screen bg-[#f8f5ed] px-4 py-8 text-[#173b2b]">
    <div className="mx-auto max-w-3xl">
      <a href="/" className="text-sm font-semibold underline">← Ziiply</a>
      <div className="mt-5 flex items-center gap-4"><img src="/assistants/arvo.png" alt="Arvo" className="h-16 w-16 rounded-full"/><div><h1 className="text-3xl font-black">Arvon ravintotilastot</h1><p className="text-sm">Ateriapäiväkirjan ravintoarvoyhteenveto</p></div></div>
      <p className="mt-5 rounded-xl border border-[#d3c9ad] bg-white p-3 text-sm">Tiedot ovat tällä hetkellä vain tämän selaimen muistissa. Ne eivät synkronoidu laitteiden välillä. Puuttuvia ravintoarvoja ei arvioida nollaksi. Health-tietoja ei käsitellä tässä näkymässä.</p>
      <div className="mt-5 flex gap-2" aria-label="Tilastojakso">{([["day","Tänään"],["week","7 päivää"],["month","30 päivää"]] as const).map(([key,label])=><button key={key} type="button" onClick={()=>setPeriod(key)} aria-pressed={period===key} className={`rounded-xl px-4 py-2 text-sm font-bold ${period===key?"bg-[#24573e] text-white":"border border-[#a9b7a7] bg-white"}`}>{label}</button>)}</div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{metrics.map(metric=><div key={metric.key} className="rounded-xl border border-[#d3c9ad] bg-white p-4"><p className="text-xs font-bold">{metric.label}</p><p className="mt-2 text-2xl font-black">{totals.known[metric.key]?format(totals[metric.key]):"—"}</p><p className="text-xs">{metric.unit} · {totals.known[metric.key]}/{totals.entries} merkintää</p></div>)}</div>
      <h2 className="mt-8 text-xl font-black">Päivittäinen seuranta</h2>
      {daily.length===0?<p className="mt-3 rounded-xl bg-white p-5">Ei vielä tallennettuja aterioita valitulla jaksolla. Skannaa tuote Arvolla ja paina Aterialle.</p>:<div className="mt-3 overflow-x-auto rounded-xl border border-[#d3c9ad] bg-white"><table className="w-full text-left text-sm"><thead><tr className="border-b bg-[#efe9da]"><th className="p-3">Päivä</th><th className="p-3">Ateriat</th>{metrics.map(metric=><th key={metric.key} className="p-3">{metric.label}</th>)}</tr></thead><tbody>{daily.map(([date,values])=><tr key={date} className="border-b last:border-0"><td className="p-3">{date}</td><td className="p-3">{values.entries}</td>{metrics.map(metric=><td key={metric.key} className="p-3">{values.known[metric.key]?format(values[metric.key]):"—"}</td>)}</tr>)}</tbody></table></div>}
      <h2 className="mt-8 text-xl font-black">Ateriapäiväkirja</h2>
      <div className="mt-3 space-y-2">{selected.slice().sort((a,b)=>b.timestamp.localeCompare(a.timestamp)).map(meal=><article key={meal.id} className="rounded-xl border border-[#d3c9ad] bg-white p-4"><p className="font-bold">{meal.name}</p><p className="text-xs">{new Date(meal.timestamp).toLocaleString("fi-FI")} · {format(meal.grams)} g</p><p className="mt-2 text-sm">Energia {meal.nutrition.kcal===null?"—":format(meal.nutrition.kcal)} kcal · Proteiini {meal.nutrition.protein===null?"—":format(meal.nutrition.protein)} g · HH {meal.nutrition.carbs===null?"—":format(meal.nutrition.carbs)} g · Rasva {meal.nutrition.fat===null?"—":format(meal.nutrition.fat)} g</p></article>)}</div>
    </div>
  </main>;
}
