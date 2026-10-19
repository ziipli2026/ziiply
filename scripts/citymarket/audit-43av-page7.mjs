import fs from 'node:fs';
const rows=JSON.parse(fs.readFileSync('/tmp/43av-replayed.json','utf8')).rows.filter(x=>x.page===7);
for(const row of rows){
 const anchor=row.debugCardAnchor;
 console.log('PAGE7_CARD',JSON.stringify({
  title:row.title,anchor,chosen:row.spatialResolved,unitRate:row.unitPrice,
  normal:row.normal,printed:row.debugCardPrice,rejected:row.debugRejectedCardPrice,
  conflict:row.debugPriceOwnershipConflict,nearby:row.nearby,
  glyphs:(row.debugNearbyBoxes||[]).filter(b=>b.height>=.035).map(b=>({
   text:b.text,left:b.left,top:b.top,width:b.width,height:b.height
  })),candidates:(row.spatialCandidates||[]).slice(0,15)
 }));
}
