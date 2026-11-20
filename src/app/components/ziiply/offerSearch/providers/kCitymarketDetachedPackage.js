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
 // The large count and euros can share a single text box. Its left edge
 // owns the sale unit, and its right edge must meet the separate cents.
 if(!row.spatialResolved && row.package?.min<row.package?.max){
  for(const merged of boxes.filter(b=>/^[2-9][1-9]\d$/.test(b.text)&&b.height>=.09&&
   Math.abs(b.left-a.left)<.008&&b.top-a.top>.06&&b.top-a.top<.12)){
   const units=boxes.filter(b=>/^(KPL|PKT|PS|RS|PRK|TLK|PL)$/.test(b.text)&&b.height<.017&&
    Math.abs(b.left-merged.left)<.006&&b.top-merged.top>.018&&b.top-merged.top<.045);
   const cents=boxes.filter(b=>/^\d{2}$/.test(b.text)&&b.height>=.04&&b.height<merged.height*.65&&
    Math.abs(b.left-merged.left-merged.width)<.006&&b.top-merged.top>.012&&b.top-merged.top<.035);
   if(units.length!==1||cents.length!==1)continue;
   proofs.push({value:Number(merged.text.slice(1)+'.'+cents[0].text),
    quantity:Number(merged.text[0]),unit:units[0].text,
    source:'owned-printed-fused-count-and-price',sanity:'pass',confidence:'high'});
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


// Inner sachet weight is not the weight of the packet sold at the printed price.
export function resolvePrintedSachetPacket(row, boxes) {
 if(row.spatialResolved)return null;
 const m=String(row.title||'').match(/\b(\d{1,3})(?:[–-](\d{1,3}))?\s*ps\/(\d+(?:[,.]\d+)?)(?:[–-](\d+(?:[,.]\d+)?))?\s*g\b/i);
 const a=row.debugCardAnchor,rate=row.unitPrice;
 if(!m||!a||!rate||rate.min<=0||rate.max<=0)return null;
 const countMin=Number(m[1]),countMax=Number(m[2]||m[1]);
 const massMin=Number(m[3].replace(',','.'))/1000,massMax=Number((m[4]||m[3]).replace(',','.'))/1000;
 if(countMin<2||countMax<countMin||massMin<=0||massMax<massMin)return null;
 const proofs=[];
 for(const glyph of boxes.filter(b=>/^\d{3,4}$/.test(b.text)&&b.height>=.045&&b.height<.06&&
  b.left>a.left+.10&&b.left<a.left+.26&&Math.abs(b.top-a.top)<.035)){
  const units=boxes.filter(b=>b.text==='PKT'&&b.height<.016&&b.left>=glyph.left&&b.left<glyph.left+glyph.width&&b.top-glyph.top>.01&&b.top-glyph.top<.035);
  if(units.length!==1)continue;
  const value=Number(glyph.text)/100;
  const impliedMin=value/rate.max,impliedMax=value/rate.min;
  if(impliedMin<countMin*massMin-.0001||impliedMax>countMax*massMax+.0001)continue;
  proofs.push({value,quantity:null,unit:'PKT',source:'owned-printed-sachet-packet-price',sanity:'pass',confidence:'high'});
 }
 const unique=[...new Map(proofs.map(p=>[p.value,p])).values()];
 return unique.length===1?{price:unique[0],package:{min:countMin*massMin,max:countMax*massMax,raw:m[0],innerCountMin:countMin,innerCountMax:countMax}}:null;
}

export function resolvePrintedSingleWithReference(row, boxes, reference) {
 if(row.spatialResolved||!reference||/\bps\//i.test(String(row.title||'')))return null;
 const a=row.debugCardAnchor;
 const recovered=resolveRecoveredPrintedPrice(row,boxes).debugRecoveredPrintedPrice;
 if(!a||!recovered||recovered.unit!==reference.unit||recovered.value>=reference.min)return null;
 // Whole-euro prices need their own printed dash; absence of cents alone is insufficient.
 const euros=boxes.filter(b=>String(b.text)===String(recovered.value)&&b.height>=.045&&b.height<.06&&
  b.left>a.left+.10&&b.left<a.left+.26&&Math.abs(b.top-a.top)<.035);
 if(Number.isInteger(recovered.value)&&!euros.some(e=>boxes.some(b=>/^[-–]$/.test(b.text)&&b.height>=.04&&
  Math.abs(b.left-e.left-e.width)<.006&&Math.abs(b.top-e.top)<.004)))return null;
 return {...recovered,source:'owned-printed-single-with-reference-label'};
}

// A dated weight offer can identify its own card even when the flattened
// title is absent or contains text from a neighbouring offer.
export function recoverDatedWeightCards(rows, rawBoxes, page) {
 const boxes=[...new Map(rawBoxes.map(b=>[JSON.stringify(b),b])).values()];
 let result=rows;
 for(const date of boxes.filter(b=>b.text==='Voimassa'&&b.height<.014)){
  const heading=boxes.filter(b=>Math.abs(b.left-date.left)<.002&&
   date.top-b.top>.007&&date.top-b.top<.024&&b.height>.012&&b.height<.016&&/^\p{Lu}{4,}$/u.test(b.text))
   .sort((a,b)=>b.top-a.top)[0];
  if(!heading)continue;
  const line=boxes.filter(b=>Math.abs(b.top-heading.top)<.001&&b.left>=heading.left-.001&&
   b.left<heading.left+.16&&Math.abs(b.height-heading.height)<.001).sort((a,b)=>a.left-b.left);
  const headingText=line.map(b=>b.text).join(' ').replace(/\bn (?=\d)/g,'n. ');
  const leading=headingText.match(/^[\p{Lu} ]+/u)?.[0].trim();
  const label=boxes.find(b=>Math.abs(b.left-heading.left)<.002&&/^\p{Lu}\p{Ll}{3,}$/u.test(b.text)&&
   (heading.top-b.top>.006&&heading.top-b.top<.012||b.top>heading.top&&b.top<date.top));
  const title=label?(label.top<heading.top?label.text+' '+headingText:headingText+' '+label.text):headingText;
  const unit=boxes.filter(b=>b.text==='KG'&&b.left>date.left+.12&&b.left<date.left+.28&&
   date.top-b.top>.005&&date.top-b.top<.018);
  if(unit.length!==1)continue;
  const kg=unit[0];
  const values=[];
  for(const euro of boxes.filter(b=>/^\d{1,3}$/.test(b.text)&&b.height>.09&&
   kg.top-b.top>.06&&kg.top-b.top<.09&&kg.left-b.left>.04&&kg.left-b.left<.1)){
   if(euro.text.length===3&&kg.left<euro.left+euro.width)values.push(Number(euro.text)/100);
   if(euro.text.length===1)for(const cents of boxes.filter(b=>/^\d{2}$/.test(b.text)&&b.height>.04&&
    Math.abs(b.left-euro.left-euro.width)<.006&&Math.abs(b.top-euro.top-.017)<.004&&
    kg.left>=b.left&&kg.left<=b.left+b.width))values.push(Number(euro.text+'.'+cents.text));
  }
  const unique=[...new Set(values)];
  if(unique.length!==1)continue;
  const related=result.filter(row=>row.page===page&&leading&&row.title.includes(leading));
  if(related.length>1||related.some(row=>row.spatialResolved))continue;
  const relative=(top,regex)=>boxes.find(b=>Math.abs(b.top-top)<.001&&b.left>=date.left&&
   b.left<date.left+.14&&regex.test(b.text));
  const day=relative(date.top,/^\d{2}$/);
  const end=relative(date.top,/^[–-]\d{2}$/);
  const month=end&&boxes.find(b=>Math.abs(b.top-date.top)<.001&&b.left>end.left&&
   b.left-end.left-end.width<.009&&/^(0[1-9]|1[0-2])$/.test(b.text));
  if(!day||!end||!month)continue;
  result=[...result.filter(row=>!related.includes(row)),{
   page,title,imageAnchor:heading,
   printedValidity:{from:day.text+'.'+month.text+'.',to:end.text.slice(1)+'.'+month.text+'.'},
   spatialResolved:{value:unique[0],quantity:null,unit:'KG',source:'owned-dated-weight-card',sanity:'pass',confidence:'high'},
  }];
 }
 return result;
}

// Confirm a whole-euro pack deal against its printed pack count, volume,
// comparison rate and deposit. Each glyph must sit beside the title column.
export function recoverCountedPackPrice(row, boxes) {
 const anchor=row.debugCardAnchor;
 const label=row.title.match(/^(.*?\b(\d{1,2})-pack)\s+\((\d+[,.]\d+)\/l\)\s+Sis\.? pantit\s+(\d+[,.]\d+)/i);
 if(row.spatialResolved||!anchor||!label||!row.package?.min||row.package.min!==row.package.max)return row;
 const [,title,size,rate,deposit]=label;
 const number=text=>Number(text.replace(',','.'));
 const totalDeposit=number(deposit);
 const proofs=new Map();
 for(const euro of boxes.filter(b=>/^\d{1,2}$/.test(b.text)&&b.height>=.09&&
  Math.abs(b.left-anchor.left)<.004&&b.top>anchor.top&&b.top-anchor.top<.05)){
  for(const pack of boxes.filter(b=>/^[2-9][x×]\d{1,2}$/i.test(b.text)&&b.height>.017&&
   b.left-euro.left>.06&&b.left-euro.left<.12&&b.top-euro.top>.04&&b.top-euro.top<.08)){
   const [quantity,count]=pack.text.split(/[x×]/i).map(Number);
   if(count!==Number(size)||Math.abs(quantity*count*row.package.min*number(rate)+totalDeposit-Number(euro.text))>.04||
    !boxes.some(b=>/^[-–]PACK$/i.test(b.text)&&Math.abs(b.left-pack.left)<.012&&b.top>pack.top&&b.top-pack.top<.028))continue;
   proofs.set([euro.left,euro.top,euro.text,pack.text].join(':'),{
    value:Number(euro.text),quantity,unit:size+'-PACK',depositTotal:totalDeposit,
    source:'owned-printed-pack-count-and-rate',sanity:'pass',confidence:'high',
   });
  }
 }
 return proofs.size===1?{...row,title:title.replace(/(\p{Lu})-(?=\p{Lu}{3,}\b)/gu,'$1'),
  spatialResolved:proofs.values().next().value}:row;
}

// A flattened line may concatenate several drinks and their comparison
// rates. Recover each card only when its own printed count and price agree.
export function recoverJoinedDrinkOffers(rows, rawBoxes, page) {
 const boxes=[...new Map(rawBoxes.map(box=>[JSON.stringify(box),box])).values()];
 const recovered=[];
 for(const euro of boxes.filter(box=>/^\d{1,2}$/.test(box.text)&&box.height>=.09)){
  const x=euro.left,y=euro.top;
  const lineAt=(top,tolerance=.001)=>boxes.filter(b=>Math.abs(b.top-top)<tolerance&&
   b.left>=x-.002&&b.left<x+.17&&b.height<.018).sort((a,b)=>a.left-b.left);
  const volume=lineAt(y+.006).find(b=>b.text==='l/tlk');
  if(!volume)continue;
  const rawVolume=lineAt(volume.top).find(b=>/^\d{2}$/.test(b.text)&&
   volume.left-b.left-b.width>=-.001&&volume.left-b.left-b.width<.005);
  const rateStart=lineAt(y+.019).find(b=>/^\(\d{1,2}$/.test(b.text)&&Math.abs(b.left-x)<.002);
  if(!rawVolume||!rateStart)continue;
  const rateLine=lineAt(rateStart.top);
  const centsRate=rateLine.find(b=>/^\d{2}\/l\)$/.test(b.text)&&b.left>rateStart.left&&b.left-rateStart.left<.023);
  const depositLabel=rateLine.find(b=>b.text==='pantit');
  const deposit=depositLabel&&rateLine.find(b=>/^\d{2}$/.test(b.text)&&b.left>depositLabel.left+depositLabel.width&&b.left-depositLabel.left<.05);
  if(!centsRate||!deposit)continue;
  const rate=rateStart.text.slice(1)+','+centsRate.text.slice(0,2);
  const litres=Number(rawVolume.text)/100;
  const depositTotal=Number(deposit.text)/100;
  const badge=boxes.filter(b=>b.left>x+.045&&b.left<x+.09&&
   (/^\d{2}$/.test(b.text)&&b.height>.045&&b.height<.085&&Math.abs(b.top-y-.017)<.005||
    /^[-–.]$/.test(b.text)&&b.height>.09&&Math.abs(b.top-y)<.005));
  const values=[...new Set(badge.map(b=>Number(euro.text)+(/^\d{2}$/.test(b.text)?Number(b.text)/100:0)))];
  if(values.length!==1)continue;
  const [value]=values;
  const countLabels=boxes.filter(b=>b.text==='TLK'&&b.left>x-.04&&b.left<x+.135&&b.top-y>.05&&b.top-y<.09);
  const counts=[...new Set(countLabels.flatMap(unit=>boxes.filter(b=>/^[2-9]$/.test(b.text)&&b.height>.02&&b.height<.04&&
   Math.abs(b.left-unit.left)<.004&&unit.top-b.top>.015&&unit.top-b.top<.027).map(b=>Number(b.text))))];
  if(counts.length!==1||Math.abs(counts[0]*litres*Number(rate.replace(',','.'))+depositTotal-value)>.025)continue;
  const brand=lineAt(y-.015).find(b=>Math.abs(b.left-x)<.002&&/^\p{Lu}\p{Ll}{2,}$/u.test(b.text));
  const heading=lineAt(y-.006).filter(b=>/^\p{Lu}{3,}$/u.test(b.text));
  if(!brand||heading.length<2)continue;
  const detail=lineAt(volume.top,.003);
  const percentLabel=detail.find(b=>b.text==='%'&&b.left<rawVolume.left);
  if(!percentLabel)continue;
  const body=detail.filter(b=>b.left<percentLabel.left&&/^\p{Lu}{3,}$/u.test(b.text)).map(b=>b.text);
  const percent=detail.filter(b=>b.text==='0'&&b.left<percentLabel.left&&percentLabel.left-b.left<.035).length>1?'0,0':'0';
  recovered.push({page,rate,title:[brand.text,...heading.map(b=>b.text),...body,percent,'%','0,'+rawVolume.text,'l/tlk'].join(' '),
   imageAnchor:{left:brand.left,top:brand.top,width:brand.width,height:brand.height},
   spatialResolved:{value,quantity:counts[0],unit:'TLK',depositTotal,source:'owned-printed-can-count-and-rate',sanity:'pass',confidence:'high'}});
 }
 return rows.flatMap(row=>{
  if(row.page!==page)return [row];
  const matches=recovered.filter(card=>row.title.includes('('+card.rate+'/l)'));
  return matches.length===2?matches.map(({rate,...card})=>card):[row];
 });
}
