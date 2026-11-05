import fs from 'node:fs';
import assert from 'node:assert/strict';
const [file,expectedKind]=process.argv.slice(2);
assert.ok(file && /^(AV|LV)$/.test(expectedKind||''),'Usage: check-active-edition.mjs leaflet.json AV|LV');
const data=JSON.parse(fs.readFileSync(file,'utf8'));
const url=new URL(data.leaflet);
assert.equal(url.hostname,'kcm-tarjouslehdet.k-ruoka.fi','Unexpected publisher host');
const match=url.pathname.match(/tarjouslehti_(\\d+)(AV|LV)_KCM\\/index\\.html/i);
assert.ok(match,'Unknown Citymarket leaflet identity');
assert.equal(match[2].toUpperCase(),expectedKind,'Publisher redirected to a different edition');
assert.ok(Array.isArray(data.rows) && data.rows.length>0,'Empty Citymarket publication');
const local=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Helsinki',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const [year,month,day]=local.split('-').map(Number);
const today=new Date(Date.UTC(year,month-1,day));
function isoWeek(date){
 const d=new Date(date);d.setUTCDate(d.getUTCDate()+3-((d.getUTCDay()+6)%7));
 const start=new Date(Date.UTC(d.getUTCFullYear(),0,4));
 start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));
 return 1+Math.round((d-start)/604800000);
}
assert.equal(Number(match[1]),isoWeek(today),'Publisher redirected to stale or future week');
const weekday=today.getUTCDay();
assert.equal(expectedKind,weekday>=1 && weekday<=3?'AV':'LV','Unexpected edition for Helsinki publication day');
console.log('Verified active Citymarket edition',data.leaflet,'offers',data.rows.length);
