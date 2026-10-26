// Reconcile a transaction only with printed glyphs plus independent arithmetic.
// Package/unit-rate calculations alone never become the displayed sale price.
const unique=xs=>[...new Map(xs.map(x=>[JSON.stringify(x),x])).values()];
export function verifyPrintedTransaction(row,rawBoxes){
 const anchor=row.debugCardAnchor||row.debugAnchor;
 if(!anchor)return row;
 const boxes=unique(rawBoxes||row.debugNearbyBoxes||[]);
 const current=row.spatialResolved,card=row.debugCardPrice;
 let proof=null,rate=null;
 // A compact same-column euro/cents pair must retain its cents when an
 // earlier fallback has kept only the whole euro glyph.
 if(card?.parts?.length===2&&card.anchor?.height>=.045&&card.anchor.height<.075&&
   Math.abs(card.anchor.left-anchor.left)<.015&&card.anchor.top>=anchor.top&&card.anchor.top-anchor.top<.075&&
   current?.source==='best-spatial-candidate'&&Number.isInteger(current.value)&&
   Math.floor(card.value)===current.value&&/^\d{2}$/.test(card.parts[1].text)){
  proof={value:card.value,quantity:card.quantity||null,unit:card.unit||null};
 }
 // A weight-priced produce card needs no consumer-package arithmetic:
 // its own explicit KG label and printed compact amount are the price basis.
 if(!current&&card?.unit==='KG'&&card.parts?.length===1&&/^\d{3,4}$/.test(card.parts[0].text)&&
   card.anchor.left>anchor.left&&card.anchor.left-anchor.left<.16&&
   card.anchor.top<anchor.top&&anchor.top-card.anchor.top<.075&&
   boxes.some(b=>b.text==='KG'&&b.left>=card.anchor.left&&b.left<card.anchor.left+card.anchor.width&&
     b.top>card.anchor.top&&b.top<card.anchor.top+card.anchor.height))
  proof={value:card.value,quantity:null,unit:'KG'};
 // A large side-by-side headline with a printed count and dash is an
 // explicit transaction even without a parsed package (e.g. fresh produce).
 if(!row.package&&card?.quantity>1&&card.anchor.height>=.15&&
   card.anchor.left>anchor.left&&card.anchor.left-anchor.left<.18&&
   Math.abs(card.anchor.top-anchor.top)<.015&&
   boxes.some(b=>/^[-–.]$/.test(b.text)&&b.height>=card.anchor.height*.8&&
    Math.abs(b.left-card.anchor.left-card.anchor.width)<.025&&Math.abs(b.top-card.anchor.top)<.02))
  proof={value:card.value,quantity:card.quantity,unit:card.unit};
 const pk=row.package;
 const rates=unique((row.nearby||[]).filter(t=>!/Ilman|aktivointia|pantin/i.test(t))
  .flatMap(t=>[...t.matchAll(/\((\d+[,.]\d{2})(?:[–-](\d+[,.]\d{2}))?\/(kg|l)\)/gi)])
  .map(m=>({min:Number(m[1].replace(',','.')),max:Number((m[2]||m[1]).replace(',','.')),unit:m[3].toLowerCase()})));
 const candidates=[];
 if(card)candidates.push({...card,quantity:card.quantity||1});
 // Multi-column PDF runs concatenate different euro digits (e.g. 24 or 35).
 // Their ordered, separate cents fragments establish which digit belongs to
 // the same-card candidate. A package/rate check is still required below.
 for(const run of boxes.filter(b=>/^\d{2,4}$/.test(b.text)&&b.width>.15&&b.height>=.09)){
  const suffixes=boxes.filter(c=>/^\d{2}$/.test(c.text)&&c.height>=.025&&c.height<run.height*.8&&
    c.top>=run.top&&c.top<run.top+.035&&c.left>=run.left&&c.left<run.left+run.width+.02).sort((a,b)=>a.left-b.left);
  if(suffixes.length!==run.text.length)continue;
  for(let i=0;i<suffixes.length;i++){
   const c=suffixes[i],e={...run,text:run.text[i],left:c.left-run.height*.46,width:run.height*.46};
   if(card?.parts?.some(part=>Math.abs(part.left-c.left)<.003&&part.text===c.text))
    candidates.push({value:Number(e.text)+Number(c.text)/100,quantity:1,unit:card.unit,anchor:e});
  }
 }
 // Combined quantity/unit boxes ("2PL") are independent printed purchase
 // conditions, even when the PDF merges the title with a large price glyph.
 for(const e of boxes.filter(b=>/^\d{1,2}$/.test(b.text)&&b.height>=.09&&
   Math.abs(b.left-anchor.left)<.15&&Math.abs(b.top-anchor.top)<.12)){
  for(const label of boxes.filter(b=>/^[2-9](RS|PKT|KPL|TLK|PL|PRK|PS)$/.test(b.text)&&
    b.height>=.025&&b.height<.04&&b.left>e.left+e.width&&b.left<e.left+e.width+.10&&
    b.top>e.top+.02&&b.top<e.top+.085)){
   candidates.push({value:Number(e.text),quantity:Number(label.text[0]),unit:label.text.slice(1),anchor:e});
  }
 }
 if(pk){
  const found=[];
  for(const c of candidates){
   if(!c.anchor||Math.abs(c.anchor.left-anchor.left)>.22||Math.abs(c.anchor.top-anchor.top)>.13)continue;
   for(const r of rates){
    // A broad nearby-text rate cannot override an already consistent single
    // transaction. It may belong to another card in the same PDF reading band.
    if((c.quantity||1)===1&&current&&pk&&row.unitPrice&&
      Math.abs(pk.min*row.unitPrice.max-current.value)<.04&&
      Math.abs(pk.max*row.unitPrice.min-current.value)<.04)continue;
    // Never round an existing cents price up to a whole-euro glyph.
    if((c.quantity||1)===1&&current&&Math.abs(c.value-current.value)<.025)continue;
    const packageUnit=String(pk.raw||'').match(/(kg|g|ml|cl|dl|l)\b/i)?.[1]?.toLowerCase();
    if(packageUnit&&r.unit!==(['kg','g'].includes(packageUnit)?'kg':'l'))continue;
    const depositValues=[0];
    // Deposits must be printed in the own title column, never borrowed from
    // another beverage's flattened reading-order text.
    for(const start of boxes.filter(b=>/^Sis\.?$/.test(b.text)&&Math.abs(b.left-anchor.left)<.18&&
      b.top>=anchor.top-.08&&b.top<anchor.top+.04)){
     const line=boxes.filter(b=>Math.abs(b.top-start.top)<.001&&b.left>=start.left&&b.left<start.left+.13)
       .filter(b=>!/^\d+$/.test(b.text)||!boxes.some(d=>d!==b&&d.width>b.width+.001&&
         Math.abs(d.top-b.top)<.001&&d.left<=b.left+.001&&d.left+d.width>=b.left+b.width-.001))
       .sort((a,b)=>a.left-b.left).map(b=>b.text).join(' ')
       .replace(/(\d+)\s+(\d{2})/g,'$1,$2');
     const m=line.match(/Sis\.?\s+pantit\s+(\d+[,.]\d{2})/i);if(m)depositValues.push(Number(m[1].replace(',','.')));
    }
    for(const deposit of [...new Set(depositValues)]){
     const a=pk.min*r.max*c.quantity+deposit,b=pk.max*r.min*c.quantity+deposit;
     if(Math.abs(a-c.value)<.04&&Math.abs(b-c.value)<.04)found.push({proof:{value:c.value,quantity:c.quantity===1?null:c.quantity,unit:c.unit},rate:r});
    }
   }
  }
  const verified=unique(found);
  if(verified.length===1){proof=verified[0].proof;rate=verified[0].rate;}
 }
 // Compare pant-free unit rates only when a uniquely printed total deposit
 // belongs to this title column and the transaction has a known pack count.
 const transaction=proof||current,depositProofs=[];
 for(const start of boxes.filter(b=>/^Sis\.?$/.test(b.text)&&Math.abs(b.left-anchor.left)<.18&&
   b.top>=anchor.top-.08&&b.top<anchor.top+.04)){
  const line=boxes.filter(b=>Math.abs(b.top-start.top)<.001&&b.left>=start.left&&b.left<start.left+.13)
   .filter(b=>!/^\d+$/.test(b.text)||!boxes.some(d=>d!==b&&d.width>b.width+.001&&Math.abs(d.top-b.top)<.001&&d.left<=b.left+.001&&d.left+d.width>=b.left+b.width-.001))
   .sort((a,b)=>a.left-b.left).map(b=>b.text).join(' ').replace(/(\d+)\s+(\d{2})/g,'$1,$2');
  const m=line.match(/Sis\.?\s+pantit\s+(\d+[,.]\d{2})/i);if(m)depositProofs.push(Number(m[1].replace(',','.')));
 }
 const deposits=[...new Set(depositProofs)];
 let correctedRate=null;
 if(transaction?.quantity>1&&pk?.min>0&&pk.min===pk.max&&deposits.length===1&&row.unitPrice?.min===row.unitPrice?.max){
  const derived=Math.round((transaction.value-deposits[0])/transaction.quantity/pk.min*100)/100;
  const difference=Math.abs(derived-row.unitPrice.min);
  if(derived>0&&difference>.025&&difference<.2){
   const unit=/kg|g\b/i.test(pk.raw)?'kg':'l';
   correctedRate={min:derived,max:derived,raw:'verified-transaction-excluding-deposit/'+unit};
  }
 }
 if(!proof)return correctedRate?{...row,unitPrice:correctedRate}:row;
 if(current&&Math.abs(current.value-proof.value)<.005&&(current.quantity||1)===(proof.quantity||1))return correctedRate?{...row,unitPrice:correctedRate}:row;
 return {...row,spatialResolved:{...proof,source:'printed-transaction-independent-proof',sanity:'pass',confidence:'high'},
  percentageOffer:null,...(correctedRate?{unitPrice:correctedRate}:rate?{unitPrice:{min:rate.min,max:rate.max,raw:'verified-printed/'+rate.unit}}:{}),
  debugReplacedUnprovenTransaction:current};
}
