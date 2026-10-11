// Repair a conflicting neighbouring price only with BOTH arithmetic and
// publisher typography evidence. A package multiplier is never an offer count.
export function verifiedOwnedUnitRate(row) {
  const anchor=row.debugAnchor;
  if(!anchor)return null;
  const titleLeft=anchor.boxes?.length?Math.min(...anchor.boxes.map(b=>b.left)):anchor.left;
  const raw=row.debugNearbyBoxes||[];
  const boxes=raw.filter(b=>!raw.some(c=>c!==b&&c.width>b.width+.001&&
    Math.abs(c.top-b.top)<.001&&Math.abs(c.height-b.height)<.002&&
    c.left<=b.left+.001&&c.left+c.width>=b.left+b.width-.001));
  const proofs=[];
  for(const start of boxes.filter(b=>/^\(\d/.test(b.text)&&Math.abs(b.left-titleLeft)<.035&&
    b.top>=anchor.top-.002&&b.top-anchor.top<.045&&b.height<.02)) {
    if(boxes.some(b=>b.text==='Ilman'&&Math.abs(b.left-start.left)<.015&&
      b.top>anchor.top&&b.top<start.top))continue;
    const line=boxes.filter(b=>Math.abs(b.top-start.top)<.001&&b.left>=start.left&&b.left<start.left+.2)
      .sort((a,b)=>a.left-b.left);
    const parts=[];let right=start.left;
    for(const b of line){if(b.left-right>.012)break;parts.push(b.text);right=b.left+b.width;if(/\/(kg|l)\)/i.test(b.text))break;}
    const text=parts.join(' ').replace(/(\d+)\s+(\d{2})(?=[–-]|\/(?:kg|l))/gi,'$1,$2');
    const m=text.match(/^\((\d+[,.]\d{2})(?:[–-](\d+[,.]\d{2}))?\/(kg|l)\)$/i);
    if(m)proofs.push({min:Number(m[1].replace(',','.')),max:Number((m[2]||m[1]).replace(',','.')),raw:text});
  }
  const unique=[...new Map(proofs.map(p=>[p.raw,p])).values()];
  return unique.length===1?unique[0]:null;
}

export function verifiedCompoundOfferCount(row) {
  const rate=verifiedOwnedUnitRate(row),pk=row.package,anchor=row.debugAnchor,current=row.spatialResolved;
  if(!rate||!pk||!anchor||!current)return null;
  const boxes=row.debugNearbyBoxes||[],proofs=[];
  for(const badge of boxes){
    const m=badge.text.match(/^(\d{1,2})(KPL|PS|RS)[-–]\d{1,2}(?:[-–]\d{1,2})?%$/);
    if(!m)continue;
    const quantity=Number(m[1]);if(quantity<2||quantity>24)continue;
    for(const euro of boxes.filter(b=>/^\d{1,2}$/.test(b.text)&&b.height>=.045&&
      Number(b.text)===Number(current.value)&&Math.abs(b.left-badge.left)<.035&&
      badge.top<b.top&&b.top-badge.top<.035&&b.left>=anchor.left-.03&&b.left-anchor.left<.28&&
      Math.abs(b.top-anchor.top)<.08)) {
      const single=Number(euro.text)/quantity;
      if(single<pk.min*rate.min-.03||single>pk.max*rate.max+.03)continue;
      proofs.push({value:Number(euro.text),quantity,unit:m[2],source:'printed-compound-count-and-total-glyph',sanity:'pass',confidence:'high'});
    }
  }
  const unique=[...new Map(proofs.map(p=>[p.value+':'+p.quantity+':'+p.unit,p])).values()];
  return unique.length===1?unique[0]:null;
}

