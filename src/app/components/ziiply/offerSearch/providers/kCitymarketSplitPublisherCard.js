// Publisher-only recovery of split product headings and transaction prices.
// Do not infer missing words or borrow a neighboring card's printed price.
export function restoreSplitPublisherCard(row,rawBoxes){
 const title=String(row.title||''),m=title.match(/([A-ZÅÄÖ]{5,})-$/);
 if(!m)return row;
 const boxes=[...new Map((rawBoxes||[]).map(b=>[[b.text,b.left,b.top,b.width,b.height].join(':'),b])).values()];
 const base=boxes.filter(b=>b.text===m[1]+'-'&&b.height>.06);
 if(base.length!==1)return row;
 const {left:x,top:y}=base[0];
 const same=b=>Math.abs(b.top-y)<.002;
 const suf=boxes.filter(b=>same(b)&&/^[A-ZÅÄÖ]{1,3}$/.test(b.text)&&b.left>x+.038&&b.left<x+.09);
 if(suf.length!==1)return row;
 const pack=boxes.filter(b=>same(b)&&/^\d{2,4}$/.test(b.text)&&b.left>suf[0].left&&b.left<x+.115)
  .flatMap(n=>boxes.filter(u=>same(u)&&/^(g|kg|ml|l)$/i.test(u.text)&&
   u.left>n.left+n.width-.001&&u.left<n.left+n.width+.008)
   .map(u=>({n:Number(n.text),unit:String(u.text).toLowerCase()})));
 if(pack.length!==1||pack[0].n<=0)return row;
 const {n,unit}=pack[0],mass=['g','ml'].includes(unit)?n/1000:n,rateUnit=['g','kg'].includes(unit)?'kg':'l';
 const rateText=boxes.filter(b=>b.top>y+.007&&b.top<y+.022&&b.left>=x-.002&&b.left<x+.125&&b.height<.02)
  .sort((a,b)=>a.left-b.left).map(b=>b.text).join(' ');
 const rateMatch=rateText.match(new RegExp('\\((\\d{1,3})\\b.*?(\\d{2})\\/'+rateUnit+'\\)'));
 if(!rateMatch)return row;
 const rate=Number(rateMatch[1])+Number(rateMatch[2])/100,proofs=[];
 const euros=boxes.filter(b=>/^\d{1,2}$/.test(b.text)&&b.height>=.075&&b.height<.2&&
  Math.abs(b.left-x)<.008&&b.top>=y&&b.top<y+.035);
 for(const e of euros)for(const q of boxes.filter(b=>/^[2-9]$/.test(b.text)&&b.height>.019&&b.height<.05&&
   b.left>x+.055&&b.left<x+.12&&b.top>e.top+.015&&b.top<e.top+.07)){
  const unitLabels=boxes.filter(b=>/^(RS|PS|PKT|KPL|TLK|PL|PRK)$/i.test(b.text)&&
   Math.abs(b.left-q.left)<.012&&b.top>q.top+.008&&b.top<q.top+.038&&b.height<.02);
  if(unitLabels.length!==1||Math.abs(rate*mass*Number(q.text)-Number(e.text))>.045)continue;
  proofs.push({value:Number(e.text),quantity:Number(q.text),unit:unitLabels[0].text.toUpperCase()});
 }
 const unique=[...new Map(proofs.map(p=>[[p.value,p.quantity,p.unit].join(':'),p])).values()];
 if(unique.length!==1)return row;
 const heading=boxes.filter(b=>b.top>=y-.014&&b.top<y-.008&&b.left>=x-.003&&b.left<x+.115&&
  /^[A-ZÅÄÖ][A-ZÅÄÖ-]{2,}$/.test(b.text)).sort((a,b)=>a.left-b.left).map(b=>b.text);
 const word=m[1]+suf[0].text;
 const full=(heading.length&&heading.at(-1).endsWith('-')
   ?heading.slice(0,-1).concat(heading.at(-1).slice(0,-1)+word).join(' ')
   :title.slice(0,-m[0].length)+word)+' '+n+' '+unit;
 return {...row,title:full,package:{min:mass,max:mass,raw:n+' '+unit},
  unitPrice:{min:rate,max:rate,raw:'('+rate.toFixed(2).replace('.',',')+'/'+rateUnit+')'},
  spatialResolved:{...unique[0],source:'publisher-owned-split-card-price-and-count',sanity:'pass',confidence:'high'},
  percentageOffer:null,debugRecoveredPublisherTitle:{from:title,to:full},
  debugReplacedConflictingPrice:row.spatialResolved};
}
