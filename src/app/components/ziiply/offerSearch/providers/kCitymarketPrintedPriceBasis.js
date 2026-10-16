// Price-only reconciliation: printed transaction labels and typography outrank
// a calculated per-item equivalent. Product groups and ordering are untouched.
const number = text => Number(String(text).replace(',', '.'));
const unique = values => [...new Map(values.map(p => [JSON.stringify([p.value,p.quantity,p.unit]),p])).values()];
export function ownedRate(row, boxes, anchor) {
 const lines=boxes.filter(b=>Math.abs(b.left-anchor.left)<.015&&b.top>=anchor.top-.002&&b.top-anchor.top<.085&&/^\(\d/.test(b.text));
 for(const start of lines){
  const line=boxes.filter(b=>Math.abs(b.top-start.top)<.001&&b.left>=start.left&&b.left<start.left+.2).sort((a,b)=>a.left-b.left);
  let text='',right=start.left;
  for(const b of line){if(b.left-right>.012)break;text+=' '+b.text;right=b.left+b.width;if(/\/(kg|l)\)/i.test(b.text))break;}
  text=text.replace(/(\d+)\s+(\d{2})(?=[–-]|\/(?:kg|l))/gi,'$1,$2');
  const m=text.match(/^\s*\((\d+(?:[,.]\d+)?)(?:[–-](\d+(?:[,.]\d+)?))?\/(kg|l)\)/i);
  if(m)return {min:number(m[1]),max:number(m[2]||m[1])};
 }
 return row.unitPrice;
}
function printedSet(row, boxes) {
 const a=row.debugAnchor||row.debugCardAnchor;if(!a)return null;
 const proofs=[];
 for(const e of boxes.filter(b=>/^\d{1,2}$/.test(b.text)&&b.height>=.075&&b.height<.12&&b.left>a.left+.10&&b.left<a.left+.4&&Math.abs(b.top-a.top)<.08)){
  const labels=boxes.filter(b=>/^YHTEIS-?$/.test(b.text)&&b.height<.03&&Math.abs(b.left-e.left)<.08&&Math.abs(b.top-e.top)<.025);
  const set=boxes.find(b=>b.text==='SETTI'&&b.left>=e.left&&b.left<e.left+.16&&b.top>e.top&&b.top-e.top<.065);
  const cents=boxes.filter(b=>/^\d{2}$/.test(b.text)&&b.height>=.03&&b.height<e.height*.6&&Math.abs(b.left-e.left-e.width)<.008&&b.top>e.top&&b.top-e.top<.025);
  if(labels.length===1&&set&&cents.length===1)proofs.push({value:number(e.text)+number(cents[0].text)/100,quantity:1,unit:'setti',source:'owned-printed-mixed-set-total',sanity:'pass',confidence:'high'});
 }
 const p=unique(proofs);return p.length===1?p[0]:null;
}
function printedDepositPack(row, boxes) {
 const m=String(row.title).match(/\b(\d{1,2})-pack\b/i),pk=row.package,rate=row.unitPrice;
 const anchor=row.debugCardAnchor||row.debugAnchor;
 if(!m||!pk||!rate||pk.min!==pk.max||rate.min!==rate.max)return null;
 const count=number(m[1]);
 const labels=boxes.filter(b=>new RegExp('^'+count+'-pack$','i').test(b.text)&&b.height>=.012&&b.height<.022&&Math.abs(b.top-anchor.top)<.04&&Math.abs(b.left-anchor.left)<.2).sort((a,b)=>a.left-b.left);
 if(!labels.length)return null;const label=labels[0];
 const starts=boxes.filter(b=>b.text==='Sis'&&b.left<=label.left&&label.left-b.left<.12&&b.top>label.top&&b.top-label.top<.05);
 const proofs=[];
 for(const start of starts){
  const line=boxes.filter(b=>Math.abs(b.top-start.top)<.001&&b.left>=start.left&&b.left<start.left+.2).sort((a,b)=>a.left-b.left);
  const text=line.map(b=>b.text).join(' '),d=text.match(/^Sis\.?\s+pantit\s+(\d+)\s+(\d{2})\b/);if(!d)continue;
  const deposit=number(d[1]+'.'+d[2]);
  for(const e of boxes.filter(b=>/^\d{3,4}$/.test(b.text)&&b.height>=.045&&b.height<.075&&b.left>label.left&&b.left-label.left<.45&&Math.abs(b.top-label.top)<.04)){
   const value=number(e.text)/100,expected=pk.min*count*rate.min+deposit;
   if(Math.abs(value-expected)<=.04)proofs.push({value,quantity:1,unit:'pkt',packageCount:count,depositTotal:deposit,source:'owned-printed-pack-total-including-deposit',sanity:'pass',confidence:'high'});
  }
 }
 const p=unique(proofs);return p.length===1?p[0]:null;
}
export function resolvePrintedPriceBasis(row, pageBoxes) {
 const anchor=row.debugCardAnchor||row.debugAnchor;
 if(!anchor||(!row.spatialResolved&&!row.percentageOffer))return null;
 const joined=[...pageBoxes];
 for(const b of pageBoxes){
  const m=b.text.match(/^(\d{1,2})(K|P|R|T)[A-Z]*$/);if(!m||b.height>=.022)continue;
  const next=pageBoxes.find(c=>c!==b&&c.left>=b.left+b.width-.003&&c.left-b.left-b.width<.006&&Math.abs(c.top-b.top)<.002&&/^[-–]?[A-Z]+[-–]?$/.test(c.text));
  if(next){const label=(b.text.replace(/^\d+/,"")+next.text).replace(/[-–]/g,"");if(/^(KPL|PRK|PKT|PS|RS|TLK|PL)$/.test(label)){
   const width=b.width*m[1].length/b.text.length;
   joined.push({...b,text:m[1],width},{...b,text:label,left:b.left+width,width:b.width-width+next.width});
  }}
 }
 const boxes=[...new Map(joined.map(b=>[`${b.text}:${b.left}:${b.top}:${b.width}:${b.height}`,b])).values()];
 const clean=boxes.filter(b=>!boxes.some(c=>c!==b&&c.width>b.width+.001&&Math.abs(c.top-b.top)<.001&&Math.abs(c.height-b.height)<.002&&c.left<=b.left+.001&&c.left+c.width>=b.left+b.width-.001));
 const set=printedSet(row,clean);if(set)return set;
 const pack=printedDepositPack(row,clean);if(pack)return pack;
 const rate=ownedRate(row,clean,anchor),pk=row.package,proofs=[];
 if(row.spatialResolved?.source==='final-card-explicit-multibuy'&&row.spatialResolved.quantity>1){
  const candidates=clean.filter(e=>/^\d{1,2}$/.test(e.text)&&e.height>=.045&&e.height<.075&&e.left>anchor.left+.10&&e.left<anchor.left+.28&&Math.abs(e.top-anchor.top)<.035);
  for(const e of candidates){
   const cents=clean.filter(b=>/^\d{2}$/.test(b.text)&&b.height>=.02&&b.height<.035&&Math.abs(b.left-e.left-e.width)<.008&&Math.abs(b.top-e.top)<.015);
   const count=clean.some(b=>/^\d+(?:KPL|PKT|PS|RS|PRK|TLK|PL)?$/.test(b.text)&&b.height>=.012&&b.height<.022&&Math.abs(b.left-e.left)<.035&&b.top<e.top&&e.top-b.top<.04);
   if(cents.length===1&&!count&&Math.abs(number(e.text)+number(cents[0].text)/100-row.spatialResolved.value)<.005)
    return {value:row.spatialResolved.value,quantity:1,unit:'kpl',source:'owned-printed-single-cents-without-purchase-count',sanity:'pass',confidence:'high'};
  }
 }
 if(!pk||!rate)return null;
 const min=pk.min*rate.min,max=pk.max*rate.max;
 // Extract the printed purchase count directly above its own price. Font size
 // excludes regular prices and the digits inside the package-size description.
 for(const count of boxes.filter(b=>/^[2-9]$|^1[0-2]$/.test(b.text)&&b.height>=.012&&b.height<.022&&
  b.left>anchor.left+.10&&b.left<anchor.left+.58&&Math.abs(b.top-anchor.top)<.075)){
  const fragments=boxes.filter(b=>Math.abs(b.top-count.top)<.002&&b.left>=count.left+count.width-.001&&b.left-count.left<.06)
   .sort((a,b)=>a.left-b.left);
  let label='',right=count.left+count.width;
  for(const b of fragments){if(b.left-right>.006)break;label+=b.text;right=b.left+b.width;if(/^(KPL|PRK|PKT|PS|RS|TLK|PL)/.test(label))break;}
  const unit=label.match(/^(KPL|PRK|PKT|PS|RS|TLK|PL)/)?.[1];if(!unit)continue;
  for(const glyph of boxes.filter(b=>/^-?\d{1,4}$/.test(b.text)&&b.height>=.04&&b.height<.075&&
   b.top>=count.top-.005&&b.top-count.top<.025)){
   let left=glyph.left,width=glyph.width;
   // PDF text can merge distant prices into one wide box. A trailing digit
   // belongs at the right edge; a leading digit belongs at the left edge.
   if(width>.10){width=.55*glyph.height*glyph.text.replace('-','').length;if(glyph.text.startsWith('-'))left=glyph.left+glyph.width-width;}
   if(Math.abs(left-count.left)>.025)continue;
   const cents=[...new Set(boxes.filter(b=>/^\d{2}$/.test(b.text)&&b.height>=.02&&b.height<glyph.height*.8&&
    Math.abs(b.left-left-width)<.012&&Math.abs(b.top-glyph.top)<.015).map(b=>number(b.text)))];
   if(cents.length>1)continue;
   const digits=glyph.text.replace('-','');
   const value=digits.length>=3?number(digits)/100:number(digits)+(cents[0]||0)/100,q=number(count.text),single=value/q;
   if(single<min-.025||single>max+.025)continue;
   if(digits.length<3&&!cents.length&&Math.abs(pk.min*rate.max-pk.max*rate.min)>.04&&!boxes.some(b=>/[-–]/.test(b.text)&&b.height>=.04&&Math.abs(b.top-glyph.top)<.02&&b.left>=left&&b.left<left+.08))continue;
   proofs.push({value,quantity:q,unit,source:'owned-printed-purchase-count-and-total',sanity:'pass',confidence:'high'});
  }
 }
 // Compact count/unit glyph, e.g. 3PKT-, still requires a matching large total.
 for(const label of boxes.filter(b=>/^\d{1,2}(KPL|PRK|PKT|PS|RS|TLK|PL)[-–]?$/.test(b.text)&&b.height>=.012&&b.height<.07)){
  const m=label.text.match(/^(\d+)([A-Z]+)/),q=number(m[1]);if(q<2||q>12)continue;
  for(const e of boxes.filter(b=>/^\d{1,2}$/.test(b.text)&&b.height>=.04&&b.height<.075&&
   Math.abs(b.left-label.left)<.02&&b.top>=label.top-.005&&b.top-label.top<.025&&b.left>anchor.left+.10&&b.left<anchor.left+.58&&Math.abs(b.top-anchor.top)<.075)){
   const value=number(e.text),single=value/q;
   if(single>=min-.025&&single<=max+.025&&/-/.test(label.text))proofs.push({value,quantity:q,unit:m[2],source:'owned-compact-purchase-count-and-total',sanity:'pass',confidence:'high'});
  }
 }
 // A large euro and a small overprinted count may share one narrow PDF box.
 for(const glyph of boxes.filter(b=>/^[1-9][2-9]$/.test(b.text)&&b.height>=.045&&b.height<.07&&b.width<b.height*.5&&b.left>anchor.left+.10&&b.left<anchor.left+.58&&Math.abs(b.top-anchor.top)<.075)){
  const labels=clean.filter(b=>/^[A-Z]+$/.test(b.text)&&b.left>=glyph.left+glyph.width-.001&&b.left<glyph.left+glyph.width+.04&&Math.abs(b.top-glyph.top)<.002).sort((a,b)=>a.left-b.left);
  const unit=labels.map(b=>b.text).join('');if(!/^(KPL|PRK|PKT|PS|RS|TLK|PL)$/.test(unit))continue;
  const cents=clean.filter(b=>/^\d{2}$/.test(b.text)&&b.height>=.02&&b.height<.035&&Math.abs(b.left-glyph.left-glyph.width)<.012&&b.top>glyph.top&&b.top-glyph.top<.02);
  if(cents.length!==1)continue;
  const q=number(glyph.text[1]),value=number(glyph.text[0])+number(cents[0].text)/100;
  const a=pk.min*rate.max,b=pk.max*rate.min;
  if(Math.abs(a-b)<.04&&Math.abs(value/q-(a+b)/2)<.02)proofs.push({value,quantity:q,unit,source:'owned-overprinted-euro-and-purchase-count',sanity:'pass',confidence:'high'});
 }
 const result=unique(proofs);return result.length===1?result[0]:null;
}