export function verifiedDecimalBundle(row) {
  const rate=verifiedOwnedUnitRate(row),pk=row.package,anchor=row.debugAnchor;
  if(!rate||!pk||!anchor)return null;
  const a=pk.min*rate.max,b=pk.max*rate.min;
  if(Math.abs(a-b)>.04)return null;
  const single=(a+b)/2,boxes=row.debugNearbyBoxes||[],proofs=[];
  for(const glyph of boxes){
    const m=glyph.text.match(/^(\d)([2-9])(KPL|PS|RS)$/);
    if(!m||glyph.height<.045||glyph.width/glyph.height>.8||
      glyph.left<anchor.left-.03||glyph.left-anchor.left>.25||Math.abs(glyph.top-anchor.top)>.08)continue;
    for(const cents of boxes.filter(b=>/^\d{2}$/.test(b.text)&&b.height>=.02&&b.height<glyph.height*.8&&
      Math.abs(b.left-glyph.left-glyph.height*.43)<.008&&
      b.top>glyph.top&&b.top-glyph.top<.02)) {
      const value=Number(m[1])+Number(cents.text)/100,quantity=Number(m[2]);
      if(Math.abs(value-single*quantity)<.03)proofs.push({value,quantity,unit:m[3],
        source:'printed-decimal-bundle-and-owned-unit-rate',sanity:'pass',confidence:'high'});
    }
  }
  for(const euro of boxes.filter(b=>/^\d{1,2}$/.test(b.text)&&b.height>=.045&&
    b.left>=anchor.left-.03&&b.left-anchor.left<.25&&Math.abs(b.top-anchor.top)<.08)) {
    const merged=euro.text.length===2&&euro.width/euro.height<.4;
    for(const cents of boxes.filter(b=>/^\d{2}$/.test(b.text)&&b.height>=.02&&b.height<euro.height*.8&&
      Math.abs(b.left-euro.left-euro.width)<.008&&Math.abs(b.top-euro.top)<.015)) {
      const value=Number(merged?euro.text[0]:euro.text)+Number(cents.text)/100;
      const counts=merged?[{...euro,text:euro.text[1]}]:boxes.filter(b=>/^[2-9]$/.test(b.text)&&
        b.height>=.01&&b.height<.03&&Math.abs(b.left-euro.left)<.045&&b.top<euro.top&&euro.top-b.top<.03);
      for(const count of counts){
        const quantity=Number(count.text);if(quantity<2||Math.abs(value-single*quantity)>.03)continue;
        const units=boxes.filter(b=>/^(PS|RS|PRK|KPL|PKT)$/.test(b.text)&&
          Math.abs(b.top-count.top)<.003&&b.left>=count.left&&b.left-count.left<.045).map(b=>b.text);
        if(boxes.some(b=>b.text==='R'&&Math.abs(b.top-count.top)<.003&&b.left>=count.left&&b.left-count.left<.04&&
          boxes.some(c=>c.text==='S'&&Math.abs(c.top-b.top)<.001&&Math.abs(c.left-b.left-b.width)<.004)))units.push('RS');
        for(const unit of units)proofs.push({value,quantity,unit,source:'printed-decimal-bundle-and-owned-unit-rate',sanity:'pass',confidence:'high'});
      }
    }
  }
  const unique=[...new Map(proofs.map(p=>[p.value+':'+p.quantity+':'+p.unit,p])).values()];
  if(unique.length!==1)return null;
  const proof=unique[0];
  if(row.spatialResolved?.value===proof.value&&Number(row.spatialResolved.quantity)===proof.quantity)return null;
  return proof;
}

export function verifiedLargeHeadlineBundle(row) {
  const pk=row.package,rate=row.unitPrice,anchor=row.debugAnchor;
  if(!pk||!rate||!anchor)return null;
  const a=pk.min*rate.max,b=pk.max*rate.min;
  if(Math.abs(a-b)>.04)return null;
  const single=(a+b)/2,boxes=row.debugNearbyBoxes||[],proofs=[];
  for(const euro of (row.spatialPriceBoxes||[]).filter(b=>/^\d{1,2}$/.test(b.text)&&b.height>.1&&
    b.left<anchor.left&&anchor.left-b.left<.4&&Math.abs(b.top-anchor.top)<.05)) {
    for(const count of boxes.filter(b=>/^[2-9]$/.test(b.text)&&b.height>euro.height*.15&&b.height<euro.height*.3&&
      b.left>euro.left+euro.width*.3&&b.left<euro.left+euro.width&&
      b.top>euro.top-.005&&b.top<euro.top+euro.height*.15)) {
      const unit=boxes.find(b=>/^(PKT|KPL|PS|RS)$/.test(b.text)&&Math.abs(b.top-count.top)<.002&&
        b.left>count.left&&b.left-count.left<euro.width*.3);
      const whole=boxes.some(b=>b.text==='-'&&b.height>euro.height*.8&&
        Math.abs(b.left-euro.left-euro.width)<.015&&Math.abs(b.top-euro.top)<.015);
      if(unit&&whole&&Math.abs(Number(euro.text)-single*Number(count.text))<.03)
        proofs.push({value:Number(euro.text),quantity:Number(count.text),unit:unit.text,
          source:'printed-large-headline-bundle-and-unit-rate',sanity:'pass',confidence:'high'});
    }
  }
  const unique=[...new Map(proofs.map(p=>[p.value+':'+p.quantity+':'+p.unit,p])).values()];
  return unique.length===1?unique[0]:null;
}

