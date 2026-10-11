// Repair a conflicting neighbouring price only with BOTH arithmetic and
// publisher typography evidence. A package multiplier is never an offer count.
export function verifiedPrintedBundle(row) {
  const pk=row.package,rate=row.unitPrice;
  const endpoints=pk&&rate?[pk.min*rate.max,pk.max*rate.min]:[];
  const single=endpoints.length&&Math.abs(endpoints[0]-endpoints[1])<.04?
    (endpoints[0]+endpoints[1])/2:Number(row.initialExpectedSingle??row.expectedSingle);
  const current=row.spatialResolved;
  const anchor=row.debugAnchor;
  if(!anchor||!current||!Number.isFinite(single)||single<=0)return null;
  const tol=Math.max(.03,single*.005);
  if(Number(current.quantity)>1&&Math.abs(Number(current.value)-single*Number(current.quantity))<=tol)return null;
  const boxes=row.debugNearbyBoxes||[];
  const proofs=[];
  const candidates=[...(row.spatialCandidates||[])];
  // Read the printed count immediately above a large whole-euro total.
  // This also restores a lost offer condition when the earlier price was
  // the mathematically correct per-item price rather than the sale total.
  for(const euro of boxes.filter(b=>/^\d{1,2}$/.test(b.text)&&b.height>=.045)) {
    for(const count of boxes.filter(b=>/^\d{1,2}$/.test(b.text)&&b.height>=.01&&b.height<.03&&
      Math.abs(b.left-euro.left)<.045&&b.top<euro.top&&euro.top-b.top<.03)) {
      const unit=boxes.find(b=>/^(KPL|PKT|PS|RS|TLK|PL|PRK)$/.test(b.text)&&
        Math.abs(b.top-count.top)<.003&&b.left>=count.left&&b.left-count.left<.04);
      if(unit)candidates.push({value:Number(euro.text),quantity:Number(count.text),unit:unit.text});
    }
  }
  for(const c of candidates) {
    const quantity=Number(c.quantity),value=Number(c.value);
    if(!Number.isInteger(quantity)||quantity<2||quantity>24||
       Math.abs(value-single*quantity)>tol||! /^(KPL|PKT|PS|RS|TLK|PL|PRK)$/i.test(c.unit||''))continue;
    for(const euro of boxes) {
      if(euro.height<.045||!/^\d{1,2}$/.test(euro.text)||Number(euro.text)!==value||
         euro.left<anchor.left-.03||euro.left>anchor.left+.25||Math.abs(euro.top-anchor.top)>.08)continue;
      const count=boxes.find(b=>b.text===String(quantity)&&b.height>=.01&&b.height<.03&&
        Math.abs(b.left-euro.left)<.045&&b.top<euro.top&&euro.top-b.top<.03&&
        boxes.some(u=>u.text.toUpperCase()===String(c.unit).toUpperCase()&&
          Math.abs(u.top-b.top)<.003&&u.left>=b.left&&u.left-b.left<.04));
      const unit=count&&boxes.find(b=>b.text.toUpperCase()===String(c.unit).toUpperCase()&&
        Math.abs(b.top-count.top)<.003&&b.left>=count.left&&b.left-count.left<.04);
      const whole=boxes.some(b=>/^[-–.]$/.test(b.text)&&b.height>=.035&&
        b.left>=euro.left+euro.width-.005&&b.left-euro.left-euro.width<.035&&Math.abs(b.top-euro.top)<.015);
      const cents=boxes.some(b=>/^\d{2}$/.test(b.text)&&b.height>=.02&&b.height<euro.height*.8&&
        Math.abs(b.left-euro.left-euro.width)<.008&&Math.abs(b.top-euro.top)<.015);
      if(count&&unit&&(whole||!cents))proofs.push({value,quantity,unit:c.unit,
        source:'printed-bundle-glyph-and-owned-unit-rate',sanity:'pass',confidence:'high'});
    }
  }
  const unique=[...new Map(proofs.map(p=>[p.value+':'+p.quantity+':'+p.unit,p])).values()];
  return unique.length===1?unique[0]:null;
}

