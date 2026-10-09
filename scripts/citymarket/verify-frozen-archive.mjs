import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const manifest=JSON.parse(fs.readFileSync('scripts/citymarket/leaflet-regression-publications.json','utf8'));
const root=process.argv[2]||'/tmp/kcm-frozen';
const entries=[...(manifest.historicalFixtures||[])];
if(manifest.current&&!entries.some(x=>x.id===manifest.current.id))entries.push(manifest.current);
if(!entries.length)throw Error('No publication fixtures configured');
for(const entry of entries){
  const dir=path.join(root,'publications',entry.id);
  const read=(name)=>fs.readFileSync(path.join(dir,name));
  const meta=JSON.parse(read('archive-manifest.json'));
  const pdf=read('leaflet.pdf');
  if(!pdf.subarray(0,5).equals(Buffer.from('%PDF-')))throw Error(entry.id+': invalid PDF');
  const digest=createHash('sha256').update(pdf).digest('hex');
  const fixture=JSON.parse(fs.readFileSync(entry.fixture,'utf8'));
  if(meta.pdfSha256!==digest||fixture.pdfSha256!==digest)throw Error(entry.id+': source PDF checksum mismatch');
  if(meta.pageCount!==fixture.pageCount)throw Error(entry.id+': page count mismatch');
  const evidence=JSON.parse(read('parser-evidence.json'));
  if(!Array.isArray(evidence.rows))throw Error(entry.id+': no parser evidence');
  const keys=new Set(evidence.rows.flatMap(row=>{
    const title=String(row.title||'').trim().toLowerCase(),page=Number(row.page)||0;
    const resolved=row.spatialResolved;
    if(resolved&&!resolved.displayOnlyUnitPrice&&Number(resolved.value)>0)
      return [`kcm:spatial:${page}:${title}:${Number(resolved.value)}`];
    const percent=Number(row.percentageOffer?.percent);
    return percent>0&&percent<100?[`kcm:spatial:${page}:${title}:percent:${percent}`]:[];
  }));
  const expected=new Set(fixture.offers.map(x=>x.key));
  const missing=[...expected].filter(k=>!keys.has(k));
  const extra=[...keys].filter(k=>!expected.has(k));
  console.log('KCM_OFFLINE_ARCHIVE',JSON.stringify({id:entry.id,pages:meta.pageCount,expected:expected.size,matched:expected.size-missing.length,missing,extra,sha256:digest}));
  if(missing.length||extra.length)throw Error(entry.id+': frozen evidence differs from approved fixture');
}
