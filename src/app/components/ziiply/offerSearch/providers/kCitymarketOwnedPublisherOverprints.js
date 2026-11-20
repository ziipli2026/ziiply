// Publisher typography can contain a sale-price glyph, an overprinted discount,
// and the packet count in overlapping PDF text boxes. Never borrow a price from
// another card or turn a unit-rate calculation into the displayed transaction.
export function verifiedOwnedPublisherOverprint(row) {
  const anchor=row.debugCardAnchor||row.debugAnchor;
  const card=row.debugCardPrice;
  // In frozen publisher OCR replays the price has a complete page-local
  // glyph anchor even when the parser cannot recover an offer title anchor.
  // Accept that fallback only for a high-confidence same-card full price;
  // reject loose, unit-less or low-score fragments.
  const reliableCardOnly=!anchor&&
    row.spatialResolved?.source==='printed-unitrate-quantity-reconciled'&&
    card?.unit&&Number(card.score)<=.025&&
    Array.isArray(card.parts)&&card.parts.length===2&&
    card.anchor;
  const ownAnchor=anchor||(reliableCardOnly?card.anchor:null);
  if(!ownAnchor)return null;
  const title=String(row.title||'');
  const nearby=row.nearby||[];
  const boxes=row.debugNearbyBoxes||[];

  // A unit-rate estimate is weaker than a complete printed price beside
  // the heading. Require the original glyphs and the sale label to align.
  if(row.spatialResolved?.source==='same-card-box-unitrate-derived' &&
     anchor && card?.quantity==null && card?.parts?.length===2 &&
     /^(KPL|PKT|PRK|PS|RS|PL|TLK)$/.test(card.unit || '')){
    const [euro,cents]=card.parts;
    const headingRight=anchor.right ?? anchor.left+(anchor.width||0);
    const centsBottom=cents.top+cents.height;
    const ownUnit=boxes.some(box=>box.text===card.unit &&
      box.left>=cents.left && box.left<=cents.left+cents.width &&
      Math.abs(box.top-centsBottom)<.009);
    if(/^\d{1,2}$/.test(euro.text) && /^\d{2}$/.test(cents.text) &&
       euro.height>=.09 && cents.height>=.04 && cents.height<euro.height*.7 &&
       euro.left>=headingRight-.003 && euro.left-headingRight<.035 &&
       euro.top<=anchor.top && anchor.top-euro.top<.05 &&
       Math.abs(euro.left+euro.width-cents.left)<.007 &&
       cents.top>euro.top && cents.top-euro.top<.03 && ownUnit &&
       Math.abs(card.value-Number(euro.text)-Number(cents.text)/100)<.005){
      return {value:card.value,quantity:null,unit:card.unit,
        source:'owned-printed-split-euro-cents',sanity:'pass',confidence:'high'};
    }
  }

  // 3x6-PACK describes three six-packs, not a 0.72-euro individual drink.
  // Require the publisher's own large total, the matching 3x6 label and
  // the same printed total in the surrounding text before accepting it.
  const pack=title.match(/\b(\d{1,2})[- ]pack\b/i);
  if(pack&&card?.anchor&&Number(card.value)>0&&
    Math.abs(card.anchor.left-anchor.left)<.09&&
    Math.abs(card.anchor.top-anchor.top)<.15) {
    const totals=nearby.some(t=>new RegExp('(?:^|\\s)'+Number(card.value)+'\\s*\\.\\s*[-–]').test(String(t)));
    const counts=nearby.flatMap(t=>[...String(t).matchAll(/\b(\d{1,2})\s*[x×]\s*(\d{1,2})\b/gi)]);
    const valid=[...new Set(counts.filter(m=>Number(m[2])===Number(pack[1])).map(m=>Number(m[1])))];
    if(totals&&valid.length===1&&valid[0]>=2&&valid[0]<=12)
      return {value:Number(card.value),quantity:valid[0],unit:pack[1]+'-pack',
        source:'owned-printed-pack-multibuy-total',sanity:'pass',confidence:'high'};
  }

  // Complete same-card large euro + cents + sale unit overrides a guessed
  // large-cents price reconstructed from the *normal* kg/l rate.
  const single=Number(row.initialExpectedSingle??row.expectedSingle);
  if(row.spatialResolved?.source==='large-cents-expected-visual'&&
    card?.unit&&Array.isArray(card.parts)&&card.parts.length===2&&
    Number(card.value)>0&&Number.isFinite(single)&&single>0&&
    Number(card.value)<single-.20&&card.anchor&&
    Math.abs(card.anchor.left-anchor.left)<.045) {
    const [e,c]=card.parts;
    if(/^\d+$/.test(String(e.text))&&/^\d{2}$/.test(String(c.text))&&
      Math.abs(Number(card.value)-Number(e.text)-Number(c.text)/100)<.005)
      return {value:Number(Number(card.value).toFixed(2)),quantity:null,
        unit:card.unit,source:'owned-printed-split-euro-cents',sanity:'pass',confidence:'high'};
  }

  // Publisher's intact large-font sale price wins over an inferred unit-rate
  // reconciliation, but only if its euro and cents glyphs form one verified
  // same-card pair with an explicit sale unit and a tight publisher score.
  // Never use a distant price or an arithmetic-only candidate.
  if(row.spatialResolved?.source==='printed-unitrate-quantity-reconciled'&&
    card?.unit&&Number(card.score)<=.025&&Number(card.value)>0&&
    Array.isArray(card.parts)&&card.parts.length===2&&card.anchor&&
    (Math.abs(Number(card.anchor.left)-Number(ownAnchor.left))<.065&&
     Math.abs(Number(card.anchor.top)-Number(ownAnchor.top))<.15 ||
     // A complete, tightly scored euro+cents+unit card is independent
     // printed evidence when a distant title anchor was reconstructed.
     // Only permit this for a unit-rate-derived price, never a competing
     // publisher-owned price or an unverified arithmetic candidate.
     (row.spatialResolved?.source==='printed-unitrate-quantity-reconciled'&&
      Number(card.score)<=.018&&card.anchor.height>=.08))){
    const [e,c]=card.parts;
    const digits=/^\d{1,2}$/;
    if(digits.test(String(e.text))&&/^\d{2}$/.test(String(c.text))&&
      Number(e.height)>=.08&&Number(c.height)>=.035&&
      Number(c.height)<Number(e.height)&&
      Math.abs(Number(card.value)-Number(e.text)-Number(c.text)/100)<.005&&
      Math.abs(Number(card.value)-Number(row.spatialResolved.value))>.011){
      return {value:Number(Number(card.value).toFixed(2)),quantity:null,
        unit:card.unit,source:'owned-printed-card-before-unitrate-reconciliation',
        sanity:'pass',confidence:'high'};
    }
  }

  // A whole-euro glyph may be fused with a discount badge, e.g. "6-30%".
  // Require geometrically overlapping cents and an independently printed
  // price per roll to reject accidental concatenations such as 9 + 24 rolls.
  const rollCount=title.match(/\b(\d+)\s*rl\b/i);
  const rollRate=nearby.join(' ').match(/(\d+)[,.](\d{2})\s*\/rl\b/i);
  if(rollCount&&rollRate) {
    const count=Number(rollCount[1]);
    const expected=count*Number(rollRate[1]+'.'+rollRate[2]);
    const values=[];
    for(const euro of boxes) {
      const m=String(euro.text||'').match(/^([1-9])-\d{1,2}%$/);
      if(!m||euro.height<.08||Math.abs(euro.left-anchor.left)>.26||
        Math.abs(euro.top-anchor.top)>.095)continue;
      for(const cents of boxes) {
        if(!/^\d{2}$/.test(String(cents.text||''))||
          cents.height<.025||cents.height>euro.height*.75||
          cents.left<euro.left+euro.width*.25||cents.left>euro.left+euro.width||
          cents.top<euro.top||cents.top>euro.top+euro.height*.75)continue;
        const price=Number(m[1])+Number(cents.text)/100;
        // The advertised rounded per-roll rate has up to half a cent
        // of rounding error per roll; it cannot define an exact sale price.
        if(Math.abs(price-expected)<count*.005+.015)values.push(price);
      }
    }
    const unique=[...new Set(values.map(v=>v.toFixed(2)))];
    if(unique.length===1&&unique[0])
      return {value:Number(unique[0]),quantity:null,unit:'PKT',
        source:'owned-overprinted-euro-cents-and-rounded-roll-rate',sanity:'pass',confidence:'high'};
  }
  return null;
}

