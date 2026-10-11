const hours=new Set([6,10,15,20]);
export function fuelRefreshDue(date=new Date(),allowSchedulerDelay=false) {
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Helsinki',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const hour=Number(parts.find(p=>p.type==='hour').value), minute=Number(parts.find(p=>p.type==='minute').value);
 return hours.has(hour)&&(minute===0||allowSchedulerDelay);
}