export function verifiedMissingCents(row) {
  const current=row.spatialResolved,anchor=row.debugAnchor;
  const pk=row.package,rate=row.unitPrice;
  if(!anchor||current?.source!=='same-card-right-whole-euro-badge'||
     Number(current.quantity||1)!==1||!pk||!rate)return null;
  const a=pk.min*rate.max,b=pk.max*rate.min;
  if(Math.abs(a-b)>.04)return null;
  const expected=(a+b)/2;
  const boxes=row.debugNearbyBoxes||[];
  const proofs=[];
  for(const euro of boxes) {
    if(!/^\d{1,2}$/.test(euro.text)||euro.height<.045||Number(euro.text)!==Number(current.value)||
       euro.left<anchor.left-.03||euro.left>anchor.left+.25||Math.abs(euro.top-anchor.top)>.04)continue;
    for(const cents of boxes) {
      if(!/^\d{2}$/.test(cents.text)||cents.height<.02||cents.height>=euro.height*.8||
         Math.abs(cents.top-euro.top)>.015||Math.abs(cents.left-euro.left-euro.width)>.008)continue;
      const value=Number(euro.text)+Number(cents.text)/100;
      if(Math.abs(value-expected)>.02||!row.spatialCandidates?.some(c=>c.kind==='same-row-euro-cents'&&Math.abs(c.value-value)<.001))continue;
      proofs.push({value,quantity:null,unit:current.unit||null,
        source:'printed-euro-cents-and-owned-unit-rate',sanity:'pass',confidence:'high'});
    }
  }
  const unique=[...new Map(proofs.map(p=>[p.value,p])).values()];
  return unique.length===1?unique[0]:null;
}

export function verifiedDepositPack(row) {
  const pk=row.package,rate=row.unitPrice,anchor=row.debugAnchor;
  if(!pk||!rate||!anchor||pk.min!==pk.max||!row.spatialResolved)return null;
  const count=Number(String(row.title).match(/\b(\d{1,2})-pack\b/i)?.[1]||1);
  const deposits=[...new Set((row.nearby||[]).flatMap(t=>
    [...t.matchAll(/Sis\.?\s*pant(?:it|in)\s+(\d+)[, .](\d{2})/gi)].map(m=>Number(m[1]+'.'+m[2]))))];
  if(deposits.length!==1)return null;
  const single=Number(row.initialExpectedSingle??row.expectedSingle);
  if(!(single>0))return null;
  const expected=single*count+deposits[0];
  const tol=Math.max(.025,pk.max*count*.005+.015);
  const boxes=row.debugNearbyBoxes||[],proofs=[];
  for(const euro of boxes.filter(b=>b.height>=.045&&/^\d{1,4}$/.test(b.text))) {
    if(Math.abs(euro.top-anchor.top)>.08||Math.abs(euro.left-anchor.left)>.25)continue;
    const values=[];
    if(euro.text.length>=3)values.push(Number(euro.text)/100);
    else for(const cents of boxes.filter(b=>/^\d{2}$/.test(b.text)&&b.height>=.02&&b.height<euro.height*.8&&
      Math.abs(b.left-euro.left-euro.width)<.008&&Math.abs(b.top-euro.top)<.015))
      values.push(Number(euro.text)+Number(cents.text)/100);
    const packProof=count===1||boxes.some(b=>new RegExp('^'+count+'-PACK$','i').test(b.text)&&
      Math.abs(b.left-euro.left)<.08&&b.top<euro.top&&euro.top-b.top<.035);
    for(const value of values)if(packProof&&Math.abs(value-expected)<=tol)
      proofs.push({value,quantity:null,unit:count>1?'PKT':row.spatialResolved.unit,
        source:'printed-sale-price-with-package-and-deposit-proof',sanity:'pass',confidence:'high',
        packageCount:count,depositTotal:deposits[0]});
  }
  const unique=[...new Map(proofs.map(p=>[p.value,p])).values()];
  return unique.length===1?unique[0]:null;
}