// Some publisher boxes combine the first heading word with a large euro
// glyph. Require the independent euro box at the same origin before using it.
export function recoverOverprintedHeadingPrice(row, boxes) {
  if(row.spatialResolved?.source!=='fixed-package-own-unitrate-derived')return row;
  const firstWord=row.title.match(/^(\p{Lu}+)(\d)(\p{Lu}{2,})(?=\s|$)/u);
  if(!firstWord)return row;
  const [,prefix,whole,suffix]=firstWord;
  const prices=new Map();
  for(const heading of boxes.filter(box=>box.text===firstWord[0] && box.height>=.09)){
    const euro=boxes.find(box=>box.text===whole &&
      Math.abs(box.left-heading.left)<.002 &&
      Math.abs(box.top-heading.top)<.002 &&
      Math.abs(box.height-heading.height)<.002);
    if(!euro)continue;
    for(const cents of boxes.filter(box=>/^\d{2}$/.test(box.text) &&
      box.left-euro.left>.035 && box.left-euro.left<.085 &&
      box.top-euro.top>.01 && box.top-euro.top<.027 &&
      box.height>=.045 && box.height<euro.height*.7)){
      const unit=row.spatialResolved.unit;
      if(!/^(KPL|PKT|PRK|PS|RS|PL|TLK)$/.test(unit || ''))continue;
      const hasUnit=boxes.some(box=>box.text===unit && box.left>=cents.left &&
        box.left<=cents.left+cents.width && Math.abs(box.top-cents.top-cents.height)<.01);
      if(!hasUnit)continue;
      const value=Number(whole+'.'+cents.text);
      prices.set([euro.left,euro.top,value].join(':'),{value,unit});
    }
  }
  if(prices.size!==1)return row;
  const price=prices.values().next().value;
  return {...row,title:prefix+suffix+row.title.slice(firstWord[0].length),
    debugReplacedConflictingPrice:row.spatialResolved,
    spatialResolved:{...price,quantity:null,source:'owned-printed-overlaid-heading-price',sanity:'pass',confidence:'high'}};
}
