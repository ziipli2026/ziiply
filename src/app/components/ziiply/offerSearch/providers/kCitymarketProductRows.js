/** Canonical product identities from contiguous lines of one printed card. */
export function canonicalCitymarketProductRows(rows) {
  const items=rows.map(row=>({...row})).sort((a,b)=>a.page-b.page||(a.debugCardAnchor?.top??0)-(b.debugCardAnchor?.top??0));
  const consumed=new Set();
  const quantity=r=>r?.quantity==null||r.quantity===1?1:r.quantity;
  const sameTransaction=(a,b)=>a&&b&&a.value===b.value&&quantity(a)===quantity(b)&&
    (!a.unit||!b.unit||a.unit===b.unit);
  const line=row=>{
    const own=String(row.debugCardAnchor?.text||'').trim();
    const title=String(row.title||'').trim().replace(/^\d+KPL-\d+[–-]\d+%\s*/,'');
    const anchor=row.debugCardAnchor;
    if(anchor && row.package?.raw){
      const starts=(row.debugNearbyBoxes||[]).filter(b=>/^[A-ZÅÄÖ]{3,}[A-ZÅÄÖ-]*$/.test(b.text)&&
        Math.abs(b.left-anchor.left)<.005&&b.top-anchor.top>.005&&b.top-anchor.top<.025);
      if(starts.length===1){
        const start=starts[0];
        const words=(row.debugNearbyBoxes||[]).filter(b=>Math.abs(b.top-start.top)<.001&&
          b.left>=anchor.left-.001&&b.left<anchor.left+.25&&/^[A-ZÅÄÖ][A-ZÅÄÖ-]+$/.test(b.text)).sort((a,b)=>a.left-b.left).map(b=>b.text);
        const proposed=own+(own.endsWith('-')?'':' ')+words.join(' ')+' '+row.package.raw;
        const letters=t=>t.replace(/\([^)]*\)/g,'').replace(/[^A-Za-zÅÄÖåäö-]/g,'');
        const numbers=t=>(t.replace(/\([^)]*\)/g,'').match(/\d+(?:[,.]\d+)?/g)||[]).join('|');
        if(letters(proposed)===letters(title)&&numbers(proposed)!==numbers(title))return proposed;
      }
    }
    const withoutNumber=title.replace(/^\d+\.\s*/,'');
    if(own===withoutNumber)return own;
    if(/\b\d+(?:[,.]\d+)?\s*(?:g|kg|ml|l)\b/i.test(own) && title.startsWith(own) && /^\s*\d+[\d\s,.()\/kgml–-]*$/.test(title.slice(own.length)))return own;
    return title;
  };
  return items.flatMap((row,index)=>{
    if(consumed.has(index))return [];
    let title=line(row);
    const anchor=row.debugCardAnchor;
    if(anchor&&/(?:[A-ZÅÄÖ]-|\bja)$/.test(title)){
      const candidates=items.map((next,i)=>({next,i})).filter(({next,i})=>i!==index&&!consumed.has(i)&&next.page===row.page&&
        next.debugCardAnchor&&Math.abs(next.debugCardAnchor.left-anchor.left)<.005&&
        next.debugCardAnchor.top-anchor.top>.005&&next.debugCardAnchor.top-anchor.top<.025&&
        sameTransaction(row.spatialResolved,next.spatialResolved)&&
        row.unitPrice?.min===next.unitPrice?.min&&row.unitPrice?.max===next.unitPrice?.max);
      if(candidates.length===1){
        const {next,i}=candidates[0];const continuation=line(next);
        if(/^[A-ZÅÄÖ]/.test(continuation)){
          title=title.endsWith('-')?title+continuation:title+' '+continuation;
          consumed.add(i);
          if(row.package&&next.package&&row.package.raw!==next.package.raw){
            row.package={min:Math.min(row.package.min,next.package.min),max:Math.max(row.package.max,next.package.max),raw:[row.package.raw,next.package.raw].join(' / '),variantSizes:[row.package.raw,next.package.raw]};
          }else row.package=row.package||next.package;
          row.nearby=[...(row.nearby||[]),...(next.nearby||[])];
          row.productRowProof={source:'aligned-print-continuation-and-identical-transaction',titles:[row.title,next.title]};
        }
      }
    }
    return [{...row,title}];
  });
}

/** A mixed-set badge cannot become a discount for one component alone. */
export function rejectUnownedMixedSetPercentage(row){
  const context=(row.nearby||[]).join(' ');
  if(!row.spatialResolved&&row.percentageOffer&&/YHTEIS[\s-]*HINTAAN/i.test(context)&&/\bSETTI\b/i.test(context)){
    return {...row,percentageOffer:null,debugRejectedPercentage:{...row.percentageOffer,reason:'mixed-set-requires-owned-complete-product-identity'}};
  }
  return row;
}
