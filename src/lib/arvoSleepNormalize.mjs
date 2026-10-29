// Deterministic, source-aware sleep stage normalization for native integrations.
// Input intervals are milliseconds since Unix epoch, stage is rem/core/deep/awake.
// For overlapping readings, prefer the first source in preferredSources.
// No data storage, network calls or platform dependencies.
export function normalizeSleepStages(intervals, startMs, endMs, preferredSources=[]) {
 if(!Number.isFinite(startMs)||!Number.isFinite(endMs)||endMs<=startMs)throw new Error("INVALID_RANGE");
 const stages=new Set(["rem","core","deep","awake"]);
 const clean=intervals.filter(x=>x&&stages.has(x.stage)&&Number.isFinite(x.start)&&Number.isFinite(x.end)&&x.end>x.start)
  .map(x=>({...x,start:Math.max(x.start,startMs),end:Math.min(x.end,endMs)}))
  .filter(x=>x.end>x.start);
 const boundaries=[startMs,endMs,...clean.flatMap(x=>[x.start,x.end])].sort((a,b)=>a-b);
 const unique=[...new Set(boundaries)];
 const result={remMinutes:0,coreMinutes:0,deepMinutes:0,awakeMinutes:0,sleepMinutes:0};
 for(let i=0;i<unique.length-1;i++){
  const a=unique[i],b=unique[i+1];
  const active=clean.filter(x=>x.start<=a&&x.end>=b);
  if(!active.length)continue;
  active.sort((x,y)=>{
   const px=preferredSources.indexOf(x.source),py=preferredSources.indexOf(y.source);
   const ax=px<0?1e6:px,ay=py<0?1e6:py;
   return ax-ay||String(x.source||"").localeCompare(String(y.source||""))||x.stage.localeCompare(y.stage);
  });
  const key=active[0].stage+"Minutes";
  result[key]+=(b-a)/60000;
 }
 for(const key of Object.keys(result))if(key!=="sleepMinutes")result[key]=Math.round(result[key]);
 result.sleepMinutes=result.remMinutes+result.coreMinutes+result.deepMinutes;
 return result;
}
