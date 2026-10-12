// A flattened reading order may move the package far from its headline.
// Reattach only a unique package printed immediately below the same column.
export function reattachDetachedPackage(lines, boxes) {
  return lines.map(line => {
    const title = line.text.replace(/^[-–]\d+(?:[–-]\d+)?\s*%\s*/, '').trim();
    if (!/^[A-ZÅÄÖ][A-ZÅÄÖ &+-]{5,}$/.test(title)) return line;
    const anchors = boxes.filter(box => box.text === title && box.height >= .014 && box.height < .02);
    if (anchors.length !== 1) return line;
    const anchor = anchors[0];
    const numbers = boxes.filter(box => /^\d+(?:[,.]\d+)?$/.test(box.text) &&
      Math.abs(box.left - anchor.left) < .002 &&
      box.top - anchor.top > .008 && box.top - anchor.top < .016 &&
      Math.abs(box.height - anchor.height) < .001);
    const candidates = numbers.filter(number => boxes.some(rate => /\/(kg|l)\)/.test(rate.text) &&
      rate.left >= anchor.left && rate.left < anchor.left + .10 &&
      rate.top - number.top > .008 && rate.top - number.top < .025))
      .flatMap(number => boxes.filter(unit => /^(g|kg|ml|cl|dl|l)$/.test(unit.text) &&
      Math.abs(unit.top - number.top) < .001 &&
      unit.left - number.left - number.width >= 0 && unit.left - number.left - number.width < .006)
      .map(unit => `${title} ${number.text} ${unit.text}`));
    return candidates.length === 1 ? {...line, text: candidates[0], detachedPackage: true} : line;
  });
}

export function resolveRecoveredPrintedPrice(row, boxes) {
  const anchor = row.debugCardAnchor;
  if (!anchor) return row;
  const proofs = [];
  for (const euro of boxes.filter(box => /^\d{1,2}$/.test(box.text) && box.height >= .045 && box.height < .06 &&
    box.left > anchor.left + .10 && box.left < anchor.left + .26 && Math.abs(box.top - anchor.top) < .035)) {
    const units = boxes.filter(box => /^(PS|PRK|PKT|RS|KPL|TLK|PL)$/.test(box.text) &&
      box.left >= euro.left && box.left < euro.left + .045 &&
      box.top - euro.top > .01 && box.top - euro.top < .035 && box.height < .016);
    if (units.length !== 1) continue;
    // Reject any printed purchase count paired with this label.
    if (boxes.some(box => /^\d+$/.test(box.text) && box.height >= .014 && box.height < .02 &&
      Math.abs(box.top - units[0].top) < .002 && box.left < units[0].left && units[0].left - box.left < .025)) continue;
    const cents = boxes.filter(box => /^\d{2}$/.test(box.text) && box.height >= .02 && box.height < .03 &&
      Math.abs(box.left - euro.left - euro.width) < .006 && box.top - euro.top >= 0 && box.top - euro.top < .012);
    const singleCents=[...new Map(boxes.filter(box=>/^\d$/.test(box.text)&&box.height>=.02&&box.height<.03&&
      box.left>=euro.left+euro.width-.006&&box.left<euro.left+euro.width+.04&&
      box.top-euro.top>=0&&box.top-euro.top<.012).map(box=>[`${box.text}:${box.left}:${box.top}`,box])).values()]
      .sort((a,b)=>a.left-b.left);
    if(singleCents.length===2&&Math.abs(singleCents[0].left-euro.left-euro.width)<.006&&
      Math.abs(singleCents[0].top-singleCents[1].top)<.001&&
      Math.abs(singleCents[1].left-singleCents[0].left-singleCents[0].width)<.003)
      cents.push({...singleCents[0],text:singleCents.map(box=>box.text).join('')});
    const distinct = [...new Set(cents.map(box => box.text))];
    if (distinct.length > 1) continue;
    proofs.push({value: Number(euro.text) + (distinct.length ? Number(distinct[0]) / 100 : 0),
      quantity: null, unit: units[0].text, source: 'recovered-headline-owned-printed-price', sanity: 'pass', confidence: 'high'});
  }
  if (proofs.length !== 1) return row;
  return {...row, spatialResolved: proofs[0], debugRecoveredPrintedPrice: proofs[0], debugReplacedConflictingPrice: row.spatialResolved};
}

