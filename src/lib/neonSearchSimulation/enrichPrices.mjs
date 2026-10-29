// Test-branch only: read-only store-specific price enrichment for Neon EAN rows.
// Call after initial results are published; do not block first paint.
export async function enrichNeonRows(rows, lookup, publish, signal, maxProducts=25) {
  const result=rows.map(row=>({...row,prices:{...row.prices}}));
  const candidates=result.filter(row=>/^\d{8,14}$/.test(String(row.ean||''))&&!Object.values(row.prices).some(v=>Number.isFinite(v)&&v>0)).slice(0,maxProducts);
  let next=0;
  async function worker(){
    while(next<candidates.length&&!signal.aborted){
      const row=candidates[next++];
      try {
        const found=await lookup({ean:row.ean,name:row.name},signal);
        if(signal.aborted)break;
        let changed=false;
        for(const match of found){
          if(String(match.ean)!==String(row.ean)||!['S','K'].includes(match.store)||!Number.isFinite(match.price)||match.price<=0)continue;
          if(row.prices[match.store]==null){row.prices[match.store]=match.price;changed=true;}
        }
        if(changed)publish(result.map(x=>({...x,prices:{...x.prices}})));
      }catch{/* Keep existing results if upstream fails. */}
    }
  }
  await Promise.all(Array.from({length:Math.min(3,candidates.length)},worker));
  return result;
}
