import fs from 'node:fs';
import assert from 'node:assert/strict';
const [file, expectedIssue, referenceTime] = process.argv.slice(2);

function isoWeek(date){
 const d=new Date(date);d.setUTCDate(d.getUTCDate()+3-((d.getUTCDay()+6)%7));
 const start=new Date(Date.UTC(d.getUTCFullYear(),0,4));
 start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7));
 return 1+Math.round((d-start)/604800000);
}

if (file === '--target') {
 const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Helsinki', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', hourCycle: 'h23',
 }).formatToParts(expectedIssue ? new Date(expectedIssue) : new Date());
 const part = name => Number(parts.find(p => p.type === name)?.value);
 const date = new Date(Date.UTC(part('year'), part('month') - 1, part('day')));
 if ([0, 3].includes(date.getUTCDay()) && part('hour') >= 15) {
  date.setUTCDate(date.getUTCDate() + 1);
 }
 const kind = date.getUTCDay() >= 1 && date.getUTCDay() <= 3 ? 'AV' : 'LV';
 console.log(String(isoWeek(date)).padStart(2, '0') + kind);
} else {
 assert.ok(file && /^\d{2}(AV|LV)$/.test(expectedIssue || '') && !referenceTime,
  'Usage: check-active-edition.mjs --target [ISO-time] | leaflet.json WWAV|WWLV');
 const data = JSON.parse(fs.readFileSync(file, 'utf8'));
 const url = new URL(data.leaflet);
 assert.equal(url.hostname, 'kcm-tarjouslehdet.k-ruoka.fi', 'Unexpected publisher host');
 const match = url.pathname.match(/tarjouslehti_(\d{1,2})(AV|LV)_KCM\/index[.]html/i);
 assert.ok(match, 'Unknown Citymarket leaflet identity');
 assert.equal(match[1].padStart(2, '0') + match[2].toUpperCase(), expectedIssue,
  'Publisher redirected to a different edition');
 assert.ok(Array.isArray(data.rows) && data.rows.length > 0, 'Empty Citymarket publication');
 console.log('Verified Citymarket edition', expectedIssue, data.leaflet, 'offers', data.rows.length);
}
