// Reconcile only owned printed glyphs. No product names, fixed prices or
// cross-provider substitutions: independent publications remain independent.
export function repairPrintedCard(row) {
 const a=row.debugCardAnchor, current=row.spatialResolved;
 if(!a||!current)return row;
 const boxes=row.debugNearbyBoxes||[], proofs=[];
 const euros=boxes.filter(b=>/^\d{1,2}$/.test(b.text)&&b.height>=.045&&b.height<.07&&
  b.left>a.left+.10&&b.left<a.left+.26&&Math.abs(b.top-a.top)<.045);
 for(const e of euros){
  const cents=boxes.filter(b=>/^\d{2}$/.test(b.text)&&b.height>=.02&&b.height<e.height*.8&&
   Math.abs(b.left-e.left-e.width)<.008&&Math.abs(b.top-e.top)<.015);
  const unit=boxes.find(b=>/^(KPL|PKT|TLK|PS|RS|PRK)$/.test(b.text)&&b.height<.02&&
   b.left>=e.left&&b.left-e.left<.075&&b.top>e.top&&b.top-e.top<.04);
  const pk=row.package,rate=row.unitPrice;
  if(current.source==='same-card-right-whole-euro-badge'&&unit&&pk&&rate&&cents.length===1){
   const value=Number(e.text)+Number(cents[0].text)/100;
   if(Math.abs(pk.min*rate.max-value)<.025&&Math.abs(pk.max*rate.min-value)<.025)
    proofs.push({value,quantity:null,unit:unit.text,source:'owned-card-cents-and-package-rate'});
  }
  // An earlier fallback may have joined a package numeral to a normal price.
  // The card's large price and KPL label must agree with its own normal-price label.
  const ref=row.debugOwnedNormalPrice;
  if(current.source==='best-spatial-candidate'&&unit?.text==='KPL'&&ref?.unit==='KPL'&&
   Math.abs(ref.left-a.left)<.015&&ref.top>a.top&&ref.top-a.top<.08&&
   cents.length===0&&Number(e.text)<ref.min)
   proofs.push({value:Number(e.text),quantity:null,unit:'KPL',source:'owned-card-whole-price-and-reference'});
  if(current.source==='fixed-package-own-unitrate-derived'){
   for(const count of boxes.filter(b=>/^[2-9]$/.test(b.text)&&b.height>=.01&&b.height<.025&&
    Math.abs(b.left-e.left)<.025&&b.top<e.top&&e.top-b.top<.03)){
    const label=boxes.find(b=>b.text===current.unit&&b.height<.025&&
     Math.abs(b.top-count.top)<.001&&b.left>count.left&&b.left-count.left<.025);
    if(label&&cents.length===0&&Math.abs(Number(e.text)-current.value*Number(count.text))<.025)
     proofs.push({value:Number(e.text),quantity:Number(count.text),unit:label.text,source:'owned-card-count-restores-sale-total'});
   }
  }
 }
 const unique=[...new Map(proofs.map(p=>[`${p.value}:${p.quantity}:${p.unit}`,p])).values()];
 let result=row;
 if(unique.length===1){
  const proof=unique[0];
  result={...row,publisherOfferId:row.publisherOfferId||`kcm:spatial:${row.page}:${row.title.replace(/\u00a0/g,' ').replace(/[ \t]+/g,' ').trim().toLowerCase()}:${current.value}`,
   debugReplacedCardTransaction:current,spatialResolved:{...proof,sanity:'pass',confidence:'high'},percentageOffer:null};
 }
 // A hero price may have a separate validity line below the price, outside
 // flattened product text. Require that line to sit under the owned KG badge.
 if(row.debugWeightPrintedTransaction){
  const kg=boxes.find(b=>b.text==='KG'&&b.height>.02);
  const proofs=[];
  for(const start of boxes.filter(b=>b.text==='VOIMASSA'&&kg&&b.top>kg.top&&b.top-kg.top<.08&&Math.abs(b.left-kg.left)<.12)){
   const text=boxes.filter(b=>Math.abs(b.top-start.top)<.001&&b.left>=start.left&&b.left<start.left+.25)
    .sort((a,b)=>a.left-b.left).map(b=>b.text).join(' ');
   const m=text.match(/^VOIMASSA\s+[A-ZÅÄÖ-]+\s+(\d{1,2})\.?\s*[–-](\d{1,2})\.?\s+(\d{1,2})\.?$/);
   if(m&&+m[1]>=1&&+m[2]<=31&&+m[1]<=+m[2]&&+m[3]>=1&&+m[3]<=12)
    proofs.push({from:`${+m[1]}.${+m[3]}.`,to:`${+m[2]}.${+m[3]}.`,evidence:text});
  }
  if(proofs.length===1)result={...result,printedValidity:proofs[0]};
 }
 return result;
}
