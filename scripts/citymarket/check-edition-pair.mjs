import fs from 'node:fs';
import assert from 'node:assert/strict';
const files=process.argv.slice(2);
assert.equal(files.length,2,'Expected AV and LV metadata paths');
const editions=files.map(file=>{
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 const match=new URL(data.leaflet).pathname.match(/tarjouslehti_(\d+)(AV|LV)_KCM\/index\.html/i);
 assert.ok(match,'Unknown Citymarket leaflet identity: '+data.leaflet);
 assert.ok(Array.isArray(data.rows)&&data.rows.length>0,'Empty leaflet: '+data.leaflet);
 return {week:Number(match[1]),kind:match[2].toUpperCase(),url:data.leaflet};
});
assert.equal(editions[0].kind,'AV','AV entry redirected to another edition');
assert.equal(editions[1].kind,'LV','LV entry redirected to another edition');
// On Sunday/Monday the AV may already be the new week while LV is still last week.
const avWeek=editions[0].week, lvWeek=editions[1].week;
const adjacent=avWeek===lvWeek || avWeek===lvWeek+1 || (avWeek===1 && (lvWeek===52 || lvWeek===53));
assert.ok(adjacent,'AV/LV editions are not adjacent publication weeks');
assert.notEqual(editions[0].url,editions[1].url,'AV and LV resolved to the same publication');

// Reject a publisher redirect to an old leaflet even when AV/LV are distinct.
const localDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Helsinki',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const [y,m,d]=localDate.split('-').map(Number);
const today=new Date(Date.UTC(y,m-1,d));
function isoWeek(date){
 const thursday=new Date(date);
 thursday.setUTCDate(date.getUTCDate()+3-((date.getUTCDay()+6)%7));
 const yearStart=new Date(Date.UTC(thursday.getUTCFullYear(),0,4));
 yearStart.setUTCDate(yearStart.getUTCDate()-((yearStart.getUTCDay()+6)%7));
 return 1+Math.round((thursday.getTime()-yearStart.getTime())/604800000);
}
const expectedAV=isoWeek(today);
const expectedLV=isoWeek(today.getUTCDay()===0||today.getUTCDay()===1
 ? new Date(today.getTime()-7*86400000):today);
assert.equal(editions[0].week,expectedAV,'AV entry resolved to stale or future week');
assert.equal(editions[1].week,expectedLV,'LV entry resolved to stale or future week');

console.log('Verified distinct Citymarket editions',editions);
