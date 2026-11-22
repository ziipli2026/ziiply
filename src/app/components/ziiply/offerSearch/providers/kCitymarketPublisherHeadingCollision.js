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

// The same discount badge can emit two rows for a centered, hyphenated
// heading. Merge only adjacent lines with their own matching text anchors.
export function mergeWrappedCampaignHeadings(rows) {
 const consumed=new Set();
 const result=rows.map(row=>{
  const anchor=row.debugCardAnchor;
  if(row.spatialResolved || row.percentageOffer?.source!=='aligned-printed-standalone-percentage' ||
     anchor?.text!==row.title || !/\p{L}{3,}-$/u.test(row.title))return row;
  const center=(anchor.left+anchor.right)/2;
  const continuations=rows.filter(other=>{
   const next=other.debugCardAnchor;
   return !consumed.has(other) && other.page===row.page && !other.spatialResolved &&
    other.percentageOffer?.source==='wrapped-column-printed-percentage' &&
    other.percentageOffer.percent===row.percentageOffer.percent && next?.text===other.title &&
    /^\p{Lu}{3,}(?:\s|$)/u.test(other.title) &&
    Math.abs((next.left+next.right)/2-center)<.012 &&
    Math.abs(next.height-anchor.height)<.002 &&
    next.top-anchor.top>.008 && next.top-anchor.top<.02;
  });
  if(continuations.length!==1)return row;
  const [next]=continuations;
  consumed.add(next);
  const line=next.debugCardAnchor;
  const note=(next.debugNearbyBoxes||[]).filter(box=>box.top-line.top>.008 &&
    box.top-line.top<.019 && box.left>=line.left && box.left+box.width<=line.right);
  const fullWords=note.filter(box=>!note.some(other=>other!==box && other.width>box.width &&
   other.left<=box.left && other.left+other.width>=box.left+box.width));
  const noteText=[...new Set(fullWords.sort((a,b)=>a.left-b.left).map(box=>box.text))].join(' ');
  const exclusion=/^Ei [\p{L}-]+\.?$/u.test(noteText)?' ('+noteText.replace(/\.$/,'').toLowerCase()+')':'';
  return {...row,title:row.title.slice(0,-1)+next.title+exclusion};
 });
 return result.filter((_,index)=>!consumed.has(rows[index]));
}

// Attach an unpriced heading line only when the following package has an
// independently resolved price and the publisher prints its own sale unit.
export function mergePackagedHeadingLines(rows, pageBoxes) {
 const consumed=new Set();
 const result=rows.map(row=>{
  const anchor=row.debugCardAnchor;
  const price=row.spatialResolved;
  if(!row.package || anchor?.text!==row.title ||
     price?.source!=='mixed-size-endpoint-equivalence-proof')return row;
  const leads=rows.filter(other=>{
   const lead=other.debugCardAnchor;
   return other.page===row.page && !other.package && !other.percentageOffer &&
    !other.spatialResolved?.unit && !consumed.has(other) &&
    lead?.text===other.title && /^[\p{Lu} -]+$/u.test(other.title) &&
    Math.abs(lead.left-anchor.left)<.003 && Math.abs(lead.height-anchor.height)<.002 &&
    anchor.top-lead.top>.008 && anchor.top-lead.top<.017 && lead.right<anchor.right;
  });
  if(leads.length!==1)return row;
  const [lead]=leads;
  const boxes=pageBoxes.get(row.page)||[];
  const centsText=price.value.toFixed(2).split('.')[1];
  const units=new Set(boxes.flatMap(cents=>{
   if(cents.text!==centsText || cents.height<.045 || cents.left<=anchor.left ||
      cents.left>=anchor.right || cents.top<=anchor.top || cents.top-anchor.top>.026)return [];
   return boxes.filter(box=>/^(KPL|PKT|PS|RS|PRK|PL|TLK)$/.test(box.text) &&
    box.left>=cents.left && box.left<=cents.left+cents.width &&
    Math.abs(box.top-cents.top-cents.height)<.009).map(box=>box.text);
  }));
  if(units.size!==1)return row;
  const top=lead.debugCardAnchor.top;
  const brand=boxes.filter(box=>top-box.top>.006 && top-box.top<.012 &&
   box.left>=anchor.left-.002 && box.left+box.width<=lead.debugCardAnchor.right &&
   /^\p{Lu}\p{Ll}{2,}$/u.test(box.text)).sort((a,b)=>a.left-b.left);
  const label=brand.length && Math.abs(brand[0].left-anchor.left)<.003
   ? [...new Set(brand.map(box=>box.text))] : [];
  consumed.add(lead);
  return {...row,title:[...label,lead.title,row.title].join(' '),
   spatialResolved:{...price,unit:[...units][0]}};
 });
 return result.filter((_,index)=>!consumed.has(rows[index]));
}