export function verifiedMergedEuroCents(row) {
  const pk=row.package,rate=verifiedOwnedUnitRate(row),anchor=row.debugAnchor;
  if(!pk||!rate||!anchor)return null;
  const a=pk.min*rate.max,b=pk.max*rate.min;
  if(Math.abs(a-b)>.04)return null;
  const expected=(a+b)/2,boxes=row.debugNearbyBoxes||[],proofs=[];
  for(const euro of boxes.filter(b=>/^[-–]\d$/.test(b.text)&&b.height>=.045&&b.width>.15&&
    anchor.left>b.left&&anchor.left<b.left+b.width&&Math.abs(b.top-anchor.top)<.04)) {
    for(const cents of boxes.filter(b=>/^\d{2}$/.test(b.text)&&b.height>=.02&&b.height<euro.height*.8&&
      Math.abs(b.left-euro.left-euro.width)<.008&&Math.abs(b.top-euro.top)<.015)) {
      const value=Number(euro.text.slice(1))+Number(cents.text)/100;
      if(Math.abs(value-expected)<.025&&boxes.some(b=>b.text==='KPL'&&
        Math.abs(b.left-cents.left)<.015&&b.top>cents.top&&b.top-cents.top<.035))
        proofs.push({value,quantity:null,unit:'KPL',source:'printed-merged-euro-cents-and-owned-unit-rate',sanity:'pass',confidence:'high'});
    }
  }
  const unique=[...new Map(proofs.map(p=>[p.value,p])).values()];
  return unique.length===1?unique[0]:null;
}

export function verifiedPrintedBundle(row) {
  // Publisher PDFs sometimes split a package label into separate letters.
  // Join only adjacent letters on the same baseline, preserving ownership.
  const originalBoxes=row.debugNearbyBoxes||[];
  const joined=[];
  for(const a of originalBoxes.filter(b=>/^[A-Z]$/.test(b.text)&&b.height<.03)) {
    let text=a.text,right=a.left+a.width;
    for(let i=0;i<2;i++){
      const b=originalBoxes.find(b=>/^[-–]?[A-Z]$/.test(b.text)&&
        Math.abs(b.top-a.top)<.001&&b.left>=right-.001&&b.left-right<.004);
      if(!b)break;
      text+=b.text.replace(/^[-–]/,'');right=b.left+b.width;
      if(/^(RS|PS|PL|PRK|KPL|TLK|PKT)$/.test(text))joined.push({...a,text,width:right-a.left});
    }
  }
  if(joined.length)row={...row,debugNearbyBoxes:[...originalBoxes,...joined]};
  const pk=row.package,rate=row.unitPrice;
  const endpoints=pk&&rate?[pk.min*rate.max,pk.max*rate.min]:[];
  const single=endpoints.length&&Math.abs(endpoints[0]-endpoints[1])<.04?
    (endpoints[0]+endpoints[1])/2:Number(row.initialExpectedSingle??row.expectedSingle);
  const current=row.spatialResolved;
  const anchor=row.debugAnchor;
  if(!anchor||!Number.isFinite(single)||single<=0)return null;
  const tol=Math.max(.03,single*.005);
  if(Number(current?.quantity)>1&&Math.abs(Number(current.value)-single*Number(current.quantity))<=tol)return null;
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
         euro.left<anchor.left-.03||euro.left>anchor.left+.25||
         (Math.abs(euro.top-anchor.top)>.08&&!(current?.source==='mixed-size-endpoint-equivalence-proof'&&
           euro.top>anchor.top&&euro.top-anchor.top<.12&&Math.abs(euro.left-anchor.left)<.08)))continue;
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
     Number(current.quantity||1)!==1)return null;
  // A printed KG label immediately below the cents proves a weight price.
  // Variable package weight and a neighbouring unit rate cannot override it.
  const weightProofs=[];
  const nearby=row.debugNearbyBoxes||[];
  for(const euro of nearby.filter(b=>/^\d{1,2}$/.test(b.text)&&b.height>=.045&&Number(b.text)===Number(current.value)&&
    b.left>=anchor.left-.03&&b.left<=anchor.left+.25&&Math.abs(b.top-anchor.top)<.04)) {
    for(const cents of nearby.filter(b=>/^\d{2}$/.test(b.text)&&b.height>=.02&&b.height<euro.height*.8&&
      Math.abs(b.left-euro.left-euro.width)<.008&&Math.abs(b.top-euro.top)<.015)) {
      const value=Number(euro.text)+Number(cents.text)/100;
      if(nearby.some(b=>b.text==='KG'&&Math.abs(b.left-cents.left)<.015&&b.top>cents.top&&b.top-cents.top<.035)&&
        row.spatialCandidates?.some(c=>c.kind==='same-row-euro-cents'&&Math.abs(c.value-value)<.001))
        weightProofs.push({value,quantity:null,unit:'KG',source:'printed-euro-cents-and-weight-unit',sanity:'pass',confidence:'high'});
    }
  }
  const weights=[...new Map(weightProofs.map(p=>[p.value,p])).values()];
  if(weights.length)return weights.length===1?weights[0]:null;
  if(!pk||!rate)return null;
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
