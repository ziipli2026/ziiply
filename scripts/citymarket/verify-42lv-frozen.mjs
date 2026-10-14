import fs from 'node:fs';
const f=JSON.parse(fs.readFileSync(process.argv[2]+'/leaflet.json','utf8'));
if(f.rows.length!==89)throw Error('Unexpected frozen row count');
console.log('Frozen 42LV row count',f.rows.length);
