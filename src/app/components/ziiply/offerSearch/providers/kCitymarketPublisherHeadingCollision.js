// Publication-independent evidence gate: a publisher row that joins two
// separately printed product headings is not one purchasable transaction.
const words=s=>String(s||'').toLocaleLowerCase('fi-FI').normalize('NFKC').replace(/[^\p{L}\p{N}]+/gu,' ').split(' ').filter(x=>x.length>=4);
const distinctive=s=>[...new Set(words(s))];
export function flagMergedPublisherHeadings(rows){
 return (rows||[]).map(row=>{
  if(row.debugSuspiciousPublisherTitle)return row;
  const title=String(row.title||'');
  const own=distinctive(title);
  if(own.length<3)return row;
  const peers=(rows||[]).filter(other=>other!==row&&other.page===row.page);
  const matches=peers.filter(other=>{
   const tokens=distinctive(other.title);
   if(tokens.length<1||tokens.length>own.length)return false;
   const hits=tokens.filter(x=>own.includes(x));
   const pack=String(other.title).match(/\b\d+(?:\s*[x×]\s*\d+)?\s*(?:g|kg|ml|l)\b/i)?.[0];
   return hits.length/tokens.length>=0.75&&(hits.length>=2||(hits.length===1&&pack&&title.includes(pack)));
  });
  const disjoint=matches.some((a,i)=>matches.slice(i+1).some(b=>{
   const wa=distinctive(a.title),wb=distinctive(b.title);
   return wa.filter(x=>wb.includes(x)).length===0;
  }));
  return disjoint?{...row,debugSuspiciousPublisherTitle:{title,reason:'merged-publisher-product-headings',detail:'independent-headings-on-same-page',requiresSeparateCardPriceProof:true}}:row;
 });
}