export function resolvePrintedCountedTransaction(row,rawBoxes){
 const a=row.debugCardAnchor;if(!a)return null;
 const boxes=[...new Map(rawBoxes.map(b=>[`${b.text}:${b.left}:${b.top}:${b.width}:${b.height}`,b])).values()];
 const euros=boxes.filter(b=>/^\d{1,2}[.,-]?$/.test(b.text)&&b.height>=.045&&b.height<.075&&
  b.left>a.left+.10&&b.left<a.left+.29&&Math.abs(b.top-a.top)<.04);
 const combined=[];
 for(const b of euros){
  const next=euros.filter(c=>c!==b&&/^\d$/.test(c.text)&&/^\d$/.test(b.text)&&Math.abs(c.top-b.top)<.001&&
   Math.abs(c.left-b.left-b.width)<.003);
  if(next.length===1)combined.push({...b,text:b.text+next[0].text,width:next[0].left+next[0].width-b.left});
  else if(!euros.some(c=>c!==b&&/^\d$/.test(c.text)&&/^\d$/.test(b.text)&&Math.abs(c.top-b.top)<.001&&Math.abs(b.left-c.left-c.width)<.003))combined.push(b);
 }
 const proofs=[];
 for(const e of combined){
  const labels=boxes.filter(b=>/^(?:\d{1,2})?(KPL|PKT|PS|RS|PRK|TLK|PL)$/.test(b.text)&&b.height>=.014&&b.height<.02&&
   b.left>=e.left-.02&&b.left<e.left+e.width+.035&&b.top<=e.top&&e.top-b.top<.04);
  for(const u of labels){
   const compact=u.text.match(/^(\d{1,2})(KPL|PKT|PS|RS|PRK|TLK|PL)$/);
   const counts=compact?[{text:compact[1]}]:boxes.filter(b=>/^\d{1,2}$/.test(b.text)&&b.height>=.014&&b.height<.02&&
    Math.abs(b.top-u.top)<.001&&b.left<u.left&&u.left-b.left-b.width>=-.001&&u.left-b.left-b.width<.007);
   if(counts.length!==1||Number(counts[0].text)<2||Number(counts[0].text)>12)continue;
   const cents=boxes.filter(b=>/^\d{2}$/.test(b.text)&&b.height>=.02&&b.height<.035&&
    Math.abs(b.left-e.left-e.width)<.006&&b.top>=e.top&&b.top-e.top<.014);
   const values=[...new Set(cents.map(b=>b.text))];if(values.length>1)continue;
   const value=Number(e.text.replace(/[.,-]/g,''))+(values.length?Number(values[0])/100:0);
   const q=Number(counts[0].text),pk=row.package,rate=row.unitPrice;
   const arithmetic=pk&&rate&&Math.abs(pk.min*rate.max*q-value)<.04&&Math.abs(pk.max*rate.min*q-value)<.04;
   if(!values.length&&!/[.,-]/.test(e.text)&&!arithmetic&&!boxes.some(b=>/^[-–.]$/.test(b.text)&&b.height>=.04&&
    Math.abs(b.left-e.left-e.width)<.03&&Math.abs(b.top-e.top)<.018))continue;
   proofs.push({value,quantity:q,unit:compact?compact[2]:u.text,source:'owned-printed-total-and-count-label',sanity:'pass',confidence:'high'});
  }
 }
 const unique=[...new Map(proofs.map(p=>[`${p.value}:${p.quantity}:${p.unit}`,p])).values()];
 return unique.length===1?unique[0]:null;
}

export function resolveLargePrintedWeightPrice(row,boxes){
 const a=row.debugCardAnchor;if(!a||a.height<.03||row.package)return null;
 const prices=boxes.filter(b=>/^\d{3,4}$/.test(b.text)&&b.height>.09&&b.height<.2&&
  b.left<a.left&&a.left-b.left-b.width>-.01&&a.left-b.left-b.width<.16&&
  Math.abs(b.top+b.height-a.top)<.08);
 const proofs=prices.filter(e=>boxes.filter(u=>u.text==='KG'&&u.height>.02&&u.height<.04&&
  u.left>=e.left&&u.left<e.left+e.width&&u.top>e.top&&u.top<e.top+e.height).length===1)
  .map(e=>({value:Number(e.text)/100,quantity:null,unit:'KG',source:'owned-large-printed-kilogram-price',sanity:'pass',confidence:'high'}));
 return proofs.length===1?proofs[0]:null;
}

